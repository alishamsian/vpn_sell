import { getAdminOverview, getPlansWithInventory } from "@/lib/queries";

/** متن خلاصه برای کرون روزانه یا نمایش دستی در تلگرام. */
export async function buildTelegramDailyReportText(): Promise<string> {
  const [overview, plans] = await Promise.all([getAdminOverview(), getPlansWithInventory()]);

  const lowStock = plans.filter((p) => p.remainingCount <= 2).slice(0, 10);
  const timeLabel = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines = [
    "📊 گزارش روزانه (خلاصه)",
    `زمان (تهران): ${timeLabel}`,
    `پرداخت در انتظار بررسی: ${overview.pendingPayments}`,
    `سفارش در انتظار اکانت: ${overview.waitingForAccountOrders}`,
    `گفتگوی باز: ${overview.openConversations}`,
    `پیام خوانده‌نشده (سمت ادمین): ${overview.unreadAdminChats}`,
    `حساب آماده فروش: ${overview.availableAccounts} از ${overview.totalAccounts}`,
    `کاربران: ${overview.usersCount} | پلن‌ها: ${overview.totalPlans}`,
    lowStock.length > 0
      ? ["", "⚠️ موجودی کم:", ...lowStock.map((p) => `• ${p.name}: ${p.remainingCount} عدد`)].join("\n")
      : null,
  ].filter((x) => x != null && x !== "");

  return lines.join("\n");
}
