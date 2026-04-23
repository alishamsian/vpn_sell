-- CreateTable
CREATE TABLE "TelegramInventoryWizardState" (
    "actorTelegramId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'idle',
    "planId" TEXT,
    "buffer" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramInventoryWizardState_pkey" PRIMARY KEY ("actorTelegramId")
);
