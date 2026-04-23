"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { fulfillWaitingOrdersForPlan, reviewPayment } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { reviewWalletTopUp } from "@/lib/wallet-topups";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createPlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const priceValue = String(formData.get("price") ?? "").trim();
  const durationValue = String(formData.get("durationDays") ?? "").trim();
  const maxUsersRaw = String(formData.get("maxUsers") ?? "").trim();
  const price = Number(priceValue);
  const durationDays = Number(durationValue);

  if (!name) {
    return {
      status: "error",
      message: "نام پلن الزامی است.",
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return {
      status: "error",
      message: "قیمت باید یک عدد مثبت باشد.",
    };
  }

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return {
      status: "error",
      message: "مدت اشتراک باید یک عدد صحیح مثبت باشد.",
    };
  }

  let maxUsers: number | null = null;

  if (maxUsersRaw) {
    const parsedMaxUsers = Number(maxUsersRaw);

    if (!Number.isInteger(parsedMaxUsers) || parsedMaxUsers <= 0) {
      return {
        status: "error",
        message: "حداکثر کاربر باید یک عدد صحیح مثبت باشد یا خالی بماند.",
      };
    }

    maxUsers = parsedMaxUsers;
  }

  await prisma.plan.create({
    data: {
      name,
      price: new Prisma.Decimal(Math.round(price)),
      durationDays,
      maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "پلن با موفقیت ساخته شد.",
  };
}

export async function addAccountsAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const rawConfigs = String(formData.get("configs") ?? "");
  const configs = rawConfigs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!planId) {
    return {
      status: "error",
      message: "لطفا یک پلن انتخاب کنید.",
    };
  }

  if (configs.length === 0) {
    return {
      status: "error",
      message: "حداقل یک خط کانفیگ وارد کنید.",
    };
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
    select: {
      id: true,
    },
  });

  if (!plan) {
    return {
      status: "error",
      message: "پلن انتخاب‌شده دیگر وجود ندارد.",
    };
  }

  await prisma.account.createMany({
    data: configs.map((config) => ({
      config,
      planId,
      status: "available",
    })),
  });

  const fulfilledWaitingOrders = await fulfillWaitingOrdersForPlan(planId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message:
      fulfilledWaitingOrders > 0
        ? `${configs.length} اکانت اضافه شد و ${fulfilledWaitingOrders} سفارش منتظر، خودکار تحویل شد.`
        : `${configs.length} اکانت با موفقیت اضافه شد.`,
  };
}

