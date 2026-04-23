import { NextResponse } from "next/server";

import { sendConversationMessage } from "@/lib/chat";
import {
  answerTelegramCallbackSafe,
  buildAdminMenuReplyMarkup,
  buildAdminReplyKeyboardMarkup,
  buildAdminWelcomeText,
  buildReplyKeyboardRemove,
  editTelegramMessage,
  fetchTelegramWebhookInfo,
  getTelegramAdminChatIdNormalized,
  getTelegramWebhookSecretNormalized,
  sendAdminOnboardingKeyboardBundle,
  sendAdminPaymentOutcomeMessage,
  sendAdminPlainTextMessage,
  TELEGRAM_ADMIN_REPLY_LABELS,
  validateTelegramSecret,
} from "@/lib/telegram";
import { reviewPayment } from "@/lib/orders";
import { buildTelegramDailyReportText } from "@/lib/telegram-daily-report";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type TelegramInboundMessage = {
  message_id?: number;
  chat?: { id: number };
  text?: string;
  reply_to_message?: { message_id: number };
  from?: { id: number; is_bot?: boolean };
};

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    from?: {
      id: number;
    };
    message?: {
      message_id: number;
      chat?: {
        id: number;
      };
      caption?: string;
    };
  };
  message?: TelegramInboundMessage;
};

function isInboundTelegramAdmin(message: TelegramInboundMessage) {
  const adminChatId = getTelegramAdminChatIdNormalized();
  if (!adminChatId) {
    return false;
  }
  const chatId = message.chat?.id != null ? String(message.chat.id) : "";
  const fromId = message.from?.id != null ? String(message.from.id) : "";
  return chatId === adminChatId || fromId === adminChatId;
}

const ADMIN_REPLY_LABEL_SET = new Set<string>(Object.values(TELEGRAM_ADMIN_REPLY_LABELS));

