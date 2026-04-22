import { NextResponse } from "next/server";

import { sendConversationMessage } from "@/lib/chat";
import {
  answerTelegramCallback,
  editTelegramMessage,
  validateTelegramSecret,
} from "@/lib/telegram";
import { reviewPayment } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

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

async function handleTelegramAdminTextReply(message: TelegramInboundMessage) {
  const allowedChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!allowedChatId || !message.chat?.id || String(message.chat.id) !== allowedChatId) {
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

export async function POST(request: Request) {
  if (!validateTelegramSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json()) as TelegramUpdate;

  if (body.message && !body.callback_query) {
    try {
      await handleTelegramAdminTextReply(body.message);
    } catch (error) {
      console.error("[telegram webhook] chat reply failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  const callback = body.callback_query;

  if (!callback?.id || !callback.data || !callback.message?.chat?.id || !callback.message.message_id) {
    return NextResponse.json({ ok: true });
  }

  const allowedChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!allowedChatId || String(callback.message.chat.id) !== allowedChatId) {
    await answerTelegramCallback(callback.id, "اجازه دسترسی ندارید.");
    return NextResponse.json({ ok: true });
  }

  const [decision, paymentId] = callback.data.split(":");

  if (!paymentId || (decision !== "approve" && decision !== "reject")) {
    await answerTelegramCallback(callback.id, "داده نامعتبر است.");
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await reviewPayment({
      paymentId,
      decision,
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

      await editTelegramMessage({
        chatId: String(callback.message.chat.id),
        messageId: callback.message.message_id,
        caption: baseCaption,
      });
    }

    await answerTelegramCallback(
      callback.id,
      decision === "approve"
        ? `پرداخت تایید شد و ${result.config ? "کانفیگ تخصیص یافت." : "سفارش نهایی شد."}`
        : "پرداخت رد شد.",
    );
  } catch (error) {
    await answerTelegramCallback(
      callback.id,
      error instanceof Error ? error.message : "خطا در بررسی پرداخت",
    );
  }

  return NextResponse.json({ ok: true });
}
