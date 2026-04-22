import {
  NotificationType,
  PaymentAuditAction,
  PaymentAuditActor,
  PaymentStatus,
  Prisma,
  ReviewSource,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { sendPaymentToTelegram, isTelegramConfigured } from "@/lib/telegram";
import { getReceiptAccessUrl, uploadReceiptFile } from "@/lib/storage";

type OrderFlowErrorCode =
  | "INVALID_PLAN"
  | "OUT_OF_STOCK"
  | "INVALID_ORDER"
  | "PAYMENT_REQUIRED"
  | "PAYMENT_ALREADY_REVIEWED"
  | "ORDER_ALREADY_FULFILLED";

export class OrderFlowError extends Error {
  code: OrderFlowErrorCode;

  constructor(code: OrderFlowErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_RETRIES = 3;
const REVIEW_PAYMENT_TRANSACTION_TIMEOUT_MS = 15_000;
const REVIEW_PAYMENT_TRANSACTION_MAX_WAIT_MS = 10_000;

function decimalMin(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lte(b) ? a : b;
}

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function parseSubmittedAmount(value: string) {
  const normalized = normalizeDigits(value).replace(/[,\s]/g, "");

  if (!/^\d+$/.test(normalized)) {
    throw new Error("مبلغ پرداختی معتبر نیست.");
  }

  return new Prisma.Decimal(normalized);
}

function calculateExpiryDate(from: Date, durationDays: number) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

async function createNotification(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    orderId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
  },
) {
  await tx.notification.create({
    data: {
      userId: params.userId,
      orderId: params.orderId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
    },
  });
}

async function createPaymentAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    paymentId: string;
    action: PaymentAuditAction;
    actorType: PaymentAuditActor;
    actorId?: string | null;
    message: string;
    metadata?: Prisma.JsonObject;
  },
) {
  await tx.paymentAuditLog.create({
    data: {
      paymentId: params.paymentId,
      action: params.action,
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      message: params.message,
      metadata: params.metadata,
    },
  });
}

async function awardReferralRewardForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const attribution = await tx.referralAttribution.findFirst({
    where: {
      firstOrderId: orderId,
      status: "PENDING",
    },
    include: {
      referralCode: {
        include: {
          campaign: true,
        },
      },
    },
  });

  if (!attribution) {
    return;
  }

  const ownerUserId = attribution.referralCode.ownerUserId;
  if (!ownerUserId) {
    await tx.referralAttribution.update({
      where: { id: attribution.id },
      data: { status: "REJECTED" },
    });
    return;
  }

  if (ownerUserId === attribution.referredUserId) {
    await tx.referralAttribution.update({
      where: { id: attribution.id },
      data: { status: "REJECTED" },
    });
    return;
  }

  const campaign = attribution.referralCode.campaign;
  const now = new Date();
  const activeInTime =
    campaign.isActive &&
    (!campaign.startsAt || campaign.startsAt <= now) &&
    (!campaign.endsAt || campaign.endsAt >= now);

  if (!activeInTime) {
    return;
  }

  const wallet = await tx.wallet.upsert({
    where: { userId: ownerUserId },
    create: { userId: ownerUserId },
    update: {},
  });

  if (typeof campaign.maxRewardsTotal === "number") {
    const rewardedTotal = await tx.referralAttribution.count({
      where: {
        referralCode: { campaignId: campaign.id },
        status: "REWARDED",
      },
    });
    if (rewardedTotal >= campaign.maxRewardsTotal) {
      return;
    }
  }

  if (typeof campaign.maxRewardsPerReferrer === "number") {
    const rewardedByOwner = await tx.referralAttribution.count({
      where: {
        referralCode: { campaignId: campaign.id, ownerUserId },
        status: "REWARDED",
      },
    });
    if (rewardedByOwner >= campaign.maxRewardsPerReferrer) {
      return;
    }
  }

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: campaign.rewardValue } },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "CREDIT",
      amount: campaign.rewardValue,
      reason: "پاداش معرفی (Referral)",
      refType: "REFERRAL_ATTRIBUTION",
      refId: attribution.id,
    },
  });

  await tx.referralAttribution.update({
    where: { id: attribution.id },
    data: { status: "REWARDED", rewardedAt: new Date() },
  });
}

