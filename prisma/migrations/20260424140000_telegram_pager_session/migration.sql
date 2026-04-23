-- CreateTable
CREATE TABLE "TelegramPagerSession" (
    "shortCode" TEXT NOT NULL,
    "actorTelegramId" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramPagerSession_pkey" PRIMARY KEY ("shortCode")
);

-- CreateIndex
CREATE INDEX "TelegramPagerSession_createdAt_idx" ON "TelegramPagerSession"("createdAt");
