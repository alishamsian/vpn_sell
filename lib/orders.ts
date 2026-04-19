import { PaymentStatus, Prisma, ReviewSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { sendPaymentToTelegram, isTelegramConfigured } from "@/lib/telegram";
import { uploadReceiptFile } from "@/lib/storage";

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

  if (!params.receiptFile || params.receiptFile.size === 0) {
    throw new Error("تصویر رسید الزامی است.");
  }

  const uploaded = await uploadReceiptFile({
    orderId: order.id,
    file: params.receiptFile,
    userId: order.userId,
  });

  const payment = await prisma.payment.upsert({
    where: {
      orderId: order.id,
    },
    create: {
      orderId: order.id,
      amount: new Prisma.Decimal(params.amount),
      trackingCode: params.trackingCode,
      cardLast4: params.cardLast4,
      receiptUrl: uploaded.url,
      status: "PENDING",
    },
    update: {
      amount: new Prisma.Decimal(params.amount),
      trackingCode: params.trackingCode,
      cardLast4: params.cardLast4,
      receiptUrl: uploaded.url,
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
        receiptUrl: uploaded.url,
      });

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          telegramMessageId: String(message.message_id),
          telegramSentAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          telegramError: error instanceof Error ? error.message : "خطای ناشناخته",
        },
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

          if (!account) {
            throw new OrderFlowError("OUT_OF_STOCK", "در حال حاضر اکانت آماده‌ای برای این پلن وجود ندارد.");
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

          const fulfilledOrder = await tx.order.update({
            where: {
              id: payment.orderId,
            },
            data: {
              accountId: account.id,
              status: "FULFILLED",
              fulfilledAt: new Date(),
            },
            include: {
              plan: true,
              user: true,
              account: true,
              payment: true,
            },
          });

          return {
            payment: approvedPayment,
            order: fulfilledOrder,
            config: account.config,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
