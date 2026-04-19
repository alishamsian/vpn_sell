import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type PurchaseErrorCode = "INVALID_PLAN" | "OUT_OF_STOCK" | "PURCHASE_FAILED";

export class PurchaseError extends Error {
  code: PurchaseErrorCode;

  constructor(code: PurchaseErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_RETRIES = 3;

type PurchaseInput = {
  planId: string;
  userId: string;
};

export async function purchasePlan({ planId, userId }: PurchaseInput) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const plan = await tx.plan.findUnique({
            where: {
              id: planId,
            },
            select: {
              id: true,
            },
          });

          if (!plan) {
            throw new PurchaseError("INVALID_PLAN", "پلن انتخاب‌شده وجود ندارد.");
          }

          const account = await tx.account.findFirst({
            where: {
              planId,
              status: "available",
            },
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              config: true,
            },
          });

          if (!account) {
            throw new PurchaseError("OUT_OF_STOCK", "موجودی این پلن تمام شده است.");
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
            throw new PurchaseError("OUT_OF_STOCK", "موجودی این پلن همین الان تمام شد.");
          }

          const order = await tx.order.create({
            data: {
              userId,
              accountId: account.id,
            },
            select: {
              id: true,
              createdAt: true,
            },
          });

          return {
            success: true as const,
            orderId: order.id,
            createdAt: order.createdAt,
            config: account.config,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof PurchaseError) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new PurchaseError("OUT_OF_STOCK", "این اکانت قبلا فروخته شده است.");
        }

        if (error.code === "P2034" && attempt < MAX_RETRIES) {
          continue;
        }
      }

      throw new PurchaseError(
        "PURCHASE_FAILED",
        "در تکمیل خرید مشکلی رخ داد.",
      );
    }
  }

  throw new PurchaseError(
    "PURCHASE_FAILED",
    "خرید بعد از چند تلاش هم کامل نشد.",
  );
}
