import { Prisma } from "@prisma/client";

import { buildTelegramDailyReportText } from "@/lib/telegram-daily-report";
import {
  answerTelegramCallbackSafe,
  buildAdminMenuReplyMarkup,
  buildAdminReplyKeyboardMarkup,
  buildAdminWelcomeText,
  editAdminHubMessage,
  sendAdminHubDataMessage,
  sendAdminOnboardingKeyboardBundle,
  sendAdminPlainTextMessage,
} from "@/lib/telegram";
import { buildHtmlPagesFromDataset } from "@/lib/telegram-admin-panel-html";
import {
  clearAllTelegramWizards,
} from "@/lib/telegram-wizards";
import {
  formatAdminOverviewForTelegram,
  formatAdminReportsSnippetForTelegram,
  formatCatalogInventoryForTelegram,
  formatCouponsTelegramSummary,
  formatGiftCardsTelegramSummary,
  formatOpenConversationsForTelegram,
  formatPendingPaymentsForTelegram,
  formatPendingWalletTopUpsForTelegram,
  formatRecentUsersForTelegram,
  formatReferralsTelegramSummary,
  formatWaitingAccountOrdersForTelegram,
  formatWalletsTelegramSummary,
  getAdminOverview,
} from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { sendPlanListMessage, startPlanCreateWizard } from "@/lib/telegram-plan-bot";
import { startStockAddWizard } from "@/lib/telegram-inventory-bot";

const HUB_PREFIX = "H";

type CatDef = {
  id: string;
  title: string;
  actions: { id: string; label: string }[];
};

const CATEGORIES: CatDef[] = [
  {
    id: "st",
    title: "آمار و رصد",
    actions: [
      { id: "overview", label: "📊 وضعیت لحظه‌ای" },
      { id: "report_full", label: "📈 گزارش کامل امروز" },
      { id: "reports_site", label: "📉 گزارش سایت" },
    ],
  },
  {
    id: "py",
    title: "پرداخت و سفارش",
    actions: [
      { id: "pending_pay", label: "⏳ پرداخت‌های معلق" },
      { id: "wait_account", label: "📦 در انتظار اکانت" },
      { id: "wallet_topups", label: "💳 شارژ کیف (معلق)" },
    ],
  },
  {
    id: "pe",
    title: "کاربران و ارتباط",
    actions: [
      { id: "open_chats", label: "💬 چت‌های باز" },
      { id: "users", label: "🧑‍💼 کاربران" },
    ],
  },
  {
    id: "sh",
    title: "فروشگاه و دارایی",
    actions: [
      { id: "catalog", label: "📦 کاتالوگ" },
      { id: "wallets", label: "👛 کیف‌ها" },
      { id: "coupons", label: "🎟 کوپن‌ها" },
      { id: "gift_cards", label: "🎁 هدیه" },
      { id: "referrals", label: "🔗 رفرال" },
    ],
  },
  {
    id: "pl",
    title: "پلن و موجودی",
    actions: [
      { id: "plan_new", label: "➕ پلن جدید" },
      { id: "plan_list", label: "📋 لیست پلن‌ها" },
      { id: "stock_add", label: "📥 افزودن موجودی" },
    ],
  },
  {
    id: "ut",
    title: "ابزار و پنل",
    actions: [
      { id: "links", label: "🔗 لینک‌های پنل" },
      { id: "help", label: "📋 راهنما" },
      { id: "refresh_kb", label: "🔄 بروزرسانی کیبورد" },
    ],
  },
];

function hubCb(...parts: string[]) {
  return [HUB_PREFIX, ...parts].join("|");
}

