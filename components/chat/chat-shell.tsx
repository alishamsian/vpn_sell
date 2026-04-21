"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ConversationList } from "@/components/chat/conversation-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageThread } from "@/components/chat/message-thread";
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
  ChatMessageItem,
  ChatConversationSummary,
} from "@/lib/queries";

type ChatShellProps = {
  role: "USER" | "ADMIN";
  currentUserId: string;
  initialConversations: ChatConversationSummary[];
  initialConversation: ChatConversationDetails | null;
  sendAction: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  toggleStatusAction: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  emptyListText: string;
  variant?: "default" | "telegramAdmin";
};

export function ChatShell({
  role,
  currentUserId,
  initialConversations,
  initialConversation,
  sendAction,
  toggleStatusAction,
  emptyListText,
  variant = "default",
}: ChatShellProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversation?.id ?? initialConversations[0]?.id ?? null,
  );
  const [selectedConversation, setSelectedConversation] = useState(initialConversation);
  const [searchValue, setSearchValue] = useState("");
  const liveActive = Boolean(selectedConversationId);
  const selectionStorageKey = getChatSelectionStorageKey(role, currentUserId);

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/chat/conversations", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      conversations: ChatConversationSummary[];
    };

    setConversations(data.conversations);
  }, []);

  const refreshSelectedConversation = useCallback(
    async (conversationId: string, markAsRead = true) => {
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

      setSelectedConversation(data.conversation);

      if (markAsRead) {
        await Promise.all([
          fetch(`/api/chat/conversations/${conversationId}/read`, {
            method: "POST",
            credentials: "same-origin",
          }),
          refreshConversations(),
        ]);
      }
    },
    [refreshConversations],
  );

  const appendOptimisticMessage = useCallback(
    (body: string) => {
      if (!body.trim()) {
        return;
      }

      setSelectedConversation((current) => {
        if (!current) {
          return current;
        }

        const optimisticMessage: ChatMessageItem = {
          id: `pending-${Date.now()}`,
          senderId: currentUserId,
          senderName: role === "ADMIN" ? "پشتیبانی" : "شما",
          senderRole: role,
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

        const nextConversation = {
          ...current,
          lastMessageAt: optimisticMessage.createdAt,
          lastMessagePreview: body,
          messages: [...current.messages, optimisticMessage],
        };

        setConversations((items) =>
          items.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  lastMessageAt: optimisticMessage.createdAt,
                  lastMessagePreview: body,
                }
              : item,
          ),
        );

        return nextConversation;
      });
    },
    [currentUserId, role],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!selectedConversationId) {
      return;
    }

    if (!supabase) {
      const interval = window.setInterval(() => {
        void refreshConversations();
        void refreshSelectedConversation(selectedConversationId, false);
      }, 4000);

      return () => {
        window.clearInterval(interval);
      };
    }

    const channel = supabase
      .channel(`chat-live-${role.toLowerCase()}-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Conversation",
        },
        () => {
          void refreshConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${selectedConversationId}`,
        },
        () => {
          void refreshSelectedConversation(selectedConversationId, false);
          void refreshConversations();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshConversations, refreshSelectedConversation, role, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setStoredChatSelection(role, currentUserId, selectedConversationId);
  }, [currentUserId, role, selectedConversationId]);

  useEffect(() => {
    const storedConversationId = getStoredChatSelection(role, currentUserId);

    if (
      storedConversationId &&
      storedConversationId !== selectedConversationId &&
      conversations.some((conversation) => conversation.id === storedConversationId)
    ) {
      const timeout = window.setTimeout(() => {
        setSelectedConversationId(storedConversationId);
        void refreshSelectedConversation(storedConversationId, false);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, [conversations, currentUserId, refreshSelectedConversation, role, selectedConversationId]);

  useEffect(() => {
    const handleSelectionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: string; conversationId: string }>;

      if (customEvent.detail?.key !== selectionStorageKey) {
        return;
      }

      const nextConversationId = customEvent.detail.conversationId;

      if (
        !nextConversationId ||
        nextConversationId === selectedConversationId ||
        !conversations.some((conversation) => conversation.id === nextConversationId)
      ) {
        return;
      }

      setSelectedConversationId(nextConversationId);
      void refreshSelectedConversation(nextConversationId, false);
    };

    window.addEventListener(CHAT_SELECTION_CHANGED_EVENT, handleSelectionChanged as EventListener);

    return () => {
      window.removeEventListener(CHAT_SELECTION_CHANGED_EVENT, handleSelectionChanged as EventListener);
    };
  }, [
    conversations,
    refreshSelectedConversation,
    selectedConversationId,
    selectionStorageKey,
  ]);

  const handleConversationSelected = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    void refreshSelectedConversation(conversationId);
  }, [refreshSelectedConversation]);

  const handleMutationSuccess = useCallback(
    async (state: ChatMutationState) => {
      const nextConversationId = state.conversationId ?? selectedConversationId;

      if (nextConversationId) {
        setSelectedConversationId(nextConversationId);
        await Promise.all([
          refreshConversations(),
          refreshSelectedConversation(nextConversationId, false),
        ]);
      } else {
        await refreshConversations();
      }
    },
    [refreshConversations, refreshSelectedConversation, selectedConversationId],
  );

  const selectedPlaceholder = useMemo(() => {
    if (!selectedConversation) {
      return "پیام خود را برای پشتیبانی بنویسید...";
    }

    return selectedConversation.status === "OPEN"
      ? "پیام خود را اینجا بنویسید..."
      : "این گفتگو بسته شده است؛ برای ارسال پیام ابتدا آن را باز کنید.";
  }, [selectedConversation]);

  const isTelegramAdmin = variant === "telegramAdmin" && role === "ADMIN";

  return (
    <div
      className={
        isTelegramAdmin
          ? "grid min-h-[calc(100vh-11rem)] gap-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[360px_minmax(0,1fr)]"
          : "grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
      }
    >
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSelect={handleConversationSelected}
        emptyText={emptyListText}
        role={role}
        title={isTelegramAdmin ? "چت کاربران" : undefined}
        variant={isTelegramAdmin ? "embedded" : "default"}
      />

      <div className={isTelegramAdmin ? "flex min-h-0 flex-col border-r border-slate-200 bg-slate-50/40" : "space-y-4"}>
        <MessageThread
          conversation={selectedConversation}
          currentUserId={currentUserId}
          role={role}
          toggleStatusAction={toggleStatusAction}
          onConversationUpdated={(conversationId) => {
            void handleMutationSuccess({
              status: "success",
              message: "",
              conversationId,
            });
          }}
          liveActive={liveActive}
          emptyDescription="برای شروع، از ستون کناری یک گفت‌وگو را انتخاب کنید یا گفت‌وگوی عمومی را باز کنید."
          variant={isTelegramAdmin ? "embedded" : "default"}
        />

        <div
          className={
            isTelegramAdmin
              ? "border-t border-slate-200 bg-white p-4"
              : "rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"
          }
        >
          <div className="mb-3 text-sm font-semibold text-slate-900">
            {isTelegramAdmin ? "پاسخ به کاربر" : "ارسال پیام جدید"}
          </div>
          <MessageComposer
            action={sendAction}
            conversationId={selectedConversation?.id}
            conversationScope={selectedConversation?.type ?? "GENERAL_SUPPORT"}
            orderId={selectedConversation?.order?.id}
            disabled={selectedConversation?.status === "CLOSED"}
            placeholder={selectedPlaceholder}
            onOptimisticSend={({ message }) => {
              if (selectedConversation?.id) {
                appendOptimisticMessage(message);
              }
            }}
            onSuccess={handleMutationSuccess}
            onComplete={(state) => {
              if (state.status !== "success") {
                const targetConversationId = state.conversationId ?? selectedConversation?.id;

                if (targetConversationId) {
                  void refreshSelectedConversation(targetConversationId, false);
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
