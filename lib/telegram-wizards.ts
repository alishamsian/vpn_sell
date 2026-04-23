import { prisma } from "@/lib/prisma";

/** پاک‌سازی هر دو ویزارد پلن و موجودی تلگرام برای یک فرستنده. */
export async function clearAllTelegramWizards(actorTelegramId: string) {
  await prisma.$transaction([
    prisma.telegramPlanWizardState.deleteMany({ where: { actorTelegramId } }),
    prisma.telegramInventoryWizardState.deleteMany({ where: { actorTelegramId } }),
  ]);
}