export async function repricePendingOrder(params: {
  orderId: string;
  userId: string;
  couponCode?: string | null;
  giftCardCode?: string | null;
  useWallet?: boolean | null;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: params.orderId,
        userId: params.userId,
      },
      select: {
        id: true,
        status: true,
        planId: true,
        subtotalAmount: true,
        amount: true,
        payment: { select: { id: true } },
      },
    });

    if (!order) {
      throw new OrderFlowError("INVALID_ORDER", "سفارش موردنظر پیدا نشد.");
    }

    if (order.status !== "PENDING_PAYMENT") {
      throw new Error("برای این سفارش امکان تغییر مبلغ وجود ندارد.");
    }

    if (order.payment) {
      throw new Error("برای این سفارش پرداخت/رسید ثبت شده است.");
    }

    const couponCode = (params.couponCode ?? "").trim().toUpperCase();
    const giftCardCode = (params.giftCardCode ?? "").trim().toUpperCase();
    const useWallet = Boolean(params.useWallet);

    if (couponCode && (giftCardCode || useWallet)) {
      throw new Error("برای هر سفارش فقط یکی از کوپن یا اعتبار قابل استفاده است.");
    }

    const now = new Date();
    const subtotalAmount = order.subtotalAmount;

    let discountAmount = new Prisma.Decimal(0);
    let walletAppliedAmount = new Prisma.Decimal(0);
    let giftCardAppliedAmount = new Prisma.Decimal(0);
    let couponId: string | null = null;
    let giftCardId: string | null = null;

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: couponCode },
        include: { allowedPlans: { select: { planId: true } } },
      });

      if (!coupon || !coupon.isActive) {
        throw new Error("کد تخفیف معتبر نیست.");
      }

      if (coupon.startsAt && coupon.startsAt > now) {
        throw new Error("کد تخفیف هنوز فعال نشده است.");
      }

      if (coupon.endsAt && coupon.endsAt < now) {
        throw new Error("کد تخفیف منقضی شده است.");
      }

      if (coupon.minOrderAmount && subtotalAmount.lt(coupon.minOrderAmount)) {
        throw new Error("حداقل مبلغ برای استفاده از کد تخفیف رعایت نشده است.");
      }

      if (coupon.allowedPlans.length > 0 && !coupon.allowedPlans.some((row) => row.planId === order.planId)) {
        throw new Error("این کد تخفیف برای پلن انتخاب‌شده قابل استفاده نیست.");
      }

      if (typeof coupon.usageLimitTotal === "number") {
        const used = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
        if (used >= coupon.usageLimitTotal) {
          throw new Error("سقف استفاده از این کد تخفیف پر شده است.");
        }
      }

      if (typeof coupon.usageLimitPerUser === "number") {
        const usedByUser = await tx.couponRedemption.count({
          where: { couponId: coupon.id, userId: params.userId },
        });
        if (usedByUser >= coupon.usageLimitPerUser) {
          throw new Error("سقف استفاده شما از این کد تخفیف پر شده است.");
        }
      }

      if (coupon.kind === "PERCENT") {
        const percent = Number(coupon.value);
        if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
          throw new Error("تنظیمات کد تخفیف معتبر نیست.");
        }
        discountAmount = subtotalAmount.mul(new Prisma.Decimal(percent)).div(new Prisma.Decimal(100)).floor();
      } else {
        discountAmount = coupon.value;
      }

      if (coupon.maxDiscountAmount && discountAmount.gt(coupon.maxDiscountAmount)) {
        discountAmount = coupon.maxDiscountAmount;
      }

      if (discountAmount.gt(subtotalAmount)) {
        discountAmount = subtotalAmount;
      }

      couponId = coupon.id;
    } else if (giftCardCode) {
      const giftCard = await tx.giftCard.findUnique({ where: { code: giftCardCode } });
      if (!giftCard || giftCard.status !== "ACTIVE") {
        throw new Error("بن خرید معتبر نیست.");
      }
      if (giftCard.startsAt && giftCard.startsAt > now) {
        throw new Error("بن خرید هنوز فعال نشده است.");
      }
      if (giftCard.endsAt && giftCard.endsAt < now) {
        throw new Error("بن خرید منقضی شده است.");
      }
      if (giftCard.balance.lte(0)) {
        throw new Error("اعتبار بن خرید کافی نیست.");
      }

      giftCardAppliedAmount = decimalMin(giftCard.balance, subtotalAmount);
      giftCardId = giftCard.id;
    } else if (useWallet) {
      const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
      if (wallet && wallet.balance.gt(0)) {
        walletAppliedAmount = decimalMin(wallet.balance, subtotalAmount);
      }
    }

    const amount = subtotalAmount.sub(discountAmount).sub(walletAppliedAmount).sub(giftCardAppliedAmount);
    if (amount.lt(0)) {
      throw new Error("مبلغ نهایی سفارش معتبر نیست.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        couponId,
        giftCardId,
        discountAmount,
        walletAppliedAmount,
        giftCardAppliedAmount,
        amount,
      },
    });

    return { amount };
  });
}