export function buildAdminHubRootKeyboard(): { inline_keyboard: { text: string; callback_data: string }[][] } {
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    const row: { text: string; callback_data: string }[] = [];
    row.push({ text: CATEGORIES[i].title, callback_data: hubCb("c", CATEGORIES[i].id) });
    if (CATEGORIES[i + 1]) {
      row.push({ text: CATEGORIES[i + 1].title, callback_data: hubCb("c", CATEGORIES[i + 1].id) });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

function getCategory(catId: string): CatDef | undefined {
  return CATEGORIES.find((c) => c.id === catId);
}

function buildSubmenuKeyboard(catId: string): { inline_keyboard: { text: string; callback_data: string }[][] } {
  const cat = getCategory(catId);
  if (!cat) {
    return { inline_keyboard: [] };
  }
  const rows: { text: string; callback_data: string }[][] = [];
  for (const a of cat.actions) {
    rows.push([{ text: a.label, callback_data: hubCb("g", a.id) }]);
  }
  rows.push([{ text: "🔙 بازگشت به دسته‌ها", callback_data: hubCb("b") }]);
  return { inline_keyboard: rows };
}

function randomPagerCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

async function pruneOldPagerSessions() {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.telegramPagerSession.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}

function buildPagerKeyboard(shortCode: string, page: number, total: number) {
  const prev = Math.max(0, page - 1);
  const next = Math.min(total - 1, page + 1);
  const label = `${page + 1}/${total}`;
  const row: { text: string; callback_data: string }[] = [];
  if (total > 1) {
    row.push({
      text: "◀️ قبلی",
      callback_data: hubCb("p", shortCode, String(prev)),
    });
    row.push({ text: label, callback_data: hubCb("p", shortCode, String(page)) });
    row.push({
      text: "بعدی ▶️",
      callback_data: hubCb("p", shortCode, String(next)),
    });
  }
  return row.length > 0 ? { inline_keyboard: [row] } : undefined;
}

async function sendPagedHtmlReport(params: {
  actorTelegramId: string;
  title: string;
  htmlPages: string[];
}) {
  await pruneOldPagerSessions();
  const { htmlPages, actorTelegramId, title } = params;
  if (htmlPages.length === 0) {
    await sendAdminPlainTextMessage("داده‌ای برای نمایش نیست.");
    return;
  }
  const total = htmlPages.length;
  let shortCode = randomPagerCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.telegramPagerSession.create({
        data: {
          shortCode,
          actorTelegramId,
          pages: htmlPages as unknown as Prisma.InputJsonValue,
        },
      });
      break;
    } catch {
      shortCode = randomPagerCode();
    }
  }
  const page0 = htmlPages[0] ?? "";
  const markup = buildPagerKeyboard(shortCode, 0, total);
  await sendAdminHubDataMessage({
    text: page0,
    parse_mode: "HTML",
    reply_markup: markup,
  });
}

async function fetchDatasetBody(actionId: string): Promise<{ title: string; body: string }> {
  switch (actionId) {
    case "overview": {
      const overview = await getAdminOverview();
      return { title: "وضعیت لحظه‌ای", body: formatAdminOverviewForTelegram(overview) };
    }
    case "report_full": {
      const full = await buildTelegramDailyReportText();
      return { title: "گزارش کامل امروز", body: full };
    }
    case "reports_site": {
      const s = await formatAdminReportsSnippetForTelegram();
      return { title: "گزارش سایت", body: s };
    }
    case "pending_pay": {
      const s = await formatPendingPaymentsForTelegram();
      return { title: "پرداخت‌های معلق", body: s };
    }
    case "wait_account": {
      const s = await formatWaitingAccountOrdersForTelegram();
      return { title: "در انتظار اکانت", body: s };
    }
    case "wallet_topups": {
      const s = await formatPendingWalletTopUpsForTelegram();
      return { title: "شارژ کیف (معلق)", body: s };
    }
    case "open_chats": {
      const s = await formatOpenConversationsForTelegram();
      return { title: "چت‌های باز", body: s };
    }
    case "users": {
      const s = await formatRecentUsersForTelegram();
      return { title: "کاربران", body: s };
    }
    case "catalog": {
      const s = await formatCatalogInventoryForTelegram();
      return { title: "کاتالوگ", body: s };
    }
    case "wallets": {
      const s = await formatWalletsTelegramSummary();
      return { title: "کیف‌ها", body: s };
    }
    case "coupons": {
      const s = await formatCouponsTelegramSummary();
      return { title: "کوپن‌ها", body: s };
    }
    case "gift_cards": {
      const s = await formatGiftCardsTelegramSummary();
      return { title: "کارت هدیه", body: s };
    }
    case "referrals": {
      const s = await formatReferralsTelegramSummary();
      return { title: "رفرال", body: s };
    }
    default:
      throw new Error(`Unknown dataset action: ${actionId}`);
  }
}

async function runHubGoAction(actionId: string, actorTelegramId: string): Promise<void> {
  if (actionId === "plan_new") {
    await clearAllTelegramWizards(actorTelegramId);
    await startPlanCreateWizard(actorTelegramId);
    return;
  }
  if (actionId === "plan_list") {
    await clearAllTelegramWizards(actorTelegramId);
    await sendPlanListMessage();
    return;
  }
  if (actionId === "stock_add") {
    await startStockAddWizard(actorTelegramId);
    return;
  }
  if (actionId === "links") {
    await sendAdminPlainTextMessage("لینک همهٔ بخش‌های پنل:", {
      reply_markup: buildAdminMenuReplyMarkup(),
    });
    return;
  }
  if (actionId === "help") {
    await sendAdminPlainTextMessage(buildAdminWelcomeText(), {
      reply_markup: buildAdminReplyKeyboardMarkup(),
    });
    return;
  }
  if (actionId === "refresh_kb") {
    await sendAdminOnboardingKeyboardBundle();
    return;
  }

  const { title, body } = await fetchDatasetBody(actionId);
  if (!body.trim()) {
    await sendAdminPlainTextMessage(`${title}: داده‌ای نیست.`);
    return;
  }
  const htmlPages = buildHtmlPagesFromDataset(title, body);
  await sendPagedHtmlReport({ actorTelegramId, title, htmlPages });
}

