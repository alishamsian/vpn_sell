type TelegramMessage = {
  message_id: number;
};

function stripEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

function getTelegramConfig() {
  const botToken = stripEnvValue(process.env.TELEGRAM_BOT_TOKEN);
  const adminChatId = stripEnvValue(process.env.TELEGRAM_ADMIN_CHAT_ID);
  const secretToken = stripEnvValue(process.env.TELEGRAM_WEBHOOK_SECRET);

  return {
    botToken,
    adminChatId,
    secretToken,
  };
}

/** برای وب‌هوک: آیدی ادمین بعد از trim و حذف نقل‌قول‌های اضافی env */
export function getTelegramAdminChatIdNormalized(): string | undefined {
  return getTelegramConfig().adminChatId;
}

export function getTelegramWebhookSecretNormalized(): string | undefined {
  return getTelegramConfig().secretToken;
}

export async function fetchTelegramWebhookInfo(): Promise<{
  ok: boolean;
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
  allowed_updates?: string[];
  error?: string;
}> {
  const { botToken } = getTelegramConfig();
  if (!botToken) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN خالی است." };
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const body = (await res.json()) as {
    ok: boolean;
    result?: {
      url?: string;
      pending_update_count?: number;
      last_error_message?: string;
      last_error_date?: number;
      allowed_updates?: string[];
    };
  };
  if (!body.ok || !body.result) {
    return { ok: false, error: "getWebhookInfo ناموفق بود." };
  }
  const r = body.result;
  return {
    ok: true,
    url: r.url,
    pending_update_count: r.pending_update_count,
    last_error_message: r.last_error_message,
    last_error_date: r.last_error_date,
    allowed_updates: r.allowed_updates,
  };
}

