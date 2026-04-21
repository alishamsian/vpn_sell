-- Add new order state for approved payments waiting on inventory
ALTER TYPE "OrderStatus" ADD VALUE 'WAITING_FOR_ACCOUNT';

-- Create notification type enum
CREATE TYPE "NotificationType" AS ENUM (
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'ACCOUNT_READY',
  'ACCOUNT_DELAYED'
);

-- Add subscription expiry to orders
ALTER TABLE "Order"
ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Create notifications table
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_orderId_createdAt_idx" ON "Notification"("orderId", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
