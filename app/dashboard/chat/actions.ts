"use server";

import { getOrCreateConversationForUser, sendConversationMessage, setConversationStatus } from "@/lib/chat";
import { requireUser } from "@/lib/auth";
import { type ChatMutationState } from "@/lib/chat-types";

export async function sendUserChatMessageAction(
  _previousState: ChatMutationState,
  formData: FormData,
): Promise<ChatMutationState> {
  try {
    const user = await requireUser();
    const conversationScope = String(formData.get("conversationScope") ?? "GENERAL_SUPPORT").trim();
    const orderId = String(formData.get("orderId") ?? "").trim();
    const existingConversationId = String(formData.get("conversationId") ?? "").trim();
    const message = String(formData.get("message") ?? "");
    const attachment = formData.get("attachment");

    const conversation =
      existingConversationId
        ? { id: existingConversationId }
        : await getOrCreateConversationForUser({
            userId: user.id,
            conversationType: conversationScope === "ORDER_SUPPORT" ? "ORDER_SUPPORT" : "GENERAL_SUPPORT",
            orderId: orderId || undefined,
          });

    await sendConversationMessage({
      conversationId: conversation.id,
      senderId: user.id,
      senderRole: user.role,
      text: message,
      attachment: attachment instanceof File ? attachment : null,
    });

    return {
      status: "success",
      message: "پیام شما برای پشتیبانی ارسال شد.",
      conversationId: conversation.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "ارسال پیام با خطا مواجه شد.",
    };
  }
}

export async function toggleUserConversationStatusAction(
  _previousState: ChatMutationState,
  formData: FormData,
): Promise<ChatMutationState> {
  try {
    const user = await requireUser();
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
      actorId: user.id,
      actorRole: user.role,
      status,
    });

    return {
      status: "success",
      message: status === "CLOSED" ? "گفت‌وگو بسته شد." : "گفت‌وگو دوباره باز شد.",
      conversationId,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "تغییر وضعیت گفتگو با خطا مواجه شد.",
    };
  }
}