function parseHubData(data: string):
  | { type: "back" }
  | { type: "cat"; catId: string }
  | { type: "go"; action: string }
  | { type: "page"; code: string; page: number }
  | null {
  if (!data.startsWith(`${HUB_PREFIX}|`)) {
    return null;
  }
  const parts = data.split("|");
  if (parts.length < 2) {
    return null;
  }
  if (parts[1] === "b") {
    return { type: "back" };
  }
  if (parts[1] === "c" && parts[2]) {
    return { type: "cat", catId: parts[2] };
  }
  if (parts[1] === "g" && parts[2]) {
    return { type: "go", action: parts[2] };
  }
  if (parts[1] === "p" && parts[2] && parts[3] !== undefined) {
    const page = Number.parseInt(parts[3], 10);
    if (!Number.isFinite(page) || page < 0) {
      return null;
    }
    return { type: "page", code: parts[2], page };
  }
  return null;
}

const hubRootHtml =
  "<b>📂 منوی مدیریت</b>\nیک <b>دسته</b> را انتخاب کنید؛ بعد داخل همان دسته گزارش را بزنید.\n\n<i>داده‌های بلند چند صفحه می‌شوند.</i>";

export async function sendAdminHubRootMessage() {
  await sendAdminHubDataMessage({
    text: hubRootHtml,
    parse_mode: "HTML",
    reply_markup: buildAdminHubRootKeyboard(),
  });
}

export async function tryHandleTelegramAdminHubCallback(params: {
  callbackQueryId: string;
  data: string;
  messageChatId: string;
  messageId: number;
  actorTelegramId: string;
}): Promise<boolean> {
  const parsed = parseHubData(params.data);
  if (!parsed) {
    return false;
  }

  if (parsed.type === "back") {
    await answerTelegramCallbackSafe(params.callbackQueryId, "منوی دسته‌ها");
    await editAdminHubMessage({
      chatId: params.messageChatId,
      messageId: params.messageId,
      text: hubRootHtml,
      parse_mode: "HTML",
      reply_markup: buildAdminHubRootKeyboard(),
    });
    return true;
  }

  if (parsed.type === "cat") {
    const cat = getCategory(parsed.catId);
    if (!cat) {
      await answerTelegramCallbackSafe(params.callbackQueryId, "دسته نامعتبر", { showAlert: true });
      return true;
    }
    await answerTelegramCallbackSafe(params.callbackQueryId, cat.title);
    const subHtml = `<b>${cat.title}</b>\nیک مورد را بزنید:`;
    await editAdminHubMessage({
      chatId: params.messageChatId,
      messageId: params.messageId,
      text: subHtml,
      parse_mode: "HTML",
      reply_markup: buildSubmenuKeyboard(parsed.catId),
    });
    return true;
  }

  if (parsed.type === "go") {
    await answerTelegramCallbackSafe(params.callbackQueryId, "در حال بارگذاری…");
    try {
      await runHubGoAction(parsed.action, params.actorTelegramId);
    } catch (error) {
      console.error("[telegram hub] go action failed:", error);
      await sendAdminPlainTextMessage("خطا در گرفتن داده. دوباره تلاش کنید.");
    }
    return true;
  }

  if (parsed.type === "page") {
    const session = await prisma.telegramPagerSession.findUnique({
      where: { shortCode: parsed.code },
    });
    if (!session || session.actorTelegramId !== params.actorTelegramId) {
      await answerTelegramCallbackSafe(params.callbackQueryId, "نشست منقضی یا نامعتبر است.", { showAlert: true });
      return true;
    }
    const pages = session.pages as unknown as string[];
    if (!Array.isArray(pages) || pages.length === 0) {
      await answerTelegramCallbackSafe(params.callbackQueryId, "بدون صفحه", { showAlert: true });
      return true;
    }
    const total = pages.length;
    const idx = Math.min(Math.max(0, parsed.page), total - 1);
    const text = pages[idx] ?? "";
    const markup = buildPagerKeyboard(parsed.code, idx, total);
    await answerTelegramCallbackSafe(params.callbackQueryId, `صفحه ${idx + 1} از ${total}`);
    await editAdminHubMessage({
      chatId: params.messageChatId,
      messageId: params.messageId,
      text,
      parse_mode: "HTML",
      reply_markup: markup,
    });
    return true;
  }

  return false;
}

/** برای set: آیا این callback مربوط به هاب است؟ */
export function isTelegramAdminHubCallback(data: string): boolean {
  return data.startsWith(`${HUB_PREFIX}|`);
}
