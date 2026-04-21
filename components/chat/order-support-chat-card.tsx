"use client";

import { useCallback, useEffect, useState } from "react";

import { MessageComposer } from "@/components/chat/message-composer";
import { MessageThread } from "@/components/chat/message-thread";
import { setStoredChatSelection } from "@/lib/chat-selection-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ChatMutationState } from "@/lib/chat-types";
import type { ChatConversationDetails } from "@/lib/queries";

type OrderSupportChatCardProps = {
  currentUserId: string;
  orderId: string;
  initialConversation: ChatConversationDetails | null;
  sendAction: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  toggleStatusAction: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  compact?: boolean;
  enabled?: boolean;
  unlockAt?: string | null;
};

export function OrderSupportChatCard({
  currentUserId,
  orderId,
  initialConversation,
  sendAction,
  toggleStatusAction,
  compact = false,
  enabled = false,
  unlockAt = null,
}: OrderSupportChatCardProps) {
  const [conversation, setConversation] = useState(initialConversation);
  const [delayedEnabled, setDelayedEnabled] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!unlockAt) {
      return 0;
    }

    return Math.max(new Date(unlockAt).getTime() - Date.now(), 0);
  });
  const liveActive = Boolean(conversation?.id);
  const isEnabled = enabled || delayedEnabled;

  const refreshConversation = useCallback(
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

      setConversation(data.conversation);

      if (markAsRead) {
        await fetch(`/api/chat/conversations/${conversationId}/read`, {
          method: "POST",
          credentials: "same-origin",
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!conversation?.id) {
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
      .channel(`order-chat-${conversation.id}`)
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
  }, [conversation?.id, refreshConversation]);

  useEffect(() => {
    if (enabled || !unlockAt) {
      return;
    }

    const unlockTimestamp = new Date(unlockAt).getTime();
    const interval = window.setInterval(() => {
      setRemainingMs(Math.max(unlockTimestamp - Date.now(), 0));
    }, 1000);
    const timeout = window.setTimeout(() => {
      setDelayedEnabled(true);
      setRemainingMs(0);
    }, Math.max(unlockTimestamp - Date.now(), 0));

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [enabled, unlockAt]);

  useEffect(() => {
    if (!conversation?.id) {
      return;
    }

    setStoredChatSelection("USER", currentUserId, conversation.id);
  }, [conversation?.id, currentUserId]);

  if (compact) {
    return (
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="relative">
          {!isEnabled && unlockAt ? (
            <div className="absolute left-3 top-3 z-10 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
              باز شدن گفت‌وگو تا {formatRemainingTime(remainingMs)}
            </div>
          ) : null}

          <div className={isEnabled ? "" : "pointer-events-none opacity-60 saturate-50"}>
            <MessageThread
              conversation={conversation}
              currentUserId={currentUserId}
              role="USER"
              toggleStatusAction={toggleStatusAction}
              onConversationUpdated={(conversationId) => {
                void refreshConversation(conversationId, false);
              }}
              liveActive={liveActive}
              emptyTitle="گفت‌وگوی سفارش هنوز شروع نشده است"
              emptyDescription="اگر سوالی درباره این سفارش دارید، از همین بخش برای پشتیبانی پیام بفرستید."
              variant="compactEmbedded"
            />
          </div>

          {!isEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 p-4 backdrop-blur-[2px]">
              <div className="max-w-[15rem] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-center shadow-sm">
                <div className="text-sm font-semibold text-slate-950">گفت‌وگو هنوز فعال نیست</div>
                <div className="mt-1 text-xs leading-6 text-slate-500">
                  اگر تا پایان این زمان کانفیگ تحویل نشود، این بخش برای پیگیری سفارش باز می‌شود.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-white p-3.5">
          <MessageComposer
            action={sendAction}
            conversationId={conversation?.id}
            conversationScope="ORDER_SUPPORT"
            orderId={orderId}
            disabled={conversation?.status === "CLOSED" || !isEnabled}
            placeholder="پیام..."
            rows={3}
            compact
            onSuccess={(state) => {
              if (state.conversationId) {
                void refreshConversation(state.conversationId, false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MessageThread
        conversation={conversation}
        currentUserId={currentUserId}
        role="USER"
        toggleStatusAction={toggleStatusAction}
        onConversationUpdated={(conversationId) => {
          void refreshConversation(conversationId, false);
        }}
        liveActive={liveActive}
        emptyTitle="گفت‌وگوی سفارش هنوز شروع نشده است"
        emptyDescription="اگر سوالی درباره این سفارش دارید، از همین بخش برای پشتیبانی پیام بفرستید."
        variant="default"
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <MessageComposer
          action={sendAction}
          conversationId={conversation?.id}
          conversationScope="ORDER_SUPPORT"
          orderId={orderId}
          disabled={conversation?.status === "CLOSED" || !isEnabled}
          placeholder="سوال، توضیح یا فایل مرتبط با این سفارش را ارسال کنید..."
          rows={4}
          onSuccess={(state) => {
            if (state.conversationId) {
              void refreshConversation(state.conversationId, false);
            }
          }}
        />
      </div>
    </div>
  );
}

function formatRemainingTime(value: number) {
  const totalSeconds = Math.max(Math.ceil(value / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
