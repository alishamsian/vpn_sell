-- CreateTable
CREATE TABLE "TelegramPlanWizardState" (
    "actorTelegramId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'idle',
    "planId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramPlanWizardState_pkey" PRIMARY KEY ("actorTelegramId")
);
