-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('ADMIN_PANEL', 'TELEGRAM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy users from old orders
INSERT INTO "User" ("id", "name", "passwordHash", "role", "createdAt", "updatedAt")
SELECT DISTINCT "userId", 'کاربر قدیمی', 'legacy-user', 'USER'::"UserRole", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Order";

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "amount" DECIMAL(10,2),
ADD COLUMN     "fulfilledAt" TIMESTAMP(3),
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "accountId" DROP NOT NULL;

-- Backfill new order columns using linked account and plan
UPDATE "Order" AS o
SET
  "planId" = a."planId",
  "amount" = p."price",
  "status" = CASE WHEN o."accountId" IS NOT NULL THEN 'FULFILLED'::"OrderStatus" ELSE 'PENDING_PAYMENT'::"OrderStatus" END,
  "fulfilledAt" = CASE WHEN o."accountId" IS NOT NULL THEN o."createdAt" ELSE NULL END,
  "updatedAt" = o."createdAt"
FROM "Account" AS a
JOIN "Plan" AS p ON p."id" = a."planId"
WHERE a."id" = o."accountId";

-- Finalize required constraints after backfill
ALTER TABLE "Order"
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "planId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewSource" "ReviewSource",
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "telegramMessageId" TEXT,
    "telegramSentAt" TIMESTAMP(3),
    "telegramError" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_submittedAt_idx" ON "Payment"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "Order_planId_status_createdAt_idx" ON "Order"("planId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
