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

export async function createOrderForUser(params: { userId: string; planId: string }) {
  const plan = await prisma.plan.findUnique({
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

  const order = await prisma.order.create({
    data: {
      userId: params.userId,
      planId: params.planId,
      amount: plan.price,
      status: "PENDING_PAYMENT",
    },
    select: {
      id: true,
    },
  });

  return order;
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

  const payment = await prisma.payment.upsert({
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

  await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: "PAYMENT_SUBMITTED",
    },
  });

  await prisma.paymentAuditLog.create({
    data: {
      paymentId: payment.id,
      action: order.payment ? "RESUBMITTED" : "SUBMITTED",
      actorType: "USER",
      actorId: params.userId,
      message: order.payment
        ? "رسید پرداخت دوباره توسط کاربر ثبت شد."
        : "رسید پرداخت توسط کاربر ثبت شد.",
      metadata: {
        orderId: order.id,
        amount: submittedAmount.toString(),
        trackingCode: params.trackingCode,
      },
    },
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
