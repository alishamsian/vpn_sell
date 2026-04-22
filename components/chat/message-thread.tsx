"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { useToast } from "@/components/toast-provider";
import {
  initialChatMutationState,
  type ChatMutationState,
} from "@/lib/chat-types";
import type { ChatConversationDetails } from "@/lib/queries";

type MessageThreadProps = {
  conversation: ChatConversationDetails | null;
  currentUserId: string;
  role: "USER" | "ADMIN";
  toggleStatusAction?: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  onConversationUpdated?: (conversationId: string) => void;
  liveActive?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  variant?: "default" | "embedded" | "compactEmbedded";
};

function StatusToggleForm({
  conversation,
  action,
  onSuccess,
}: {
  conversation: ChatConversationDetails;
  action: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  onSuccess?: (conversationId: string) => void;
}) {
  const [state, formAction] = useActionState(action, initialChatMutationState);
  const { showToast } = useToast();

  useEffect(() => {
    if (!state.message || state.status === "idle") {
      return;
    }

    showToast(state.message, state.status === "success" ? "success" : "error");

    if (state.status === "success" && state.conversationId) {
      onSuccess?.(state.conversationId);
    }
  }, [onSuccess, showToast, state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="conversationId" value={conversation.id} />
      <input type="hidden" name="orderId" value={conversation.order?.id ?? ""} />
      <input
        type="hidden"
        name="status"
        value={conversation.status === "OPEN" ? "CLOSED" : "OPEN"}
      />
      <button
        type="submit"
        className="rounded-xl border border-stroke bg-panel px-3 py-2 text-xs font-medium text-prose transition hover:border-faint/60 hover:bg-inset"
      >
        {conversation.status === "OPEN" ? "بستن گفتگو" : "باز کردن دوباره"}
      </button>
    </form>
  );
}

export function MessageThread({
  conversation,
  currentUserId,
  role,
  toggleStatusAction,
  onConversationUpdated,
  liveActive = false,
  emptyTitle = "گفت‌وگویی انتخاب نشده است",
  emptyDescription = "برای شروع، یکی از گفتگوها را از ستون کناری انتخاب کنید.",
  variant = "default",
}: MessageThreadProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isCompact = variant === "compactEmbedded";

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation?.messages.length, conversation?.lastMessageAt]);

  const subtitle = useMemo(() => {
    if (!conversation) {
      return "";
    }

    if (role === "ADMIN") {
      return `${conversation.user.name} | ${conversation.user.phone ?? conversation.user.email ?? "-"}`;
    }

    if (conversation.order) {
      return `سفارش ${conversation.order.planName}`;
    }

    return "پشتیبانی عمومی";
  }, [conversation, role]);

  const productContext = useMemo(() => {
    if (!conversation) {
      return null;
    }

    if (conversation.order) {
      return {
        label: "محصول مرتبط",
        value: conversation.order.planName,
        description: `این گفتگو به سفارش ${conversation.order.id.slice(0, 8)} مربوط است.`,
      };
    }

    return {
      label: "محصول مرتبط",
      value: "گفت‌وگوی عمومی",
      description: "این مکالمه هنوز به محصول یا سفارش مشخصی وصل نشده است.",
    };
  }, [conversation]);

  if (!conversation) {
    return (
      <div
        className={
          variant === "embedded"
            ? "flex h-full min-h-[720px] items-center justify-center bg-inset/50 p-8 text-center dark:bg-inset/30"
            : variant === "compactEmbedded"
              ? "flex h-full min-h-[420px] items-center justify-center bg-inset/50 p-5 text-center dark:bg-inset/30"
            : "flex min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-stroke bg-panel p-6 text-center shadow-soft sm:min-h-[280px] lg:min-h-[360px]"
        }
      >
        <div className="max-w-md">
          <div className={`${isCompact ? "text-base" : "text-xl"} font-semibold text-ink`}>
            {emptyTitle}
          </div>
          <div className={`mt-3 text-prose ${isCompact ? "text-xs leading-6" : "text-sm leading-7"}`}>
            {emptyDescription}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "embedded"
          ? "flex h-full min-h-[720px] flex-col overflow-hidden bg-panel"
          : variant === "compactEmbedded"
            ? "flex h-full min-h-[420px] flex-col overflow-hidden bg-panel"
          : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stroke bg-panel shadow-soft lg:min-h-[520px]"
      }
    >
      <div
        className={`flex flex-wrap items-center justify-between border-b border-stroke bg-panel/95 backdrop-blur ${
          isCompact ? "gap-3 p-4" : "gap-3 p-4 sm:gap-4 sm:p-5"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className={`${isCompact ? "text-base" : "text-base sm:text-lg"} truncate font-semibold text-ink`}>
            {role === "ADMIN" ? conversation.user.name : conversation.title}
          </div>
          {!isCompact ? <div className="mt-1 truncate text-xs text-faint sm:text-sm">{subtitle}</div> : null}
        </div>

        <div className={`flex flex-wrap items-center ${isCompact ? "gap-2" : "gap-3"}`}>
          <span
            className={`rounded-full text-xs font-medium ${
              isCompact ? "px-2.5 py-1" : "px-3 py-1"
            } ${
              conversation.status === "OPEN"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-elevated text-prose"
            }`}
          >
            {conversation.status === "OPEN" ? "باز" : "بسته"}
          </span>
          {toggleStatusAction ? (
            <StatusToggleForm
              conversation={conversation}
              action={toggleStatusAction}
              onSuccess={onConversationUpdated}
            />
          ) : null}
        </div>
      </div>

      <div className={`border-b border-stroke bg-panel ${isCompact ? "px-4 py-3" : "px-4 py-3 sm:px-5"}`}>
        <div
          className={`rounded-xl border border-stroke bg-inset sm:rounded-2xl ${
            isCompact ? "px-3 py-2" : "px-3 py-2 sm:px-4 sm:py-3"
          }`}
        >
          {isCompact ? (
            <div className="text-xs font-medium text-prose">{productContext?.value}</div>
          ) : (
            <>
              <div className="text-[11px] font-medium text-faint">{productContext?.label}</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-ink">{productContext?.value}</div>
              <div className="mt-1 hidden text-xs leading-6 text-faint sm:block">{productContext?.description}</div>
            </>
          )}
        </div>
      </div>

      {!isCompact ? (
        <div className="hidden border-b border-stroke bg-panel px-4 py-2 sm:block sm:px-5 sm:py-3">
          <TypingIndicator active={liveActive} />
        </div>
      ) : null}

      <div
        ref={listRef}
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto bg-inset/50 sm:space-y-4 dark:bg-inset/30 ${
          isCompact ? "p-4" : "p-3 sm:p-5"
        }`}
      >
        {conversation.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === currentUserId}
          />
        ))}

        {conversation.messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stroke bg-panel px-4 py-10 text-center text-sm text-faint">
            هنوز پیامی در این گفتگو ثبت نشده است.
          </div>
        ) : null}
      </div>
    </div>
  );
}