export async function setTelegramWebhook(params: {
  webhookUrl: string;
  secretToken?: string | null;
  allowedUpdates?: string[];
}) {
  const { botToken } = getTelegramConfig();
  if (!botToken) {
    return { ok: false as const, error: "TELEGRAM_BOT_TOKEN خالی است." };
  }

  const allowed_updates = params.allowedUpdates ?? ["callback_query", "message"];
  const payload: Record<string, unknown> = {
    url: params.webhookUrl,
    allowed_updates,
  };

  const secret = (params.secretToken ?? "").trim();
  if (secret) {
    payload.secret_token = secret;
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as { ok: boolean; description?: string };
  if (!res.ok || !body.ok) {
    return { ok: false as const, error: humanizeTelegramApiError(body.description ?? "setWebhook ناموفق بود.") };
  }

  return { ok: true as const };
}

function getTelegramApiUrl(method: string) {
  const { botToken } = getTelegramConfig();

  if (!botToken) {
    throw new Error("ربات تلگرام تنظیم نشده است.");
  }

  return `https://api.telegram.org/bot${botToken}/${method}`;
}

export function getAppBaseUrl() {
  const explicit = stripEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const prod = stripEnvValue(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (prod) {
    return `https://${prod.replace(/\/$/, "")}`;
  }

  const vercel = stripEnvValue(process.env.VERCEL_URL);
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "";
}

export function isTelegramConfigured() {
  const { botToken, adminChatId } = getTelegramConfig();

  return Boolean(botToken && adminChatId);
}

function humanizeTelegramApiError(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes("too many requests") || lower.includes("flood")) {
    return "تلگرام محدودیت نرخ اعمال کرده؛ چند لحظه بعد دوباره تلاش کنید.";
  }

  if (lower.includes("bots can't send messages to bots")) {
    return [
      "تلگرام: ربات‌ها نمی‌توانند به ربات دیگر پیام بفرستند.",
      "مقدار TELEGRAM_ADMIN_CHAT_ID باید آیدی عددی «شخص شما» (ادمین انسان) یا یک «گروه/کانال» باشد که ربات عضو آن است؛",
      "نه توکن ربات و نه چت با خودِ ربات. آیدی خود را از ربات‌هایی مثل @userinfobot بگیرید و در env بگذارید.",
    ].join(" ");
  }

  return description;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type TelegramApiPayload<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  parameters?: { retry_after?: number };
};

async function telegramRequest<T>(method: string, body: BodyInit, isFormData = false): Promise<T> {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(getTelegramApiUrl(method), {
        method: "POST",
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        body,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const networkish =
        err.name === "AbortError" ||
        err.message.includes("fetch failed") ||
        err.message.includes("ECONNRESET") ||
        err.message.includes("ETIMEDOUT");
      if (networkish && attempt < maxAttempts) {
        await sleep(350 * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }

    let payload: TelegramApiPayload<T>;
    try {
      payload = (await response.json()) as TelegramApiPayload<T>;
    } catch {
      if (attempt < maxAttempts && (response.status >= 500 || response.status === 429)) {
        await sleep(400 * attempt);
        continue;
      }
      throw new Error("پاسخ JSON تلگرام نامعتبر بود.");
    }

    const desc = (payload.description ?? "").toLowerCase();
    const retryAfterSec =
      typeof payload.parameters?.retry_after === "number" ? payload.parameters.retry_after : null;
    const httpRetryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
    const floodWait = retryAfterSec != null && retryAfterSec > 0;
    const descRetryable =
      desc.includes("too many requests") ||
      desc.includes("retry after") ||
      desc.includes("bad gateway") ||
      desc.includes("service unavailable");

    if (!payload.ok && (httpRetryable || floodWait || descRetryable) && attempt < maxAttempts) {
      const baseMs = retryAfterSec != null ? retryAfterSec * 1000 : 500 * 2 ** (attempt - 1);
      await sleep(Math.min(25_000, baseMs + 80 * attempt));
      continue;
    }

    if (!response.ok || !payload.ok) {
      const raw = payload.description ?? `HTTP ${response.status}`;
      throw new Error(humanizeTelegramApiError(raw));
    }

    if (payload.result === undefined || payload.result === null) {
      throw new Error(humanizeTelegramApiError(payload.description ?? "نتیجهٔ خالی از تلگرام."));
    }

    return payload.result;
  }

  throw new Error("تلگرام پس از چند تلاش پاسخ نداد.");
}

function buildCaption(params: {
  orderId: string;
  userName: string;
  email?: string | null;
  phone?: string | null;
  planName: string;
  amount: string;
  trackingCode: string;
  cardLast4: string;
}) {
  const { amount, cardLast4, email, orderId, phone, planName, trackingCode, userName } = params;

  return [
    "رسید جدید برای بررسی",
    `سفارش: ${orderId}`,
    `کاربر: ${userName}`,
    `ایمیل: ${email ?? "-"}`,
    `موبایل: ${phone ?? "-"}`,
    `پلن: ${planName}`,
    `مبلغ: ${amount}`,
    `کد پیگیری: ${trackingCode}`,
    `۴ رقم آخر کارت: ${cardLast4}`,
  ].join("\n");
}

function buildInlineKeyboard(params: { paymentId: string; orderId: string }) {
  void params.orderId;
  const base = getAppBaseUrl();
  const paymentsUrl = base ? `${base}/admin/payments` : null;
  const adminUrl = base ? `${base}/admin` : null;
  const chatUrl = base ? `${base}/admin/chat` : null;
  const telegramPanelUrl = base ? `${base}/admin/telegram` : null;

  const linkRow = [
    ...(adminUrl ? [{ text: "داشبورد", url: adminUrl }] : []),
    ...(chatUrl ? [{ text: "چت", url: chatUrl }] : []),
    ...(telegramPanelUrl ? [{ text: "وب‌هوک تلگرام", url: telegramPanelUrl }] : []),
  ];

  return {
    inline_keyboard: [
      [
        { text: "تایید پرداخت", callback_data: `approve:${params.paymentId}` },
        { text: "رد پرداخت", callback_data: `reject:${params.paymentId}` },
      ],
      [
        { text: "رد با دلیل (Reply کن)", callback_data: `need_reason:${params.paymentId}` },
        { text: "نیاز به اطلاعات بیشتر", callback_data: `need_info:${params.paymentId}` },
      ],
      [
        { text: "درخواست ارسال مجدد رسید", callback_data: `request_resubmit:${params.paymentId}` },
        ...(paymentsUrl ? [{ text: "پنل پرداخت‌ها", url: paymentsUrl }] : []),
      ],
      ...(linkRow.length > 0 ? [linkRow] : []),
    ].filter((row) => row.length > 0),
  };
}

/** برچسب‌های دکمهٔ پایین صفحه (Reply Keyboard) — باید با متن دریافتی وب‌هوک یکی باشد. */
export const TELEGRAM_ADMIN_REPLY_LABELS = {
  STATUS: "📊 وضعیت لحظه‌ای",
  REPORT_FULL: "📈 گزارش کامل امروز",
  LINKS: "🔗 لینک‌های پنل",
  HELP: "📋 راهنما و دستورات",
  REFRESH: "🔄 بروزرسانی منو",
  PENDING_PAYMENTS: "⏳ پرداخت‌های معلق",
  WAITING_ACCOUNT: "📦 در انتظار اکانت",
  OPEN_CHATS: "💬 چت‌های باز",
  USERS: "🧑‍💼 کاربران",
  WALLET_TOPUPS: "💳 شارژ کیف (معلق)",
  CATALOG: "📦 کاتالوگ",
  PLAN_NEW: "➕ پلن جدید",
  PLAN_LIST: "📋 لیست پلن‌ها",
  COUPONS: "🎟 کوپن‌ها",
  REPORTS_SITE: "📉 گزارش‌ها",
  WALLETS: "👛 کیف‌ها",
  GIFT_CARDS: "🎁 هدیه",
  REFERRALS: "🔗 رفرال",
  CLOSE_KB: "❌ بستن دکمه‌های پایین",
} as const;

export type TelegramAdminReplyLabel =
  (typeof TELEGRAM_ADMIN_REPLY_LABELS)[keyof typeof TELEGRAM_ADMIN_REPLY_LABELS];

/** منوی پایین صفحه (ظاهر دکمهٔ شیشه‌ای تلگرام). */
export function buildAdminReplyKeyboardMarkup(): Record<string, unknown> {
  const L = TELEGRAM_ADMIN_REPLY_LABELS;
  const base = getAppBaseUrl();
  const webPanelRow =
    base.length > 0
      ? [[{ text: "🖥 پنل کامل (تلگرام)", web_app: { url: `${base}/auth/telegram-webapp` } }]]
      : [];

  return {
    keyboard: [
      ...webPanelRow,
      [L.STATUS, L.REPORT_FULL],
      [L.PENDING_PAYMENTS, L.WAITING_ACCOUNT],
      [L.OPEN_CHATS, L.LINKS],
      [L.USERS, L.CATALOG],
      [L.PLAN_NEW, L.PLAN_LIST],
      [L.WALLET_TOPUPS, L.COUPONS],
      [L.REPORTS_SITE, L.WALLETS],
      [L.GIFT_CARDS, L.REFERRALS],
      [L.HELP, L.REFRESH],
      [L.CLOSE_KB],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: "Reply به رسید یا پیام چت کاربر…",
  };
}

export function buildReplyKeyboardRemove(): Record<string, unknown> {
  return { remove_keyboard: true };
}

/** متن خوش‌آمد برای ادمین (دستورات /start و /help). */
export function buildAdminWelcomeText() {
  return [
    "سلام؛ این ربات برای مدیریت سایت است.",
    "",
    "• روی پیام رسید Reply بزنید و متن بفرستید = رد با همان متن (به کاربر نشان داده می‌شود).",
    "  برای تایید سریع همان Reply را با کلمهٔ approve یا تایید بفرستید.",
    "• از دکمه‌های زیر هر رسید برای تایید/رد و اقدام‌های دیگر استفاده کنید.",
    "• از دکمه‌های پایین صفحه برای آمار، لیست‌ها و لینک همهٔ بخش‌های پنل استفاده کنید.",
    "• دکمهٔ «پنل کامل» همان UI وب ادمین را داخل تلگرام باز می‌کند (بعد از /setdomain در BotFather).",
    "",
    "دستورات: /start یا /menu — منو | /report — آمار | /panel — دکمه‌های لینک پنل (فقط وقتی لازم داری)",
    "پلن‌ها: /plannew — ساخت | /planlist یا /plans — لیست و ویرایش | /plancancel — لغو ویزارد",
  ].join("\n");
}

type AdminInlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string }
  | { text: string; web_app: { url: string } };

/** لینک اینلاین به همهٔ صفحات اصلی پنل ادمین. */
export function buildAdminFullPanelInlineMarkup(): {
  inline_keyboard: AdminInlineButton[][];
} {
  const base = getAppBaseUrl();
  if (!base) {
    return {
      inline_keyboard: [
        [
          {
            text: "دامنه ست نشد — NEXT_PUBLIC_APP_URL",
            callback_data: "admin_menu",
          },
        ],
      ],
    };
  }

  const u = (path: string) => `${base}${path}`;
  const webAppUrl = `${base}/auth/telegram-webapp`;

  return {
    inline_keyboard: [
      [{ text: "🖥 پنل کامل در تلگرام", web_app: { url: webAppUrl } }],
      [
        { text: "🏠 داشبورد", url: u("/admin") },
        { text: "💳 پرداخت‌ها", url: u("/admin/payments") },
      ],
      [
        { text: "💬 چت", url: u("/admin/chat") },
        { text: "🧑‍💼 کاربران", url: u("/admin/users") },
      ],
      [
        { text: "📦 کاتالوگ", url: u("/admin/catalog") },
        { text: "🎟 کوپن‌ها", url: u("/admin/coupons") },
      ],
      [
        { text: "📉 گزارش‌ها", url: u("/admin/reports") },
        { text: "👛 کیف‌ها", url: u("/admin/wallets") },
      ],
      [
        { text: "💳 شارژ کیف", url: u("/admin/wallet-topups") },
        { text: "🎁 کارت هدیه", url: u("/admin/gift-cards") },
      ],
      [
        { text: "🔗 رفرال", url: u("/admin/referrals") },
        { text: "🤖 تلگرام", url: u("/admin/telegram") },
      ],
    ],
  };
}

/** دکمه‌های میان‌خطی لینک به پنل و بازگردانی منو. */
export function buildAdminMenuReplyMarkup() {
  return buildAdminFullPanelInlineMarkup();
}

/** دستورات پیشنهادی ربات در منوی تلگرام (پس از setWebhook یک‌بار صدا زده می‌شود). */
export async function setTelegramBotCommands() {
  if (!getTelegramConfig().botToken) {
    return { ok: false as const, error: "TELEGRAM_BOT_TOKEN خالی است." };
  }

  const commands = [
    { command: "start", description: "منوی ادمین، دکمه‌های پایین و لینک پنل" },
    { command: "help", description: "راهنمای کوتاه ربات" },
    { command: "menu", description: "نمایش مجدد منو و دکمه‌های پایین" },
    { command: "report", description: "خلاصه وضعیت (پرداخت، چت، …)" },
    { command: "links", description: "همان لینک‌های کامل پنل" },
    { command: "panel", description: "لینک همهٔ بخش‌های پنل ادمین" },
    { command: "plannew", description: "شروع ساخت پلن جدید (ویزارد در چت)" },
    { command: "planlist", description: "لیست پلن‌ها و دکمهٔ ویرایش" },
    { command: "plans", description: "همان planlist" },
    { command: "plancancel", description: "لغو ویزارد ساخت یا ویرایش پلن" },
  ];

  await telegramRequest<true>("setMyCommands", JSON.stringify({ commands }));
  return { ok: true as const };
}

function sniffImageMimeFromBytes(bytes: Uint8Array): { mime: string; ext: string } {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return { mime: "image/jpeg", ext: "jpg" };
}

type ReceiptUploadFile = {
  /** باید از ArrayBuffer ساخته شود تا FormData در Node به‌درستی multipart فایل بفرستد (نه رشتهٔ file_id). */
  file: File;
};

/**
 * تصویر رسید را روی همین سرور می‌خواند و به‌صورت فایل برای sendPhoto آماده می‌کند.
 * ارسال فقط با URL به تلگرام اغلب با لینک امضای کوتاه‌عمر Supabase یا data URL شکست می‌خورد
 * چون سرورهای تلگرام باید خودشان آن URL را باز کنند.
 */
async function loadReceiptImageForTelegramUpload(receiptUrl: string): Promise<ReceiptUploadFile> {
  let bytes: Uint8Array;
  let declaredMime: string | null = null;

  if (receiptUrl.startsWith("data:")) {
    const semi = receiptUrl.indexOf(";");
    const comma = receiptUrl.indexOf(",", semi + 1);
    if (semi < 5 || comma < 0) {
      throw new Error("قالب تصویر رسید (data URL) نامعتبر است.");
    }
    declaredMime = receiptUrl.slice(5, semi).trim() || "image/jpeg";
    const meta = receiptUrl.slice(semi + 1, comma).toLowerCase();
    if (!meta.includes("base64")) {
      throw new Error("فقط تصویر base64 برای ارسال به تلگرام پشتیبانی می‌شود.");
    }
    const b64 = receiptUrl.slice(comma + 1);
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) {
      throw new Error("فایل رسید خالی است.");
    }
    bytes = new Uint8Array(buf);
  } else if (receiptUrl.startsWith("http://") || receiptUrl.startsWith("https://")) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(receiptUrl, { redirect: "follow", signal: controller.signal });
      if (!res.ok) {
        throw new Error(`دانلود رسید برای تلگرام ناموفق بود (${res.status}).`);
      }
      const ab = await res.arrayBuffer();
      bytes = new Uint8Array(ab);
      declaredMime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
      if (bytes.length === 0) {
        throw new Error("فایل رسید خالی است.");
      }
      if (bytes.length > 10 * 1024 * 1024) {
        throw new Error("حجم رسید برای تلگرام زیاد است (حدوداً بیش از ۱۰ مگابایت).");
      }
    } finally {
      clearTimeout(timeout);
    }
  } else {
    throw new Error("آدرس رسید برای تلگرام نامعتبر است؛ باید https یا data:image باشد.");
  }

  const sniffed = sniffImageMimeFromBytes(bytes);
  const mime =
    declaredMime && /^image\/(jpeg|jpg|png|webp)$/i.test(declaredMime)
      ? declaredMime.toLowerCase().replace("image/jpg", "image/jpeg")
      : sniffed.mime;
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : sniffed.ext;
  const filename = `receipt.${ext}`;

  const file = new File([Buffer.from(bytes)], filename, { type: mime });
  return { file };
}

