/*
  Warnings:

  - Added the required column `subtotalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUST');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralRewardTrigger" AS ENUM ('PAYMENT_APPROVED');

-- CreateEnum
CREATE TYPE "ReferralAttributionStatus" AS ENUM ('PENDING', 'REWARDED', 'REJECTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(12,0) NOT NULL DEFAULT 0,
ADD COLUMN     "giftCardAppliedAmount" DECIMAL(12,0) NOT NULL DEFAULT 0,
ADD COLUMN     "giftCardId" TEXT,
ADD COLUMN     "subtotalAmount" DECIMAL(12,0),
ADD COLUMN     "walletAppliedAmount" DECIMAL(12,0) NOT NULL DEFAULT 0,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Backfill existing orders: subtotal = amount
UPDATE "Order"
SET "subtotalAmount" = "amount"
WHERE "subtotalAmount" IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE "Order" ALTER COLUMN "subtotalAmount" SET NOT NULL;

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,0) NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "value" DECIMAL(12,0) NOT NULL,
    "maxDiscountAmount" DECIMAL(12,0),
    "minOrderAmount" DECIMAL(12,0),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimitTotal" INTEGER,
    "usageLimitPerUser" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponAllowedPlan" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "CouponAllowedPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountDiscounted" DECIMAL(12,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialAmount" DECIMAL(12,0) NOT NULL,
    "balance" DECIMAL(12,0) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountUsed" DECIMAL(12,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewardValue" DECIMAL(12,0) NOT NULL,
    "rewardTrigger" "ReferralRewardTrigger" NOT NULL DEFAULT 'PAYMENT_APPROVED',
    "maxRewardsTotal" INTEGER,
    "maxRewardsPerReferrer" INTEGER,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "firstOrderId" TEXT,
    "status" "ReferralAttributionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_createdAt_idx" ON "Wallet"("createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_refType_refId_idx" ON "WalletTransaction"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_createdAt_idx" ON "Coupon"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Coupon_startsAt_endsAt_idx" ON "Coupon"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CouponAllowedPlan_planId_idx" ON "CouponAllowedPlan"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponAllowedPlan_couponId_planId_key" ON "CouponAllowedPlan"("couponId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_createdAt_idx" ON "CouponRedemption"("couponId", "createdAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_createdAt_idx" ON "CouponRedemption"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_status_createdAt_idx" ON "GiftCard"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCard_startsAt_endsAt_idx" ON "GiftCard"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_giftCardId_createdAt_idx" ON "GiftCardRedemption"("giftCardId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_userId_createdAt_idx" ON "GiftCardRedemption"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardRedemption_giftCardId_orderId_key" ON "GiftCardRedemption"("giftCardId", "orderId");

-- CreateIndex
CREATE INDEX "ReferralCampaign_isActive_createdAt_idx" ON "ReferralCampaign"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralCampaign_startsAt_endsAt_idx" ON "ReferralCampaign"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_campaignId_createdAt_idx" ON "ReferralCode"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralCode_ownerUserId_idx" ON "ReferralCode"("ownerUserId");

-- CreateIndex
CREATE INDEX "ReferralCode_isActive_createdAt_idx" ON "ReferralCode"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_firstOrderId_key" ON "ReferralAttribution"("firstOrderId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_referredUserId_createdAt_idx" ON "ReferralAttribution"("referredUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralAttribution_status_createdAt_idx" ON "ReferralAttribution"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_referralCodeId_referredUserId_key" ON "ReferralAttribution"("referralCodeId", "referredUserId");

-- CreateIndex
CREATE INDEX "Order_couponId_createdAt_idx" ON "Order"("couponId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_giftCardId_createdAt_idx" ON "Order"("giftCardId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAllowedPlan" ADD CONSTRAINT "CouponAllowedPlan_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAllowedPlan" ADD CONSTRAINT "CouponAllowedPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCampaign" ADD CONSTRAINT "ReferralCampaign_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_firstOrderId_fkey" FOREIGN KEY ("firstOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
