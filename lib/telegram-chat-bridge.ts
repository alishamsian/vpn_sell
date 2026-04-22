import type { ConversationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isTelegramConfigured, sendAdminPlainTextMessage } from "@/lib/telegram";

function adminChatDeepLink(userId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!base) {
    return "(در env مقدار NEXT_PUBLIC_APP_URL را برای لینک پنل ادمین بگذارید)";
  }
  return `${base}/admin/chat/users/${userId}`;
}

/**
 * بعد از ثبت پیام کاربر در دیتابیس، یک پیام در تلگرام می‌فرستد.
 * ادمین با Reply روی همان پیام می‌تواند جواب را در سایت ثبت کند.
 */
export async function notifyUserChatMessageOnTelegram(params: {
  messageId: string;
  conversationId: string;
  userId: string;
  userName: string;
  conversationType: ConversationType;
  bodyPreview: string;
  hasAttachment: boolean;
  attachmentName?: string | null;
  orderId?: string | null;
}) {
  if (!isTelegramConfigured()) {
    return;
  }

  const kind =
    params.conversationType === "ORDER_SUPPORT"
      ? `سفارش ${params.orderId ?? ""}`.trim()
      : "پشتیبانی عمومی";

  const preview =
    params.bodyPreview.trim() ||
    (params.hasAttachment ? `فایل: ${params.attachmentName ?? "پیوست"}` : "(بدون متن)");

  const text = [
    "پیام جدید چت سایت",
    `نوع: ${kind}`,
    `کاربر: ${params.userName}`,
    `متن: ${preview}`,
    "",
    `پنل: ${adminChatDeepLink(params.userId)}`,
    "",
    "برای پاسخ به کاربر، همین پیام را در تلگرام Reply کن و متن را بفرست.",
  ].join("\n");

  try {
    const sent = await sendAdminPlainTextMessage(text);
    await prisma.message.update({
      where: { id: params.messageId },
      data: { telegramBridgeMessageId: sent.message_id },
    });
  } catch (error) {
    console.error("[telegram-chat-bridge] notify failed:", error);
  }
}