export async function payOrderWithWallet(params: { orderId: string; userId: string }) {
  const WALLET_DISCOUNT_PERCENT = 20;

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: params.orderId,
          userId: params.userId,
        },
        include: {
          plan: true,
          payment: true,
        },
      });

      if (!order) {
        throw new OrderFlowError("INVALID_ORDER", "سفارش موردنظر پیدا نشد.");
      }

      if (order.status !== "PENDING_PAYMENT") {
        throw new Error("این سفارش در وضعیت قابل پرداخت با کیف‌پول نیست.");
      }

      if (order.payment) {
        throw new Error("برای این سفارش رسید/پرداخت ثبت شده است.");
      }

      // اگر کاربر قبلاً کوپن/بن/کیف‌پول را اعمال کرده باشد، در پرداخت ولتی
      // آن‌ها را به‌صورت خودکار کنار می‌گذاریم تا جریان پرداخت گیر نکند.

      // کیف‌پول اگر وجود نداشت همین‌جا ایجاد می‌شود (برای ترغیب و جلوگیری از خطای «فعال نیست»)
      const wallet = await tx.wallet.upsert({
        where: { userId: params.userId },
        create: { userId: params.userId },
        update: {},
      });

      const subtotal = order.subtotalAmount;
      const discount = subtotal
        .mul(new Prisma.Decimal(WALLET_DISCOUNT_PERCENT))
        .div(new Prisma.Decimal(100))
        .floor();
      const payableFromWallet = subtotal.sub(discount);

      if (payableFromWallet.lte(0)) {
        throw new Error("مبلغ سفارش معتبر نیست.");
      }

      const updatedWallet = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: { gte: payableFromWallet },
        },
        data: {
          balance: { decrement: payableFromWallet },
        },
      });

      if (updatedWallet.count !== 1) {
        throw new Error(`اعتبار کیف‌پول کافی نیست. موجودی فعلی: ${formatPrice(Number(wallet.balance))}`);
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          amount: payableFromWallet,
          reason: "پرداخت سفارش با کیف‌پول (۲۰٪ تخفیف)",
          refType: "ORDER_WALLET_PAY",
          refId: order.id,
        },
      });

      // Order is fully paid by wallet → amount becomes 0
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          couponId: null,
          giftCardId: null,
          discountAmount: discount,
          walletAppliedAmount: payableFromWallet,
          giftCardAppliedAmount: new Prisma.Decimal(0),
          amount: new Prisma.Decimal(0),
          status: "PAYMENT_SUBMITTED",
        },
        include: {
          plan: true,
          user: true,
          payment: true,
        },
      });

      // Fulfillment (same logic as approved payment)
      const account = await tx.account.findFirst({
        where: {
          planId: updatedOrder.planId,
          status: "available",
        },
        orderBy: { createdAt: "asc" },
      });

      if (!account) {
        const waitingOrder = await tx.order.update({
          where: { id: updatedOrder.id },
          data: { status: "WAITING_FOR_ACCOUNT" },
          include: { plan: true, user: true, account: true, payment: true },
        });

        await createNotification(tx, {
          userId: waitingOrder.userId,
          orderId: waitingOrder.id,
          type: "ACCOUNT_DELAYED",
          title: "در انتظار تخصیص اکانت",
          message: "پرداخت با کیف‌پول انجام شد اما فعلا موجودی آماده نداریم. به محض اضافه شدن اکانت، سفارش شما تحویل می‌شود.",
        });

        await awardReferralRewardForOrder(tx, waitingOrder.id);

        return { order: waitingOrder, config: null };
      }

      const accountUpdated = await tx.account.updateMany({
        where: { id: account.id, status: "available" },
        data: { status: "sold" },
      });

      if (accountUpdated.count !== 1) {
        throw new OrderFlowError("OUT_OF_STOCK", "اکانت انتخابی هم‌زمان فروخته شد.");
      }

      const fulfilledAt = new Date();
      const expiresAt = calculateExpiryDate(fulfilledAt, updatedOrder.plan.durationDays);

      const fulfilledOrder = await tx.order.update({
        where: { id: updatedOrder.id },
        data: {
          accountId: account.id,
          status: "FULFILLED",
          fulfilledAt,
          expiresAt,
        },
        include: { plan: true, user: true, account: true, payment: true },
      });

      await createNotification(tx, {
        userId: fulfilledOrder.userId,
        orderId: fulfilledOrder.id,
        type: "ACCOUNT_READY",
        title: "کانفیگ آماده دریافت است",
        message: `سفارش ${fulfilledOrder.plan.name} آماده شد و تا ${fulfilledOrder.expiresAt?.toLocaleDateString("fa-IR")} فعال است.`,
      });

      await awardReferralRewardForOrder(tx, fulfilledOrder.id);

      return { order: fulfilledOrder, config: account.config };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: REVIEW_PAYMENT_TRANSACTION_TIMEOUT_MS,
      maxWait: REVIEW_PAYMENT_TRANSACTION_MAX_WAIT_MS,
    },
  );
}

