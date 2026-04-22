-- AlterTable
ALTER TABLE "Message" ADD COLUMN "telegramBridgeMessageId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Message_telegramBridgeMessageId_key" ON "Message"("telegramBridgeMessageId");