function buildPaymentTelegramFormData(params: {
  adminChatId: string;
  paymentId: string;
  orderId: string;
  userName: string;
  email?: string | null;
  phone?: string | null;
  planName: string;
  amount: string;
  trackingCode: string;
  cardLast4: string;
  file: File;
  /** sendPhoto → photo | sendDocument → document */
  fileField: "photo" | "document";
}) {
  const formData = new FormData();
  formData.set("chat_id", params.adminChatId);
  formData.set(
    "caption",
    buildCaption({
      amount: params.amount,
      cardLast4: params.cardLast4,
      email: params.email,
      orderId: params.orderId,
      phone: params.phone,
      planName: params.planName,
      trackingCode: params.trackingCode,
      userName: params.userName,
    }),
  );
  formData.append(params.fileField, params.file, params.file.name);
  formData.set("reply_markup", JSON.stringify(buildInlineKeyboard({ paymentId: params.paymentId, orderId: params.orderId })));
  return formData;
}

/** پیام متنی به چت ادمین (برای پل چت سایت ↔ تلگرام) */
export async function sendAdminPlainTextMessage(
  text: string,
  options?: { reply_markup?: Record<string, unknown> },
) {
  const { adminChatId } = getTelegramConfig();

  if (!adminChatId || !isTelegramConfigured()) {
    throw new Error("تنظیمات تلگرام کامل نیست.");
  }

  const payload: Record<string, unknown> = {
    chat_id: adminChatId,
    text: text.slice(0, 4090),
    disable_web_page_preview: true,
  };
  if (options?.reply_markup) {
    payload.reply_markup = options.reply_markup;
  }

  return telegramRequest<TelegramMessage>("sendMessage", JSON.stringify(payload));
}

