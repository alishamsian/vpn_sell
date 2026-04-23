type TelegramMessage = {
  message_id: number;
};

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  return {
    botToken,
    adminChatId,
    secretToken,
  };
}

function getTelegramApiUrl(method: string) {
  const { botToken } = getTelegramConfig();

  if (!botToken) {
    throw new Error("ربات تلگرام تنظیم نشده است.");
  }

  return `https://api.telegram.org/bot${botToken}/${method}`;
}

export function isTelegramConfigured() {
  const { botToken, adminChatId } = getTelegramConfig();

  return Boolean(botToken && adminChatId);
}

function humanizeTelegramApiError(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes("bots can't send messages to bots")) {
    return [
      "تلگرام: ربات‌ها نمی‌توانند به ربات دیگر پیام بفرستند.",
      "مقدار TELEGRAM_ADMIN_CHAT_ID باید آیدی عددی «شخص شما» (ادمین انسان) یا یک «گروه/کانال» باشد که ربات عضو آن است؛",
      "نه توکن ربات و نه چت با خودِ ربات. آیدی خود را از ربات‌هایی مثل @userinfobot بگیرید و در env بگذارید.",
    ].join(" ");
  }

  return description;
}

async function telegramRequest<T>(method: string, body: BodyInit, isFormData = false): Promise<T> {
  const response = await fetch(getTelegramApiUrl(method), {
    method: "POST",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body,
  });

  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };

  if (!response.ok || !payload.ok || !payload.result) {
    const raw = payload.description ?? "درخواست تلگرام ناموفق بود.";
    throw new Error(humanizeTelegramApiError(raw));
  }

  return payload.result;
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

function buildInlineKeyboard(paymentId: string) {
  return {
    inline_keyboard: [
      [
        { text: "تایید پرداخت", callback_data: `approve:${paymentId}` },
        { text: "رد پرداخت", callback_data: `reject:${paymentId}` },
      ],
    ],
  };
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
  formData.set("reply_markup", JSON.stringify(buildInlineKeyboard(params.paymentId)));
  return formData;
}

/** پیام متنی به چت ادمین (برای پل چت سایت ↔ تلگرام) */
export async function sendAdminPlainTextMessage(text: string) {
  const { adminChatId } = getTelegramConfig();

  if (!adminChatId || !isTelegramConfigured()) {
    throw new Error("تنظیمات تلگرام کامل نیست.");
  }

  return telegramRequest<TelegramMessage>(
    "sendMessage",
    JSON.stringify({
      chat_id: adminChatId,
      text: text.slice(0, 4090),
      disable_web_page_preview: true,
    }),
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

export async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
  options?: { showAlert?: boolean },
) {
  await telegramRequest(
    "answerCallbackQuery",
    JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text.slice(0, 200),
      show_alert: Boolean(options?.showAlert),
    }),
  );
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