/** دکمه‌های پایین صفحه (Reply Keyboard) — قبل از دستورات / و قبل از Reply به رسید/چت. */
async function handleTelegramAdminReplyKeyboard(message: TelegramInboundMessage): Promise<boolean> {
  if (!isInboundTelegramAdmin(message) || message.from?.is_bot) {
    return false;
  }

  if (message.reply_to_message != null) {
    return false;
  }

  const text = message.text?.trim();
  if (!text || !ADMIN_REPLY_LABEL_SET.has(text)) {
    return false;
  }

  const L = TELEGRAM_ADMIN_REPLY_LABELS;

  if (text === L.CLOSE_KB) {
    await sendAdminPlainTextMessage(
      "دکمه‌های پایین بسته شد. با /start دوباره باز کنید.",
      { reply_markup: buildReplyKeyboardRemove() },
    );
    return true;
  }

  if (text === L.LINKS) {
    await sendAdminPlainTextMessage("لینک همهٔ بخش‌های پنل:", {
      reply_markup: buildAdminMenuReplyMarkup(),
    });
    return true;
  }

  if (text === L.HELP) {
    await sendAdminPlainTextMessage(buildAdminWelcomeText(), {
      reply_markup: buildAdminReplyKeyboardMarkup(),
    });
    return true;
  }

  if (text === L.REFRESH) {
    await sendAdminOnboardingKeyboardBundle();
    return true;
  }

  if (text === L.STATUS) {
    const overview = await getAdminOverview();
    await sendAdminPlainTextMessage(formatAdminOverviewForTelegram(overview));
    return true;
  }

  if (text === L.REPORT_FULL) {
    const full = await buildTelegramDailyReportText();
    await sendAdminPlainTextMessage(full.slice(0, 4090));
    return true;
  }

  if (text === L.PENDING_PAYMENTS) {
    const s = await formatPendingPaymentsForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.WAITING_ACCOUNT) {
    const s = await formatWaitingAccountOrdersForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.OPEN_CHATS) {
    const s = await formatOpenConversationsForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.USERS) {
    const s = await formatRecentUsersForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.WALLET_TOPUPS) {
    const s = await formatPendingWalletTopUpsForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.CATALOG) {
    const s = await formatCatalogInventoryForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.COUPONS) {
    const s = await formatCouponsTelegramSummary();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.REPORTS_SITE) {
    const s = await formatAdminReportsSnippetForTelegram();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.WALLETS) {
    const s = await formatWalletsTelegramSummary();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.GIFT_CARDS) {
    const s = await formatGiftCardsTelegramSummary();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  if (text === L.REFERRALS) {
    const s = await formatReferralsTelegramSummary();
    await sendAdminPlainTextMessage(s.slice(0, 4090));
    return true;
  }

  return false;
}

async function handleTelegramAdminCommands(message: TelegramInboundMessage): Promise<boolean> {
  if (!isInboundTelegramAdmin(message) || message.from?.is_bot) {
    return false;
  }

  const raw = message.text?.trim() ?? "";
  if (!raw.startsWith("/")) {
    return false;
  }

  const first = (raw.split(/\s+/)[0] ?? "").toLowerCase();
  const cmd = first.replace(/@\w+$/, "");

  if (cmd === "/start" || cmd === "/help" || cmd === "/menu") {
    await sendAdminOnboardingKeyboardBundle();
    return true;
  }

  if (cmd === "/links" || cmd === "/panel") {
    await sendAdminPlainTextMessage("لینک همهٔ بخش‌های پنل ادمین:", {
      reply_markup: buildAdminMenuReplyMarkup(),
    });
    return true;
  }

  if (cmd === "/report") {
    const overview = await getAdminOverview();
    await sendAdminPlainTextMessage(formatAdminOverviewForTelegram(overview));
    return true;
  }

  return false;
}

async function handleTelegramAdminTextReply(message: TelegramInboundMessage) {
  if (!isInboundTelegramAdmin(message)) {
    return;
  }

  if (message.from?.is_bot) {
    return;
  }

  const replyToId = message.reply_to_message?.message_id;
  const text = message.text?.trim();

  if (!replyToId || !text || text.startsWith("/")) {
    return;
  }

  // 1) Reply to a payment receipt message → treat as rejection reason (or commands)
  const paymentByTelegramMessage = await prisma.payment.findFirst({
    where: { telegramMessageId: String(replyToId) },
    include: {
      order: {
        include: {
          plan: true,
          user: true,
        },
      },
    },
  });

  if (paymentByTelegramMessage) {
    const command = text.toLowerCase();
    const decision: "approve" | "reject" =
      command === "approve" || command === "تایید" || command === "تأیید" ? "approve" : "reject";
    const note =
      decision === "reject"
        ? text
        : "تایید از تلگرام (Reply)";

    const result = await reviewPayment({
      paymentId: paymentByTelegramMessage.id,
      decision,
      source: "TELEGRAM",
      reviewNote: note,
      actorId: message.from?.id ? String(message.from.id) : undefined,
    });
    void result;

    await sendAdminPaymentOutcomeMessage({
      decision,
      orderId: paymentByTelegramMessage.order.id,
      paymentId: paymentByTelegramMessage.id,
      userName: paymentByTelegramMessage.order.user.name,
      planName: paymentByTelegramMessage.order.plan.name,
      reviewNote: decision === "reject" ? text : null,
    });

    return;
  }

  const origin = await prisma.message.findFirst({
    where: { telegramBridgeMessageId: replyToId },
    select: { conversationId: true },
  });

  if (!origin) {
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!admin) {
    return;
  }

  await sendConversationMessage({
    conversationId: origin.conversationId,
    senderId: admin.id,
    senderRole: "ADMIN",
    text,
  });
}

function isTelegramAdminActor(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const adminChatId = getTelegramAdminChatIdNormalized();
  if (!adminChatId) {
    return false;
  }
  const messageChatId =
    callback.message?.chat?.id != null ? String(callback.message.chat.id) : "";
  const fromUserId = callback.from?.id != null ? String(callback.from.id) : "";
  return messageChatId === adminChatId || fromUserId === adminChatId;
}

function parseCallbackData(data: string): { decision: string; paymentId: string } {
  const i = data.indexOf(":");
  if (i <= 0) {
    return { decision: "", paymentId: "" };
  }
  return {
    decision: data.slice(0, i).trim(),
    paymentId: data.slice(i + 1).trim(),
  };
}

/**
 * تلگرام ترجیح می‌دهد همیشه 200 بگیرد تا آپدیت را تکرار نکند.
 * خطا را در بدنه یا لاگ می‌گذاریم، نه با 401 روی کل درخواست (مگر پارس بدنه).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("probe") !== "1") {
    return NextResponse.json({
      ok: true,
      message: "این آدرس برای وب‌هوک تلگرام است (فقط POST). برای عیب‌یابی: همان URL با ?probe=1",
      hint:
        "اگر TELEGRAM_WEBHOOK_SECRET در env دارید: ?probe=1&key=همان_مقدار تا وضعیت getWebhookInfo را ببینید. اگر secret خالی است فقط ?probe=1",
    });
  }

  const expected = getTelegramWebhookSecretNormalized();
  if (expected) {
    const key = searchParams.get("key")?.trim();
    if (key !== expected) {
      return NextResponse.json({ ok: false, error: "key نامعتبر یا missing" }, { status: 403 });
    }
  }

  const info = await fetchTelegramWebhookInfo();
  return NextResponse.json({ ok: true, webhook: info });
}

export async function POST(request: Request) {
  let body: TelegramUpdate;
  try {
    body = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const secretOk = validateTelegramSecret(request);
  if (!secretOk) {
    const cb = body.callback_query;
    await answerTelegramCallbackSafe(
      cb?.id,
      "توکن وب‌هوک با سرور یکی نیست. در Vercel TELEGRAM_WEBHOOK_SECRET را با secret_token در setWebhook هماهنگ کنید.",
      { showAlert: true },
    );
    return NextResponse.json({ ok: true });
  }

  if (body.message && !body.callback_query) {
    try {
      const handledKeyboard = await handleTelegramAdminReplyKeyboard(body.message);
      if (!handledKeyboard) {
        const handledCommand = await handleTelegramAdminCommands(body.message);
        if (!handledCommand) {
          await handleTelegramAdminTextReply(body.message);
        }
      }
    } catch (error) {
      console.error("[telegram webhook] chat reply failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  const callback = body.callback_query;

  if (!callback?.id) {
    return NextResponse.json({ ok: true });
  }

  if (!callback.data || !callback.message?.chat?.id || callback.message.message_id == null) {
    await answerTelegramCallbackSafe(callback.id, "ساختار دکمه ناقص است.", { showAlert: true });
    return NextResponse.json({ ok: true });
  }

  if (!isTelegramAdminActor(callback)) {
    await answerTelegramCallbackSafe(
      callback.id,
      "دسترسی ندارید. TELEGRAM_ADMIN_CHAT_ID باید آیدی همین چت یا آیدی تلگرام شما باشد.",
      { showAlert: true },
    );
    return NextResponse.json({ ok: true });
  }

  if (callback.data === "admin_menu") {
    await answerTelegramCallbackSafe(callback.id, "منو ارسال شد.");
    try {
      await sendAdminOnboardingKeyboardBundle();
    } catch (error) {
      console.error("[telegram webhook] admin_menu failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  const { decision, paymentId } = parseCallbackData(callback.data);

  const supported =
    decision === "approve" ||
    decision === "reject" ||
    decision === "need_reason" ||
    decision === "need_info" ||
    decision === "request_resubmit";

  if (!paymentId || !supported) {
    await answerTelegramCallbackSafe(callback.id, "داده دکمه نامعتبر است.", { showAlert: true });
    return NextResponse.json({ ok: true });
  }

  try {
    if (decision === "need_reason") {
      await answerTelegramCallbackSafe(
        callback.id,
        "لطفاً همین پیام رسید را Reply کن و دلیل رد را بفرست. (همان متن به کاربر نمایش داده می‌شود.)",
        { showAlert: true },
      );
      return NextResponse.json({ ok: true });
    }

    if (decision === "need_info" || decision === "request_resubmit") {
      const note =
        decision === "need_info"
          ? "نیاز به اطلاعات بیشتر: لطفاً کد پیگیری/۴ رقم کارت/تصویر واضح‌تر را ارسال کنید."
          : "لطفاً رسید را مجدداً با تصویر واضح و اطلاعات صحیح ارسال کنید.";

      await reviewPayment({
        paymentId,
        decision: "reject",
        source: "TELEGRAM",
        reviewNote: note,
        actorId: callback.from?.id ? String(callback.from.id) : undefined,
      });

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { plan: true, user: true } } },
      });

      if (payment) {
        await sendAdminPaymentOutcomeMessage({
          decision: "reject",
          orderId: payment.order.id,
          paymentId,
          userName: payment.order.user.name,
          planName: payment.order.plan.name,
          reviewNote: note,
        });
      }

      await answerTelegramCallbackSafe(callback.id, "ثبت شد. کاربر می‌تواند رسید جدید بفرستد.", { showAlert: true });
      return NextResponse.json({ ok: true });
    }

    const result = await reviewPayment({
      paymentId,
      decision: decision as "approve" | "reject",
      source: "TELEGRAM",
      reviewNote: decision === "approve" ? "تایید از تلگرام" : "رد از تلگرام",
      actorId: callback.from?.id ? String(callback.from.id) : undefined,
    });

    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        order: {
          include: {
            plan: true,
            user: true,
          },
        },
      },
    });

    if (payment) {
      const baseCaption = [
        "رسید بررسی شد",
        `سفارش: ${payment.order.id}`,
        `کاربر: ${payment.order.user.name}`,
        `پلن: ${payment.order.plan.name}`,
        `مبلغ: ${payment.amount.toString()}`,
        `کد پیگیری: ${payment.trackingCode}`,
        `وضعیت: ${decision === "approve" ? "تایید شد" : "رد شد"}`,
      ].join("\n");

      try {
        await editTelegramMessage({
          chatId: String(callback.message.chat.id),
          messageId: callback.message.message_id,
          caption: baseCaption.slice(0, 1024),
        });
      } catch (editError) {
        console.error("[telegram webhook] editMessageCaption failed:", editError);
      }
    }

    await answerTelegramCallbackSafe(
      callback.id,
      decision === "approve"
        ? `پرداخت تایید شد.${result.config ? " کانفیگ تخصیص یافت." : ""}`
        : "پرداخت رد شد؛ کاربر می‌تواند رسید جدید بفرستد.",
      { showAlert: true },
    );

    if (payment) {
      await sendAdminPaymentOutcomeMessage({
        decision: decision as "approve" | "reject",
        orderId: payment.order.id,
        paymentId: payment.id,
        userName: payment.order.user.name,
        planName: payment.order.plan.name,
        reviewNote: decision === "reject" ? payment.reviewNote : null,
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "خطا در بررسی پرداخت";
    console.error("[telegram webhook] reviewPayment failed:", error);
    await answerTelegramCallbackSafe(callback.id, msg.slice(0, 180), { showAlert: true });
  }

  return NextResponse.json({ ok: true });
}