export async function createOrderForUser(params: {
  userId: string;
  planId: string;
  couponCode?: string | null;
  giftCardCode?: string | null;
  useWallet?: boolean | null;
}) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUnique({
      where: {
        id: params.planId,
      },
      select: {
        id: true,
        name: true,
        price: true,
        _count: {
          select: {
            accounts: {
              where: {
                status: "available",
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new OrderFlowError("INVALID_PLAN", "پلن انتخاب‌شده وجود ندارد.");
    }

    if (plan._count.accounts === 0) {
      throw new OrderFlowError("OUT_OF_STOCK", "موجودی این پلن تمام شده است.");
    }

    const subtotalAmount = plan.price;
    const couponCode = (params.couponCode ?? "").trim().toUpperCase();
    const giftCardCode = (params.giftCardCode ?? "").trim().toUpperCase();
    const useWallet = Boolean(params.useWallet);

    if (couponCode && (giftCardCode || useWallet)) {
      throw new Error("برای هر سفارش فقط یکی از کوپن یا اعتبار قابل استفاده است.");
    }

    const now = new Date();
    let discountAmount = new Prisma.Decimal(0);
    let walletAppliedAmount = new Prisma.Decimal(0);
    let giftCardAppliedAmount = new Prisma.Decimal(0);
    let couponId: string | null = null;
    let giftCardId: string | null = null;

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: couponCode },
        include: { allowedPlans: { select: { planId: true } } },
      });

      if (!coupon || !coupon.isActive) {
        throw new Error("کد تخفیف معتبر نیست.");
      }

      if (coupon.startsAt && coupon.startsAt > now) {
        throw new Error("کد تخفیف هنوز فعال نشده است.");
      }

      if (coupon.endsAt && coupon.endsAt < now) {
        throw new Error("کد تخفیف منقضی شده است.");
      }

      if (coupon.minOrderAmount && subtotalAmount.lt(coupon.minOrderAmount)) {
        throw new Error("حداقل مبلغ برای استفاده از کد تخفیف رعایت نشده است.");
      }

      if (coupon.allowedPlans.length > 0 && !coupon.allowedPlans.some((row) => row.planId === plan.id)) {
        throw new Error("این کد تخفیف برای پلن انتخاب‌شده قابل استفاده نیست.");
      }

      if (typeof coupon.usageLimitTotal === "number") {
        const used = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
        if (used >= coupon.usageLimitTotal) {
          throw new Error("سقف استفاده از این کد تخفیف پر شده است.");
        }
      }

      if (typeof coupon.usageLimitPerUser === "number") {
        const usedByUser = await tx.couponRedemption.count({
          where: { couponId: coupon.id, userId: params.userId },
        });
        if (usedByUser >= coupon.usageLimitPerUser) {
          throw new Error("سقف استفاده شما از این کد تخفیف پر شده است.");
        }
      }

      if (coupon.kind === "PERCENT") {
        const percent = Number(coupon.value);
        if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
          throw new Error("تنظیمات کد تخفیف معتبر نیست.");
        }
        discountAmount = subtotalAmount.mul(new Prisma.Decimal(percent)).div(new Prisma.Decimal(100)).floor();
      } else {
        discountAmount = coupon.value;
      }

      if (coupon.maxDiscountAmount && discountAmount.gt(coupon.maxDiscountAmount)) {
        discountAmount = coupon.maxDiscountAmount;
      }

      if (discountAmount.gt(subtotalAmount)) {
        discountAmount = subtotalAmount;
      }

      couponId = coupon.id;
    } else if (giftCardCode) {
      const giftCard = await tx.giftCard.findUnique({ where: { code: giftCardCode } });

      if (!giftCard || giftCard.status !== "ACTIVE") {
        throw new Error("بن خرید معتبر نیست.");
      }

      if (giftCard.startsAt && giftCard.startsAt > now) {
        throw new Error("بن خرید هنوز فعال نشده است.");
      }

      if (giftCard.endsAt && giftCard.endsAt < now) {
        throw new Error("بن خرید منقضی شده است.");
      }

      if (giftCard.balance.lte(0)) {
        throw new Error("اعتبار بن خرید کافی نیست.");
      }

      giftCardAppliedAmount = decimalMin(giftCard.balance, subtotalAmount);
      giftCardId = giftCard.id;
    } else if (useWallet) {
      const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
      if (wallet && wallet.balance.gt(0)) {
        walletAppliedAmount = decimalMin(wallet.balance, subtotalAmount);
      }
    }

    const amount = subtotalAmount.sub(discountAmount).sub(walletAppliedAmount).sub(giftCardAppliedAmount);
    if (amount.lt(0)) {
      throw new Error("مبلغ نهایی سفارش معتبر نیست.");
    }

    const order = await tx.order.create({
      data: {
        userId: params.userId,
        planId: params.planId,
        subtotalAmount,
        discountAmount,
        walletAppliedAmount,
        giftCardAppliedAmount,
        amount,
        couponId,
        giftCardId,
        status: "PENDING_PAYMENT",
      },
      select: {
        id: true,
      },
    });

    // نکته: مصرف واقعی بن/کیف‌پول هنگام ثبت رسید (submit) انجام می‌شود تا اعتبار در سفارش‌های رهاشده قفل نشود.

    const attribution = await tx.referralAttribution.findFirst({
      where: {
        referredUserId: params.userId,
        status: "PENDING",
        firstOrderId: null,
      },
      select: { id: true },
    });

    if (attribution) {
      await tx.referralAttribution.update({
        where: { id: attribution.id },
        data: { firstOrderId: order.id },
      });
    }

    return order;
  });
}

