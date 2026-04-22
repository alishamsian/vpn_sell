import { Prisma, WalletTopUpStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getReceiptAccessUrl, uploadReceiptFile } from "@/lib/storage";

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function parseSubmittedAmount(value: string) {
  const normalized = normalizeDigits(value).replace(/[,\s]/g, "");

  if (!/^\d+$/.test(normalized)) {
    throw new Error("مبلغ شارژ معتبر نیست.");
  }

  return new Prisma.Decimal(normalized);
}

export async function submitWalletTopUpReceipt(params: {
  userId: string;
  amount: string;
  trackingCode: string;
  cardLast4: string;
  receiptFile: File;
}) {
  if (!params.receiptFile || params.receiptFile.size === 0) {
    throw new Error("تصویر رسید الزامی است.");
  }

  const submittedAmount = parseSubmittedAmount(params.amount);

  if (submittedAmount.lte(0)) {
    throw new Error("مبلغ شارژ باید بیشتر از صفر باشد.");
  }

  const topUp = await prisma.walletTopUp.create({
    data: {
      userId: params.userId,
      amount: submittedAmount,
      trackingCode: params.trackingCode,
      cardLast4: params.cardLast4,
      receiptUrl: "pending",
      status: WalletTopUpStatus.PENDING,
    },
    select: { id: true },
  });

  const uploaded = await uploadReceiptFile({
    orderId: `wallet-topup-${topUp.id}`,
    file: params.receiptFile,
    userId: params.userId,
  });

  await prisma.walletTopUp.update({
    where: { id: topUp.id },
    data: {
      receiptUrl: uploaded.url,
      receiptStoragePath: uploaded.storagePath,
    },
  });

  return { id: topUp.id };
}

export async function getAdminWalletTopUps() {
  const topUps = await prisma.walletTopUp.findMany({
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    topUps.map(async (item) => ({
      ...item,
      previewReceiptUrl: await getReceiptAccessUrl({
        receiptUrl: item.receiptUrl,
        receiptStoragePath: item.receiptStoragePath,
      }),
      amountFormatted: formatPrice(Number(item.amount)),
    })),
  );
}

export async function reviewWalletTopUp(params: {
  topUpId: string;
  decision: "approve" | "reject";
  reviewNote?: string;
  adminId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const topUp = await tx.walletTopUp.findUnique({
      where: { id: params.topUpId },
    });

    if (!topUp) {
      throw new Error("درخواست شارژ پیدا نشد.");
    }

    if (topUp.status !== WalletTopUpStatus.PENDING) {
      throw new Error("این درخواست قبلا بررسی شده است.");
    }

    if (params.decision === "reject") {
      await tx.walletTopUp.update({
        where: { id: topUp.id },
        data: {
          status: WalletTopUpStatus.REJECTED,
          reviewNote: params.reviewNote ?? "رد شد.",
          reviewedAt: new Date(),
          reviewedByAdminId: params.adminId,
        },
      });

      return { status: "REJECTED" as const };
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: topUp.userId },
      create: { userId: topUp.userId },
      update: {},
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: topUp.amount } },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: topUp.amount,
        reason: "شارژ کیف‌پول توسط کاربر",
        refType: "WALLET_TOPUP",
        refId: topUp.id,
      },
    });

    await tx.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        status: WalletTopUpStatus.APPROVED,
        reviewNote: params.reviewNote ?? "تایید شد.",
        reviewedAt: new Date(),
        reviewedByAdminId: params.adminId,
      },
    });

    return { status: "APPROVED" as const };
  });
}

