import { NextResponse } from "next/server";

import { sendConversationMessage } from "@/lib/chat";
import {
  answerTelegramCallback,
  editTelegramMessage,
  validateTelegramSecret,
} from "@/lib/telegram";
import { reviewPayment } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  const allowedChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
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

function isTelegramAdminActor(callback: NonNullable<TelegramUpdate["callback_query"]>) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!adminChatId) {
    return false;
  }
  const messageChatId =
    callback.message?.chat?.id != null ? String(callback.message.chat.id) : "";
  const fromUserId = callback.from?.id != null ? String(callback.from.id) : "";
  return messageChatId === adminChatId || fromUserId === adminChatId;
}

export async function POST(request: Request) {
  let body: TelegramUpdate;
  try {
    body = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const secretOk = validateTelegramSecret(request);
  if (!secretOk) {
    const cb = body.callback_query;
    if (cb?.id) {
      try {
        await answerTelegramCallback(
          cb.id,
          "توکن وب‌هوک با سرور یکی نیست. در Vercel TELEGRAM_WEBHOOK_SECRET را با secret_token در setWebhook هماهنگ کنید.",
          { showAlert: true },
        );
      } catch (error) {
        console.error("[telegram webhook] secret mismatch, answerCallback failed:", error);
      }
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (body.message && !body.callback_query) {
    try {
      await handleTelegramAdminTextReply(body.message);
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
    try {
      await answerTelegramCallback(callback.id, "داده دکمه ناقص است.", { showAlert: true });
    } catch (error) {
      console.error("[telegram webhook] invalid callback payload:", error);
    }
    return NextResponse.json({ ok: true });
  }

  if (!isTelegramAdminActor(callback)) {
    try {
      await answerTelegramCallback(
        callback.id,
        "فقط ادمین مجاز است. TELEGRAM_ADMIN_CHAT_ID باید آیدی همین چت یا آیدی تلگرام شما باشد.",
        { showAlert: true },
      );
    } catch (error) {
      console.error("[telegram webhook] forbidden answer failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  const [decision, paymentId] = callback.data.split(":");

  if (!paymentId || (decision !== "approve" && decision !== "reject")) {
    try {
      await answerTelegramCallback(callback.id, "داده دکمه نامعتبر است.", { showAlert: true });
    } catch (error) {
      console.error("[telegram webhook] bad callback data:", error);
    }
    return NextResponse.json({ ok: true });
  }

  try {
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

    await answerTelegramCallback(
      callback.id,
      decision === "approve"
        ? `پرداخت تایید شد.${result.config ? " کانفیگ تخصیص یافت." : ""}`
        : "پرداخت رد شد؛ کاربر می‌تواند رسید جدید بفرستد.",
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "خطا در بررسی پرداخت";
    console.error("[telegram webhook] reviewPayment failed:", error);
    try {
      await answerTelegramCallback(callback.id, msg.slice(0, 180), { showAlert: true });
    } catch (answerError) {
      console.error("[telegram webhook] answerCallback after error failed:", answerError);
    }
  }

  return NextResponse.json({ ok: true });
}
