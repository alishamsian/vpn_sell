-- CreateEnum
CREATE TYPE "PaymentAuditAction" AS ENUM (
  'SUBMITTED',
  'RESUBMITTED',
  'TELEGRAM_SENT',
  'TELEGRAM_SEND_FAILED',
  'APPROVED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "PaymentAuditActor" AS ENUM (
  'USER',
  'ADMIN',
  'TELEGRAM',
  'SYSTEM'
);

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "receiptStoragePath" TEXT;

-- CreateTable
CREATE TABLE "PaymentAuditLog" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "action" "PaymentAuditAction" NOT NULL,
  "actorType" "PaymentAuditActor" NOT NULL,
  "actorId" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAuditLog_paymentId_createdAt_idx" ON "PaymentAuditLog"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_action_createdAt_idx" ON "PaymentAuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_createdAt_idx" ON "PasswordResetToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentAuditLog"
ADD CONSTRAINT "PaymentAuditLog_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
