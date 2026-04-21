"use client";

import { useEffect, useMemo, useState } from "react";

import { sendAdminChatMessageAction } from "@/app/admin/chat/actions";
import { sendUserChatMessageAction } from "@/app/dashboard/chat/actions";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import type { ChatConversationDetails, ChatConversationSummary } from "@/lib/queries";

type FloatingChatEntryProps = {
  session: {
    sub: string;
    role: "USER" | "ADMIN";
  };
  launcherClassName?: string;
  panelClassName?: string;
};

export function FloatingChatEntry({ session, launcherClassName, panelClassName }: FloatingChatEntryProps) {
  const [conversation, setConversation] = useState<ChatConversationDetails | null>(null);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const sendAction = useMemo(
    () => (session.role === "ADMIN" ? sendAdminChatMessageAction : sendUserChatMessageAction),
    [session.role],
  );
  const fullPageHref = session.role === "ADMIN" ? "/admin/chat" : "/dashboard/chat";

  useEffect(() => {
    let isMounted = true;

    async function loadChatPreview() {
      try {
        const response = await fetch("/api/chat/launcher", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          authenticated: boolean;
          unreadCount: number;
          conversations: ChatConversationSummary[];
          conversation: ChatConversationDetails | null;
        };

        if (!isMounted) {
          return;
        }

        setUnreadCount(data.unreadCount);
        setConversations(data.conversations ?? []);
        setConversation(data.conversation);
      } catch {
        if (isMounted) {
          setConversation(null);
          setConversations([]);
          setUnreadCount(0);
        }
      }
    }

    void loadChatPreview();

    return () => {
      isMounted = false;
    };
  }, [session.role]);

  return (
    <FloatingChatWidget
      key={`${session.role}-${conversation?.id ?? "floating-chat"}-${conversations.length}`}
      role={session.role}
      currentUserId={session.sub}
      initialConversations={conversations}
      initialConversation={conversation}
      sendAction={sendAction}
      fullPageHref={fullPageHref}
      unreadCount={unreadCount}
      title={session.role === "ADMIN" ? "صندوق پشتیبانی" : "پشتیبانی سریع"}
      emptyTitle={
        session.role === "ADMIN"
          ? "هنوز گفت‌وگویی ثبت نشده است"
          : "گفت‌وگوی پشتیبانی آماده نیست"
      }
      emptyDescription={
        session.role === "ADMIN"
          ? "برای مدیریت کامل گفتگوها از دکمه بزرگ‌کردن استفاده کنید."
          : "اگر هنوز گفت‌وگویی ثبت نشده، اولین پیام را از همین ویجت ارسال کنید."
      }
      canComposeWithoutConversation={session.role !== "ADMIN"}
      launcherClassName={launcherClassName}
      panelClassName={panelClassName}
    />
  );
}