export async function submitPaymentReceipt(params: {
  orderId: string;
  userId: string;
  amount: string;
  trackingCode: string;
  cardLast4: string;
  receiptFile: File;
}) {
  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
      userId: params.userId,
    },
    include: {
      user: true,
      plan: true,
      payment: true,
    },
  });

  if (!order) {
    throw new OrderFlowError("INVALID_ORDER", "سفارش موردنظر پیدا نشد.");
  }

  if (order.status === "FULFILLED") {
    throw new OrderFlowError("ORDER_ALREADY_FULFILLED", "این سفارش قبلا تحویل داده شده است.");
  }

  if (order.status === "WAITING_FOR_ACCOUNT" || order.payment?.status === PaymentStatus.APPROVED) {
    throw new OrderFlowError(
      "PAYMENT_ALREADY_REVIEWED",
      "پرداخت این سفارش تایید شده و سفارش در انتظار تخصیص اکانت است.",
    );
  }

  if (!params.receiptFile || params.receiptFile.size === 0) {
    throw new Error("تصویر رسید الزامی است.");
  }

  const submittedAmount = parseSubmittedAmount(params.amount);

  if (!submittedAmount.equals(order.amount)) {
    throw new Error(`مبلغ رسید باید دقیقا ${formatPrice(Number(order.amount))} باشد.`);
  }

  if (order.amount.lte(0)) {
    throw new Error("این سفارش مبلغ پرداختی ندارد و نیازی به ثبت رسید نیست.");
  }

  const uploaded = await uploadReceiptFile({
    orderId: order.id,
    file: params.receiptFile,
    userId: order.userId,
  });

  const accessReceiptUrl = await getReceiptAccessUrl({
    receiptUrl: uploaded.url,
    receiptStoragePath: uploaded.storagePath,
    expiresInSeconds: 60 * 60,
  });

  const payment = await prisma.$transaction(async (tx) => {
    if (order.couponId) {
      const existing = await tx.couponRedemption.findUnique({ where: { orderId: order.id } });
      if (!existing) {
        const coupon = await tx.coupon.findUnique({
          where: { id: order.couponId },
          include: { allowedPlans: { select: { planId: true } } },
        });
        const now = new Date();

        if (!coupon || !coupon.isActive) {
          throw new Error("کوپن سفارش دیگر معتبر نیست.");
        }
        if (coupon.startsAt && coupon.startsAt > now) {
          throw new Error("کوپن سفارش هنوز فعال نشده است.");
        }
        if (coupon.endsAt && coupon.endsAt < now) {
          throw new Error("کوپن سفارش منقضی شده است.");
        }
        if (coupon.minOrderAmount && order.subtotalAmount.lt(coupon.minOrderAmount)) {
          throw new Error("حداقل مبلغ برای استفاده از کوپن رعایت نشده است.");
        }
        if (coupon.allowedPlans.length > 0 && !coupon.allowedPlans.some((row) => row.planId === order.planId)) {
          throw new Error("کوپن سفارش برای این پلن قابل استفاده نیست.");
        }
        if (typeof coupon.usageLimitTotal === "number") {
          const used = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
          if (used >= coupon.usageLimitTotal) {
            throw new Error("سقف استفاده از کوپن پر شده است.");
          }
        }
        if (typeof coupon.usageLimitPerUser === "number") {
          const usedByUser = await tx.couponRedemption.count({ where: { couponId: coupon.id, userId: order.userId } });
          if (usedByUser >= coupon.usageLimitPerUser) {
            throw new Error("سقف استفاده شما از این کوپن پر شده است.");
          }
        }

        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: order.userId,
            orderId: order.id,
            amountDiscounted: order.discountAmount,
          },
        });
      }
    }

    if (order.giftCardId && order.giftCardAppliedAmount.gt(0)) {
      const existing = await tx.giftCardRedemption.findFirst({ where: { orderId: order.id } });
      if (!existing) {
        const updated = await tx.giftCard.updateMany({
          where: {
            id: order.giftCardId,
            status: "ACTIVE",
            balance: { gte: order.giftCardAppliedAmount },
          },
          data: { balance: { decrement: order.giftCardAppliedAmount } },
        });
        if (updated.count !== 1) {
          throw new Error("اعتبار بن خرید کافی نیست.");
        }

        await tx.giftCardRedemption.create({
          data: {
            giftCardId: order.giftCardId,
            userId: order.userId,
            orderId: order.id,
            amountUsed: order.giftCardAppliedAmount,
          },
        });
      }
    }

    if (order.walletAppliedAmount.gt(0)) {
      const wallet = await tx.wallet.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId },
        update: {},
      });

      const existing = await tx.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          refType: "ORDER",
          refId: order.id,
        },
      });

      if (!existing) {
        const updated = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: order.walletAppliedAmount } },
          data: { balance: { decrement: order.walletAppliedAmount } },
        });
        if (updated.count !== 1) {
          throw new Error("اعتبار کیف‌پول کافی نیست.");
        }

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEBIT",
            amount: order.walletAppliedAmount,
            reason: "استفاده از اعتبار کیف‌پول در سفارش",
            refType: "ORDER",
            refId: order.id,
          },
        });
      }
    }

    const payment = await tx.payment.upsert({
      where: {
        orderId: order.id,
      },
      create: {
        orderId: order.id,
        amount: submittedAmount,
        trackingCode: params.trackingCode,
        cardLast4: params.cardLast4,
        receiptUrl: uploaded.url,
        receiptStoragePath: uploaded.storagePath,
        status: "PENDING",
      },
      update: {
        amount: submittedAmount,
        trackingCode: params.trackingCode,
        cardLast4: params.cardLast4,
        receiptUrl: uploaded.url,
        receiptStoragePath: uploaded.storagePath,
        status: "PENDING",
        reviewSource: null,
        reviewNote: null,
        reviewedAt: null,
        telegramError: null,
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "PAYMENT_SUBMITTED",
      },
    });

    await tx.paymentAuditLog.create({
      data: {
        paymentId: payment.id,
        action: order.payment ? "RESUBMITTED" : "SUBMITTED",
        actorType: "USER",
        actorId: params.userId,
        message: order.payment ? "رسید پرداخت دوباره توسط کاربر ثبت شد." : "رسید پرداخت توسط کاربر ثبت شد.",
        metadata: {
          orderId: order.id,
          amount: submittedAmount.toString(),
          trackingCode: params.trackingCode,
        },
      },
    });

    return payment;
  });

  if (isTelegramConfigured()) {
    try {
      const message = await sendPaymentToTelegram({
        paymentId: payment.id,
        orderId: order.id,
        userName: order.user.name,
        email: order.user.email,
        phone: order.user.phone,
        planName: order.plan.name,
        amount: formatPrice(Number(order.amount)),
        trackingCode: params.trackingCode,
        cardLast4: params.cardLast4,
        receiptUrl: accessReceiptUrl,
      });

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            telegramMessageId: String(message.message_id),
            telegramSentAt: new Date(),
          },
        });

        await createPaymentAuditLog(tx, {
          paymentId: payment.id,
          action: "TELEGRAM_SENT",
          actorType: "SYSTEM",
          message: "رسید برای بررسی به تلگرام ارسال شد.",
          metadata: {
            messageId: message.message_id,
          },
        });
      });
    } catch (error) {
      const telegramError = error instanceof Error ? error.message : "خطای ناشناخته";

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            telegramError,
          },
        });

        await createPaymentAuditLog(tx, {
          paymentId: payment.id,
          action: "TELEGRAM_SEND_FAILED",
          actorType: "SYSTEM",
          message: "ارسال رسید به تلگرام ناموفق بود.",
          metadata: {
            error: telegramError,
          },
        });
      });
    }
  }

  return payment;
}

