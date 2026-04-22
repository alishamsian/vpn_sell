-- CreateEnum
CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WalletTopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,0) NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "receiptStoragePath" TEXT,
    "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTopUp_userId_createdAt_idx" ON "WalletTopUp"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTopUp_status_createdAt_idx" ON "WalletTopUp"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
