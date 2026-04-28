"use client";

import { Expand, MessageCircleMore, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageComposer } from "@/components/chat/message-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { UnreadBadge } from "@/components/chat/unread-badge";
import {
  CHAT_SELECTION_CHANGED_EVENT,
  getStoredChatSelection,
  getChatSelectionStorageKey,
  setStoredChatSelection,
} from "@/lib/chat-selection-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ChatMutationState } from "@/lib/chat-types";
import type {
  ChatConversationDetails,
  ChatConversationSummary,
  ChatMessageItem,
} from "@/lib/queries";

type FloatingChatWidgetProps = {
  role: "USER" | "ADMIN";
  currentUserId: string;
  initialConversations: ChatConversationSummary[];
  initialConversation: ChatConversationDetails | null;
  sendAction: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  fullPageHref: string;
  unreadCount: number;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
  canComposeWithoutConversation?: boolean;
  launcherClassName?: string;
  panelClassName?: string;
};

export function FloatingChatWidget({
  role,
  currentUserId,
  initialConversations,
  initialConversation,
  sendAction,
  fullPageHref,
  unreadCount,
  title,
  emptyTitle,
  emptyDescription,
  canComposeWithoutConversation = true,
  launcherClassName =
    "fixed bottom-6 inset-inline-start-6 inline-flex h-14 items-center gap-3 rounded-full border border-stroke bg-panel px-5 text-sm font-semibold text-ink shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-stroke hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)] dark:shadow-black/40",
  panelClassName = "fixed bottom-24 inset-x-4 w-auto max-w-[23rem]",
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [conversation, setConversation] = useState(initialConversation);
  const listRef = useRef<HTMLDivElement>(null);
  const liveActive = isOpen && Boolean(conversation?.id);

  const selectionStorageKey = getChatSelectionStorageKey(role, currentUserId);

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/chat/conversations", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return [] as ChatConversationSummary[];
    }

    const data = (await response.json()) as {
      conversations: ChatConversationSummary[];
    };

    setConversations(data.conversations);
    return data.conversations;
  }, []);

  const refreshConversation = useCallback(async (conversationId: string, markAsRead = true) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      conversation: ChatConversationDetails;
    };

    setConversation(data.conversation);

    if (markAsRead) {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: "POST",
        credentials: "same-origin",
      });
    }
  }, []);

  const appendOptimisticMessage = useCallback(
    (body: string) => {
      if (!body.trim()) {
        return;
      }

      setConversation((current) => {
        if (!current) {
          return current;
        }

        const optimisticMessage: ChatMessageItem = {
          id: `pending-${Date.now()}`,
          senderId: currentUserId,
          senderName: "شما",
          senderRole: "USER",
          type: "TEXT",
          body,
          attachmentUrl: null,
          attachmentName: null,
          attachmentMimeType: null,
          attachmentSize: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          readAt: null,
          editedAt: null,
        };

        return {
          ...current,
          lastMessageAt: optimisticMessage.createdAt,
          lastMessagePreview: body,
          messages: [...current.messages, optimisticMessage],
        };
      });
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!isOpen || !conversation?.id) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      const interval = window.setInterval(() => {
        void refreshConversation(conversation.id, false);
      }, 4000);

      return () => {
        window.clearInterval(interval);
      };
    }

    const channel = supabase
      .channel(`floating-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversation.id}`,
        },
        () => {
          void refreshConversation(conversation.id, false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Conversation",
          filter: `id=eq.${conversation.id}`,
        },
        () => {
          void refreshConversation(conversation.id, false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, isOpen, refreshConversation]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation?.lastMessageAt, conversation?.messages.length, isOpen]);

  useEffect(() => {
    if (!conversation?.id) {
      return;
    }

    setStoredChatSelection(role, currentUserId, conversation.id);
  }, [conversation?.id, currentUserId, role]);

  useEffect(() => {
    const handleSelectionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; conversationId: string }>;

      if (customEvent.detail?.key !== selectionStorageKey) {
        return;
      }

      if (!customEvent.detail.conversationId || customEvent.detail.conversationId === conversation?.id) {
        return;
      }

      void refreshConversation(customEvent.detail.conversationId, false);
    };

    window.addEventListener(CHAT_SELECTION_CHANGED_EVENT, handleSelectionChanged as EventListener);

    return () => {
      window.removeEventListener(CHAT_SELECTION_CHANGED_EVENT, handleSelectionChanged as EventListener);
    };
  }, [conversation?.id, refreshConversation, selectionStorageKey]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!conversationId) {
        return;
      }

      setStoredChatSelection(role, currentUserId, conversationId);
      await refreshConversation(conversationId);
    },
    [currentUserId, refreshConversation, role],
  );

  function handleToggleOpen() {
    setIsOpen((current) => {
      const next = !current;

      if (next) {
        void (async () => {
          const nextConversations = await refreshConversations();
          const storedConversationId = getStoredChatSelection(role, currentUserId);
          const preferredConversationId =
            (storedConversationId &&
              nextConversations.some((item) => item.id === storedConversationId) &&
              storedConversationId) ||
            conversation?.id ||
            nextConversations[0]?.id;

          if (preferredConversationId) {
            await refreshConversation(preferredConversationId);
          }
        })();
      }

      return next;
    });
  }

  const fullChatHref = conversation?.id ? `${fullPageHref}?c=${conversation.id}` : fullPageHref;

  const conversationLabel = (item: ChatConversationSummary) => {
    if (role === "ADMIN") {
      return item.order?.planName
        ? `${item.user.name} - ${item.order.planName}`
        : `${item.user.name} - پشتیبانی عمومی`;
    }

    return item.order?.planName ? `محصول: ${item.order.planName}` : "پشتیبانی عمومی";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggleOpen}
        className={launcherClassName}
        style={{ zIndex: 99999 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-prose">
          <MessageCircleMore className="h-4.5 w-4.5" />
        </span>
        <span>چت</span>
        <UnreadBadge count={unreadCount} />
      </button>

      {isOpen ? (
        <div
          className={panelClassName}
          style={{ zIndex: 99999 }}
        >
          <div className="overflow-hidden rounded-shell border border-stroke bg-panel shadow-2xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-stroke px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{title}</div>
                <div className="mt-0.5 text-[11px] text-faint">
                  {conversation?.title ?? "گفت‌وگوی سریع پشتیبانی"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={fullChatHref}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-panel text-prose transition hover:border-stroke hover:bg-inset"
                  title="باز کردن نسخه بزرگ"
                >
                  <Expand className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stroke bg-panel text-prose transition hover:border-stroke hover:bg-inset"
                  title="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {conversations.length > 0 ? (
              <div className="border-b border-stroke px-4 py-2.5">
                <label className="mb-1.5 block text-[10px] font-medium text-faint">
                  {role === "ADMIN" ? "گفت‌وگوی فعال" : "محصول / موضوع گفتگو"}
                </label>
                <select
                  value={conversation?.id ?? ""}
                  onChange={(event) => {
                    void selectConversation(event.target.value);
                  }}
                  className="w-full rounded-2xl border border-stroke bg-inset px-3 py-2 text-[13px] text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                >
                  {conversations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {conversationLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="border-b border-stroke px-4 py-1.5">
              <TypingIndicator active={liveActive} label="به‌روزرسانی سریع فعال است" />
            </div>

            <div
              ref={listRef}
              className="h-[16.5rem] space-y-3 overflow-y-auto bg-inset/70 px-4 py-3"
            >
              {conversation ? (
                conversation.messages.length > 0 ? (
                  conversation.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwnMessage={message.senderId === currentUserId}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-stroke bg-panel px-4 py-6 text-center text-sm text-faint">
                    هنوز پیامی ثبت نشده است.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-stroke bg-panel px-4 py-6 text-center">
                  <div className="text-sm font-semibold text-ink">{emptyTitle}</div>
                  <div className="mt-2 text-xs leading-6 text-faint">{emptyDescription}</div>
                </div>
              )}
            </div>

            <div className="border-t border-stroke px-4 py-3">
              <MessageComposer
                action={sendAction}
                conversationId={conversation?.id}
                conversationScope={conversation?.type ?? "GENERAL_SUPPORT"}
                orderId={conversation?.order?.id}
                disabled={conversation?.status === "CLOSED" || (!conversation && !canComposeWithoutConversation)}
                placeholder="پیام کوتاه خود را بنویسید..."
                rows={3}
                compact
                onOptimisticSend={({ message }) => {
                  if (conversation?.id) {
                    appendOptimisticMessage(message);
                  }
                }}
                onSuccess={(state) => {
                  if (state.conversationId) {
                    void Promise.all([
                      refreshConversation(state.conversationId, false),
                      refreshConversations(),
                    ]);
                  }
                }}
                onComplete={(state) => {
                  if (state.status === "success") {
                    return;
                  }

                  const targetConversationId = state.conversationId ?? conversation?.id;

                  if (targetConversationId) {
                    void Promise.all([
                      refreshConversation(targetConversationId, false),
                      refreshConversations(),
                    ]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