export async function reviewPayment(params: {
  paymentId: string;
  decision: "approve" | "reject";
  source: ReviewSource;
  reviewNote?: string;
  actorId?: string;
}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: {
              id: params.paymentId,
            },
            include: {
              order: {
                include: {
                  plan: true,
                  user: true,
                },
              },
            },
          });

          if (!payment) {
            throw new OrderFlowError("INVALID_ORDER", "پرداخت موردنظر پیدا نشد.");
          }

          if (payment.status !== PaymentStatus.PENDING) {
            throw new OrderFlowError(
              "PAYMENT_ALREADY_REVIEWED",
              "این پرداخت قبلا بررسی شده است.",
            );
          }

          if (params.decision === "reject") {
            const rejected = await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                status: "REJECTED",
                reviewSource: params.source,
                reviewNote: params.reviewNote ?? "پرداخت رد شد.",
                reviewedAt: new Date(),
              },
            });

            await tx.order.update({
              where: {
                id: payment.orderId,
              },
              data: {
                status: "PENDING_PAYMENT",
              },
            });

            if (payment.order.couponId) {
              await tx.couponRedemption.deleteMany({ where: { orderId: payment.orderId } });
            }

            if (payment.order.giftCardId && payment.order.giftCardAppliedAmount.gt(0)) {
              await tx.giftCard.update({
                where: { id: payment.order.giftCardId },
                data: { balance: { increment: payment.order.giftCardAppliedAmount } },
              });
              await tx.giftCardRedemption.deleteMany({ where: { orderId: payment.orderId } });
            }

            if (payment.order.walletAppliedAmount.gt(0)) {
              const wallet = await tx.wallet.upsert({
                where: { userId: payment.order.userId },
                create: { userId: payment.order.userId },
                update: {},
              });
              await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: payment.order.walletAppliedAmount } },
              });
              await tx.walletTransaction.create({
                data: {
                  walletId: wallet.id,
                  type: "CREDIT",
                  amount: payment.order.walletAppliedAmount,
                  reason: "بازگشت اعتبار کیف‌پول به دلیل رد پرداخت",
                  refType: "ORDER_REJECTED",
                  refId: payment.orderId,
                },
              });
            }

            await createNotification(tx, {
              userId: payment.order.userId,
              orderId: payment.orderId,
              type: "PAYMENT_REJECTED",
              title: "پرداخت شما رد شد",
              message: params.reviewNote ?? "پرداخت ثبت‌شده رد شد و لازم است دوباره رسید را ثبت کنید.",
            });

            await createPaymentAuditLog(tx, {
              paymentId: payment.id,
              action: "REJECTED",
              actorType: params.source === "TELEGRAM" ? "TELEGRAM" : "ADMIN",
              actorId: params.actorId,
              message: params.reviewNote ?? "پرداخت رد شد.",
              metadata: {
                source: params.source,
                orderId: payment.orderId,
              },
            });

            return {
              payment: rejected,
              order: payment.order,
              config: null,
            };
          }

          if (payment.order.status === "FULFILLED" || payment.order.accountId) {
            throw new OrderFlowError("ORDER_ALREADY_FULFILLED", "این سفارش قبلا تحویل شده است.");
          }

          const account = await tx.account.findFirst({
            where: {
              planId: payment.order.planId,
              status: "available",
            },
            orderBy: {
              createdAt: "asc",
            },
          });

          const approvedPayment = await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: "APPROVED",
              reviewSource: params.source,
              reviewNote: params.reviewNote ?? "پرداخت تایید شد.",
              reviewedAt: new Date(),
            },
          });

          await createNotification(tx, {
            userId: payment.order.userId,
            orderId: payment.orderId,
            type: "PAYMENT_APPROVED",
            title: "پرداخت شما تایید شد",
            message: `پرداخت سفارش ${payment.order.plan.name} تایید شد.`,
          });

          await createPaymentAuditLog(tx, {
            paymentId: payment.id,
            action: "APPROVED",
            actorType: params.source === "TELEGRAM" ? "TELEGRAM" : "ADMIN",
            actorId: params.actorId,
            message: params.reviewNote ?? "پرداخت تایید شد.",
            metadata: {
              source: params.source,
              orderId: payment.orderId,
            },
          });

          await awardReferralRewardForOrder(tx, payment.orderId);

          if (!account) {
            const waitingOrder = await tx.order.update({
              where: {
                id: payment.orderId,
              },
              data: {
                status: "WAITING_FOR_ACCOUNT",
              },
              include: {
                plan: true,
                user: true,
                account: true,
                payment: true,
              },
            });

            await createNotification(tx, {
              userId: payment.order.userId,
              orderId: payment.orderId,
              type: "ACCOUNT_DELAYED",
              title: "در انتظار تخصیص اکانت",
              message: "پرداخت تایید شد اما فعلا موجودی آماده نداریم. به محض اضافه شدن اکانت، سفارش شما تحویل می‌شود.",
            });

            return {
              payment: approvedPayment,
              order: waitingOrder,
              config: null,
            };
          }

          const updated = await tx.account.updateMany({
            where: {
              id: account.id,
              status: "available",
            },
            data: {
              status: "sold",
            },
          });

          if (updated.count !== 1) {
            throw new OrderFlowError("OUT_OF_STOCK", "اکانت انتخابی هم‌زمان فروخته شد.");
          }

          const fulfilledOrder = await tx.order.update({
            where: {
              id: payment.orderId,
            },
            data: {
              accountId: account.id,
              status: "FULFILLED",
              fulfilledAt: new Date(),
              expiresAt: calculateExpiryDate(new Date(), payment.order.plan.durationDays),
            },
            include: {
              plan: true,
              user: true,
              account: true,
              payment: true,
            },
          });

          await createNotification(tx, {
            userId: payment.order.userId,
            orderId: payment.orderId,
            type: "ACCOUNT_READY",
            title: "کانفیگ آماده دریافت است",
            message: `سفارش ${payment.order.plan.name} آماده شد و تا ${fulfilledOrder.expiresAt?.toLocaleDateString("fa-IR")} فعال است.`,
          });

          return {
            payment: approvedPayment,
            order: fulfilledOrder,
            config: account.config,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: REVIEW_PAYMENT_TRANSACTION_TIMEOUT_MS,
          maxWait: REVIEW_PAYMENT_TRANSACTION_MAX_WAIT_MS,
        },
      );
    } catch (error) {
      if (error instanceof OrderFlowError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < MAX_RETRIES) {
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error("عملیات بعد از چند تلاش کامل نشد.");
}

export async function fulfillWaitingOrdersForPlan(planId: string) {
  return prisma.$transaction(async (tx) => {
    const availableAccounts = await tx.account.findMany({
      where: {
        planId,
        status: "available",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (availableAccounts.length === 0) {
      return 0;
    }

    const waitingOrders = await tx.order.findMany({
      where: {
        planId,
        status: "WAITING_FOR_ACCOUNT",
        payment: {
          status: "APPROVED",
        },
      },
      include: {
        plan: true,
        user: true,
        payment: true,
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    let fulfilledCount = 0;

    for (let index = 0; index < waitingOrders.length && index < availableAccounts.length; index += 1) {
      const order = waitingOrders[index];
      const account = availableAccounts[index];

      const updated = await tx.account.updateMany({
        where: {
          id: account.id,
          status: "available",
        },
        data: {
          status: "sold",
        },
      });

      if (updated.count !== 1) {
        continue;
      }

      const fulfilledAt = new Date();
      const expiresAt = calculateExpiryDate(fulfilledAt, order.plan.durationDays);

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          accountId: account.id,
          status: "FULFILLED",
          fulfilledAt,
          expiresAt,
        },
      });

      await createNotification(tx, {
        userId: order.userId,
        orderId: order.id,
        type: "ACCOUNT_READY",
        title: "اکانت شما آماده شد",
        message: `برای سفارش ${order.plan.name} اکانت تخصیص داده شد و تا ${expiresAt.toLocaleDateString("fa-IR")} فعال است.`,
      });

      fulfilledCount += 1;
    }

    return fulfilledCount;
  });
}