/** خوش‌آمد + Reply Keyboard (بدون تکرار دکمهٔ اینلاین زیر هر پیام). */
export async function sendAdminOnboardingKeyboardBundle() {
  await sendAdminPlainTextMessage(
    [
      buildAdminWelcomeText(),
      "",
      "برای دکمه‌های لینک به همهٔ بخش‌های پنل دستور /panel را بفرستید.",
    ].join("\n"),
    { reply_markup: buildAdminReplyKeyboardMarkup() },
  );
}

export async function sendPaymentToTelegram(params: {
  paymentId: string;
  orderId: string;
  userName: string;
  email?: string | null;
  phone?: string | null;
  planName: string;
  amount: string;
  trackingCode: string;
  cardLast4: string;
  receiptUrl: string;
}) {
  const { adminChatId } = getTelegramConfig();

  if (!adminChatId || !isTelegramConfigured()) {
    throw new Error("تنظیمات تلگرام کامل نیست.");
  }

  const { file } = await loadReceiptImageForTelegramUpload(params.receiptUrl);

  const common = {
    adminChatId,
    paymentId: params.paymentId,
    orderId: params.orderId,
    userName: params.userName,
    email: params.email,
    phone: params.phone,
    planName: params.planName,
    amount: params.amount,
    trackingCode: params.trackingCode,
    cardLast4: params.cardLast4,
    file,
  };

  try {
    return await telegramRequest<TelegramMessage>(
      "sendPhoto",
      buildPaymentTelegramFormData({ ...common, fileField: "photo" }),
      true,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const retryAsDocument =
      message.includes("wrong remote file identifier") ||
      message.includes("Wrong padding") ||
      message.includes("can't use file of type");

    if (!retryAsDocument) {
      throw error;
    }

    return telegramRequest<TelegramMessage>(
      "sendDocument",
      buildPaymentTelegramFormData({ ...common, fileField: "document" }),
      true,
    );
  }
}

export async function sendAdminPaymentOutcomeMessage(params: {
  decision: "approve" | "reject";
  orderId: string;
  paymentId: string;
  userName: string;
  planName: string;
  reviewNote?: string | null;
}) {
  if (!isTelegramConfigured()) {
    return;
  }

  const base = getAppBaseUrl();
  const paymentsLink = base ? `${base}/admin/payments` : null;
  const telegramPanel = base ? `${base}/admin/telegram` : null;

  const lines = [
    "نتیجه بررسی پرداخت",
    "────────────",
    `وضعیت: ${params.decision === "approve" ? "تایید شد" : "رد شد"}`,
    `سفارش: ${params.orderId}`,
    `کاربر: ${params.userName}`,
    `پلن: ${params.planName}`,
    params.decision === "reject" && params.reviewNote ? `دلیل: ${params.reviewNote}` : null,
    "",
    paymentsLink ? `پنل پرداخت‌ها: ${paymentsLink}` : null,
    telegramPanel ? `تنظیمات تلگرام: ${telegramPanel}` : null,
    "",
    "برای منوی لینک‌ها: /panel",
  ].filter(Boolean);

  await sendAdminPlainTextMessage(lines.join("\n"));
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
  options?: { showAlert?: boolean },
) {
  await telegramRequest(
    "answerCallbackQuery",
    JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text.length > 0 ? text.slice(0, 200) : "انجام شد.",
      show_alert: Boolean(options?.showAlert),
    }),
  );
}

/** پاسخ به تلگرام نباید کل درخواست را بترکاند؛ خطا فقط لاگ می‌شود. */
export async function answerTelegramCallbackSafe(
  callbackQueryId: string | undefined,
  text: string,
  options?: { showAlert?: boolean },
) {
  if (!callbackQueryId) {
    return;
  }
  try {
    await answerTelegramCallback(callbackQueryId, text, options);
  } catch (error) {
    console.error("[telegram] answerCallbackQuery failed:", error);
  }
}

export async function editTelegramMessage(params: {
  chatId: string;
  messageId: number;
  caption: string;
}) {
  await telegramRequest(
    "editMessageCaption",
    JSON.stringify({
      chat_id: params.chatId,
      message_id: params.messageId,
      caption: params.caption,
      reply_markup: {
        inline_keyboard: [],
      },
    }),
  );
}

/**
 * اگر TELEGRAM_WEBHOOK_SECRET در env خالی باشد، هدر را چک نمی‌کنیم تا وب‌هوک بدون secret_token در BotFather هم کار کند.
 * برای production توصیه می‌شود secret را حتماً ست و در setWebhook بفرستید.
 */
export function validateTelegramSecret(request: Request) {
  const expected = getTelegramConfig().secretToken;

  if (!expected) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}
