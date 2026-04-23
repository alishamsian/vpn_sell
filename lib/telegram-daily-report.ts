import {
  formatAdminOverviewForTelegram,
  getAdminOverview,
  getPlansWithInventory,
} from "@/lib/queries";

const TG_RULE = "────────────";

/** متن خلاصه برای کرون روزانه یا نمایش دستی در تلگرام. */
export async function buildTelegramDailyReportText(): Promise<string> {
  const [overview, plans] = await Promise.all([getAdminOverview(), getPlansWithInventory()]);

  const lowStock = plans.filter((p) => p.remainingCount <= 2).slice(0, 10);
  const timeLabel = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const overviewBlock = formatAdminOverviewForTelegram(overview, { title: "گزارش روزانه · کلیات" });

  const lowStockBlock =
    lowStock.length > 0
      ? [
          "",
          "⚠️ موجودی کم پلن‌ها",
          TG_RULE,
          ...lowStock.map(
            (p) =>
              `• ${p.name}: ${new Intl.NumberFormat("fa-IR").format(p.remainingCount)} عدد آماده (≤۲)`,
          ),
        ].join("\n")
      : "";

  return [overviewBlock, "", `زمان گزارش (تهران): ${timeLabel}`, lowStockBlock].filter(Boolean).join("\n");
}