export async function updatePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceValue = String(formData.get("price") ?? "").trim();
  const durationValue = String(formData.get("durationDays") ?? "").trim();
  const maxUsersRaw = String(formData.get("maxUsers") ?? "").trim();
  const price = Number(priceValue);
  const durationDays = Number(durationValue);

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

  if (!name) {
    return {
      status: "error",
      message: "نام پلن الزامی است.",
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return {
      status: "error",
      message: "قیمت باید یک عدد مثبت باشد.",
    };
  }

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return {
      status: "error",
      message: "مدت اشتراک باید یک عدد صحیح مثبت باشد.",
    };
  }

  let maxUsers: number | null = null;

  if (maxUsersRaw) {
    const parsedMaxUsers = Number(maxUsersRaw);

    if (!Number.isInteger(parsedMaxUsers) || parsedMaxUsers <= 0) {
      return {
        status: "error",
        message: "حداکثر کاربر باید یک عدد صحیح مثبت باشد یا خالی بماند.",
      };
    }

    maxUsers = parsedMaxUsers;
  }

  await prisma.plan.update({
    where: {
      id: planId,
    },
    data: {
      name,
      price: new Prisma.Decimal(Math.round(price)),
      durationDays,
      maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "پلن با موفقیت به‌روزرسانی شد.",
  };
}

export async function duplicatePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    return {
      status: "error",
      message: "پلن موردنظر پیدا نشد.",
    };
  }

  const baseName = `${plan.name} (کپی)`;
  const name = baseName.length > 120 ? `${baseName.slice(0, 117)}...` : baseName;

  await prisma.plan.create({
    data: {
      name,
      price: plan.price,
      durationDays: plan.durationDays,
      maxUsers: plan.maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "کپی پلن با موفقیت ساخته شد.",
  };
}

export async function deletePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const confirmDelete = String(formData.get("confirmDelete") ?? "");

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

  if (confirmDelete !== "on") {
    return {
      status: "error",
      message: "برای حذف باید تایید را فعال کنید.",
    };
  }

  const ordersCount = await prisma.order.count({
    where: {
      planId,
    },
  });

  if (ordersCount > 0) {
    return {
      status: "error",
      message: "این پلن سفارش ثبت‌شده دارد و برای حفظ سوابق قابل حذف نیست.",
    };
  }

  await prisma.plan.delete({
    where: {
      id: planId,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "پلن حذف شد.",
  };
}

export async function reviewPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!paymentId || !decision) {
    return {
      status: "error",
      message: "شناسه پرداخت و تصمیم ادمین الزامی است.",
    };
  }

  if (decision !== "approve" && decision !== "reject") {
    return {
      status: "error",
      message: "تصمیم انتخاب‌شده معتبر نیست.",
    };
  }

  try {
    const result = await reviewPayment({
      paymentId,
      decision,
      source: "ADMIN_PANEL",
      reviewNote: reviewNote || undefined,
      actorId: admin.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/catalog");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message:
        decision === "approve"
          ? result.order.status === "WAITING_FOR_ACCOUNT"
            ? "پرداخت تایید شد و سفارش در انتظار تخصیص اکانت قرار گرفت."
            : "پرداخت تایید شد و اکانت تحویل گردید."
          : "پرداخت رد شد؛ دلیل برای کاربر ذخیره شد و می‌تواند رسید جدید بفرستد.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "بررسی پرداخت با خطا مواجه شد.",
    };
  }
}

export async function createCouponAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const kind = String(formData.get("kind") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();
  const minOrderAmountRaw = String(formData.get("minOrderAmount") ?? "").trim();
  const maxDiscountAmountRaw = String(formData.get("maxDiscountAmount") ?? "").trim();
  const usageLimitTotalRaw = String(formData.get("usageLimitTotal") ?? "").trim();
  const usageLimitPerUserRaw = String(formData.get("usageLimitPerUser") ?? "").trim();

  if (!code || code.length < 3) {
    return { status: "error", message: "کد کوپن باید حداقل ۳ کاراکتر باشد." };
  }

  if (kind !== "PERCENT" && kind !== "FIXED") {
    return { status: "error", message: "نوع کوپن معتبر نیست." };
  }

  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value <= 0) {
    return { status: "error", message: "مقدار کوپن باید عدد مثبت باشد." };
  }

  const toIntOrNull = (raw: string) => {
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const toDecimalOrNull = (raw: string) => {
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? new Prisma.Decimal(Math.round(parsed)) : null;
  };

  const minOrderAmount = toDecimalOrNull(minOrderAmountRaw);
  if (minOrderAmountRaw && !minOrderAmount) {
    return { status: "error", message: "حداقل مبلغ سفارش معتبر نیست." };
  }

  const maxDiscountAmount = toDecimalOrNull(maxDiscountAmountRaw);
  if (maxDiscountAmountRaw && !maxDiscountAmount) {
    return { status: "error", message: "سقف تخفیف معتبر نیست." };
  }

  const usageLimitTotal = usageLimitTotalRaw ? toIntOrNull(usageLimitTotalRaw) : null;
  if (usageLimitTotalRaw && usageLimitTotal === null) {
    return { status: "error", message: "سقف مصرف کل معتبر نیست." };
  }

  const usageLimitPerUser = usageLimitPerUserRaw ? toIntOrNull(usageLimitPerUserRaw) : null;
  if (usageLimitPerUserRaw && usageLimitPerUser === null) {
    return { status: "error", message: "سقف مصرف هر کاربر معتبر نیست." };
  }

  try {
    await prisma.coupon.create({
      data: {
        code,
        kind,
        value: new Prisma.Decimal(Math.round(value)),
        minOrderAmount,
        maxDiscountAmount,
        usageLimitTotal,
        usageLimitPerUser,
        createdByAdminId: admin.id,
      },
    });

    revalidatePath("/admin/coupons");
    revalidatePath("/admin");
    return { status: "success", message: "کوپن با موفقیت ساخته شد." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "ساخت کوپن ناموفق بود." };
  }
}

export async function toggleCouponActiveAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const couponId = String(formData.get("couponId") ?? "").trim();
  const nextActiveRaw = String(formData.get("isActive") ?? "").trim();
  const isActive = nextActiveRaw === "true";

  if (!couponId) {
    return { status: "error", message: "شناسه کوپن معتبر نیست." };
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  });

  revalidatePath("/admin/coupons");
  return { status: "success", message: isActive ? "کوپن فعال شد." : "کوپن غیرفعال شد." };
}

