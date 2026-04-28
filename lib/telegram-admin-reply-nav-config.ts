/**
 * تمام برچسب‌های Reply Keyboard ادمین — باید با متن دقیق وب‌هوک یکی باشد.
 * منوی پایین با هر انتخاب دسته عوض می‌شود (بدون اینلاین).
 */
export const TELEGRAM_ADMIN_REPLY_LABELS = {
  /** دسته‌های سطح اول */
  CAT_STATS: "📊 آمار و رصد",
  CAT_PAY: "💳 پرداخت و سفارش",
  CAT_PEOPLE: "👥 کاربران و چت",
  CAT_SHOP: "🛒 فروشگاه و دارایی",
  CAT_PLAN: "🛍 پلن و موجودی",
  CAT_TOOLS: "⚙️ ابزار و پنل",

  NAV_BACK: "🔙 بازگشت به منوی اصلی",

  /** زیرمنو: آمار */
  ACT_OVERVIEW: "📈 وضعیت لحظه‌ای",
  ACT_REPORT_FULL: "📋 گزارش کامل امروز",
  ACT_REPORTS_SITE: "📉 گزارش سایت",

  /** زیرمنو: پرداخت */
  ACT_PENDING_PAY: "⏳ پرداخت‌های معلق",
  ACT_WAIT_ACCOUNT: "📦 در انتظار اکانت",
  ACT_WALLET_TOPUPS: "💳 شارژ کیف (معلق)",

  /** زیرمنو: کاربران */
  ACT_OPEN_CHATS: "💬 چت‌های باز",
  ACT_USERS: "🧑‍💼 کاربران",

  /** زیرمنو: فروشگاه */
  ACT_CATALOG: "📦 کاتالوگ",
  ACT_WALLETS: "👛 کیف‌ها",
  ACT_COUPONS: "🎟 کوپن‌ها",
  ACT_GIFT_CARDS: "🎁 هدیه",
  ACT_REFERRALS: "🔗 رفرال",

  /** زیرمنو: پلن */
  ACT_PLAN_NEW: "➕ پلن جدید",
  ACT_PLAN_LIST: "📋 لیست پلن‌ها",
  ACT_STOCK_ADD: "📥 افزودن موجودی",

  /** زیرمنو: ابزار */
  ACT_LINKS: "🔗 لینک‌های پنل",
  ACT_HELP: "📋 راهنما",
  ACT_REFRESH_KB: "🔄 بروزرسانی این منو",

  LINKS: "🔗 لینک سریع پنل",
  HELP: "❓ راهنمای ربات",
  REFRESH: "🔄 منوی اصلی (ریست)",
  CLOSE_KB: "❌ بستن دکمه‌های پایین",
} as const;

export type TelegramAdminReplyLabel =
  (typeof TELEGRAM_ADMIN_REPLY_LABELS)[keyof typeof TELEGRAM_ADMIN_REPLY_LABELS];

export type ReplyNavMenuKey =
  | "main"
  | "cat_stats"
  | "cat_pay"
  | "cat_people"
  | "cat_shop"
  | "cat_plan"
  | "cat_tools";

const L = TELEGRAM_ADMIN_REPLY_LABELS;

/** چیدمان دکمه‌های پایین برای هر مرحله */
export const REPLY_NAV_LAYOUT: Record<ReplyNavMenuKey, string[][]> = {
  main: [
    [L.CAT_STATS, L.CAT_PAY],
    [L.CAT_PEOPLE, L.CAT_SHOP],
    [L.CAT_PLAN, L.CAT_TOOLS],
    [L.LINKS, L.HELP],
    [L.REFRESH, L.CLOSE_KB],
  ],
  cat_stats: [[L.ACT_OVERVIEW, L.ACT_REPORT_FULL], [L.ACT_REPORTS_SITE], [L.NAV_BACK]],
  cat_pay: [[L.ACT_PENDING_PAY, L.ACT_WAIT_ACCOUNT], [L.ACT_WALLET_TOPUPS], [L.NAV_BACK]],
  cat_people: [[L.ACT_OPEN_CHATS, L.ACT_USERS], [L.NAV_BACK]],
  cat_shop: [[L.ACT_CATALOG, L.ACT_WALLETS], [L.ACT_COUPONS, L.ACT_GIFT_CARDS], [L.ACT_REFERRALS], [L.NAV_BACK]],
  cat_plan: [[L.ACT_PLAN_NEW, L.ACT_PLAN_LIST], [L.ACT_STOCK_ADD], [L.NAV_BACK]],
  cat_tools: [[L.ACT_LINKS, L.ACT_HELP], [L.ACT_REFRESH_KB], [L.NAV_BACK]],
};

/** پس از زدن هر «عمل»، دوباره همین زیرمنو را نشان بده */
export const ACTION_PARENT_MENU: Partial<Record<string, ReplyNavMenuKey>> = {
  [L.ACT_OVERVIEW]: "cat_stats",
  [L.ACT_REPORT_FULL]: "cat_stats",
  [L.ACT_REPORTS_SITE]: "cat_stats",
  [L.ACT_PENDING_PAY]: "cat_pay",
  [L.ACT_WAIT_ACCOUNT]: "cat_pay",
  [L.ACT_WALLET_TOPUPS]: "cat_pay",
  [L.ACT_OPEN_CHATS]: "cat_people",
  [L.ACT_USERS]: "cat_people",
  [L.ACT_CATALOG]: "cat_shop",
  [L.ACT_WALLETS]: "cat_shop",
  [L.ACT_COUPONS]: "cat_shop",
  [L.ACT_GIFT_CARDS]: "cat_shop",
  [L.ACT_REFERRALS]: "cat_shop",
  [L.ACT_PLAN_NEW]: "cat_plan",
  [L.ACT_PLAN_LIST]: "cat_plan",
  [L.ACT_STOCK_ADD]: "cat_plan",
};

/** دکمهٔ دسته → کلید زیرمنو */
export const CATEGORY_TO_MENU: Record<string, ReplyNavMenuKey> = {
  [L.CAT_STATS]: "cat_stats",
  [L.CAT_PAY]: "cat_pay",
  [L.CAT_PEOPLE]: "cat_people",
  [L.CAT_SHOP]: "cat_shop",
  [L.CAT_PLAN]: "cat_plan",
  [L.CAT_TOOLS]: "cat_tools",
};
