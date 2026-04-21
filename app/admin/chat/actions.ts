"use server";

import { requireAdmin } from "@/lib/auth";
import { sendConversationMessage, setConversationStatus } from "@/lib/chat";
import { type ChatMutationState } from "@/lib/chat-types";

export async function sendAdminChatMessageAction(
  _previousState: ChatMutationState,
  formData: FormData,
): Promise<ChatMutationState> {
  try {
    const admin = await requireAdmin();
    const conversationId = String(formData.get("conversationId") ?? "").trim();
    const message = String(formData.get("message") ?? "");
    const attachment = formData.get("attachment");

    if (!conversationId) {
      return {
        status: "error",
        message: "گفت‌وگوی انتخاب‌شده معتبر نیست.",
      };
    }

    await sendConversationMessage({
      conversationId,
      senderId: admin.id,
      senderRole: admin.role,
      text: message,
      attachment: attachment instanceof File ? attachment : null,
    });

    return {
      status: "success",
      message: "پاسخ برای کاربر ارسال شد.",
      conversationId,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "ارسال پاسخ با خطا مواجه شد.",
    };
  }
}

export async function toggleAdminConversationStatusAction(
  _previousState: ChatMutationState,
  formData: FormData,
): Promise<ChatMutationState> {
  try {
    const admin = await requireAdmin();
    const conversationId = String(formData.get("conversationId") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();

    if (!conversationId || (status !== "OPEN" && status !== "CLOSED")) {
      return {
        status: "error",
        message: "درخواست تغییر وضعیت گفتگو معتبر نیست.",
      };
    }

    await setConversationStatus({
      conversationId,
      actorId: admin.id,
      actorRole: admin.role,
      status,
    });

    return {
      status: "success",
      message: status === "CLOSED" ? "گفت‌وگو توسط ادمین بسته شد." : "گفت‌وگو دوباره باز شد.",
      conversationId,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "تغییر وضعیت گفتگو با خطا مواجه شد.",
    };
  }
}
