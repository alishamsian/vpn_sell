type TelegramMessage = {
  message_id: number;
};

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

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

async function telegramRequest<T>(method: string, body: BodyInit, isFormData = false): Promise<T> {
  const response = await fetch(getTelegramApiUrl(method), {
    method: "POST",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body,
  });

  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };

  if (!response.ok || !payload.ok || !payload.result) {
    throw new Error(payload.description ?? "درخواست تلگرام ناموفق بود.");
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

  const formData = new FormData();
  formData.set("chat_id", adminChatId);
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
  formData.set("photo", params.receiptUrl);
  formData.set("reply_markup", JSON.stringify(buildInlineKeyboard(params.paymentId)));

  return telegramRequest<TelegramMessage>("sendPhoto", formData, true);
}

export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  await telegramRequest(
    "answerCallbackQuery",
    JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
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

export function validateTelegramSecret(request: Request) {
  const expected = getTelegramConfig().secretToken;

  if (!expected) {
    return false;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}