export async function createGiftCardAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  if (!code || code.length < 6) {
    return { status: "error", message: "کد بن باید حداقل ۶ کاراکتر باشد." };
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "مبلغ بن باید عدد مثبت باشد." };
  }

  await prisma.giftCard.create({
    data: {
      code,
      initialAmount: new Prisma.Decimal(Math.round(amount)),
      balance: new Prisma.Decimal(Math.round(amount)),
      createdByAdminId: admin.id,
    },
  });

  revalidatePath("/admin/gift-cards");
  return { status: "success", message: "بن خرید ساخته شد." };
}

export async function setGiftCardStatusAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const giftCardId = String(formData.get("giftCardId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!giftCardId || (status !== "ACTIVE" && status !== "DISABLED" && status !== "EXPIRED")) {
    return { status: "error", message: "درخواست معتبر نیست." };
  }

  await prisma.giftCard.update({ where: { id: giftCardId }, data: { status } });
  revalidatePath("/admin/gift-cards");
  return { status: "success", message: "وضعیت بن به‌روزرسانی شد." };
}

export async function adjustWalletAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return { status: "error", message: "شناسه کاربر معتبر نیست." };
  if (!reason) return { status: "error", message: "دلیل تنظیم الزامی است." };

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount === 0) {
    return { status: "error", message: "مبلغ تنظیم باید عدد و غیرصفر باشد." };
  }

  const delta = new Prisma.Decimal(Math.round(Math.abs(amount)));
  const isCredit = amount > 0;

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      if (!isCredit) {
        const updated = await tx.wallet.updateMany({
          where: { id: wallet.id, balance: { gte: delta } },
          data: { balance: { decrement: delta } },
        });
        if (updated.count !== 1) {
          throw new Error("اعتبار کیف‌پول کافی نیست.");
        }
      } else {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: delta } } });
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ADJUST",
          amount: delta,
          reason,
          refType: isCredit ? "WALLET_ADJUST_CREDIT" : "WALLET_ADJUST_DEBIT",
          refId: userId,
        },
      });
    });

    revalidatePath("/admin/wallets");
    return { status: "success", message: "کیف‌پول با موفقیت تنظیم شد." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "تنظیم کیف‌پول ناموفق بود." };
  }
}

export async function createReferralCampaignAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const rewardValueRaw = String(formData.get("rewardValue") ?? "").trim();

  if (!name) return { status: "error", message: "نام کمپین الزامی است." };

  const rewardValue = Number(rewardValueRaw);
  if (!Number.isFinite(rewardValue) || rewardValue <= 0) {
    return { status: "error", message: "مقدار پاداش باید عدد مثبت باشد." };
  }

  await prisma.referralCampaign.create({
    data: {
      name,
      rewardValue: new Prisma.Decimal(Math.round(rewardValue)),
      rewardTrigger: "PAYMENT_APPROVED",
      createdByAdminId: admin.id,
    },
  });

  revalidatePath("/admin/referrals");
  return { status: "success", message: "کمپین رفرال ساخته شد." };
}

export async function createReferralCodeAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  const ownerUserId = String(formData.get("ownerUserId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!code || code.length < 4) return { status: "error", message: "کد رفرال معتبر نیست." };
  if (!campaignId) return { status: "error", message: "کمپین الزامی است." };

  await prisma.referralCode.create({
    data: {
      code,
      campaignId,
      ownerUserId: ownerUserId || null,
      note: note || null,
    },
  });

  revalidatePath("/admin/referrals");
  return { status: "success", message: "کد رفرال ساخته شد." };
}

export async function reviewWalletTopUpAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const topUpId = String(formData.get("topUpId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!topUpId || (decision !== "approve" && decision !== "reject")) {
    return { status: "error", message: "درخواست بررسی معتبر نیست." };
  }

  try {
    await reviewWalletTopUp({
      topUpId,
      decision,
      reviewNote: reviewNote || undefined,
      adminId: admin.id,
    });
    revalidatePath("/admin/wallet-topups");
    revalidatePath("/admin/wallets");
    return { status: "success", message: decision === "approve" ? "شارژ تایید شد." : "شارژ رد شد." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "بررسی شارژ ناموفق بود." };
  }
}
