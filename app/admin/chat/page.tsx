import { ChatShell } from "@/components/chat/chat-shell";
import { AdminPageHeader, AdminPill } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminChatConversations, getAdminConversationDetails } from "@/lib/queries";
import {
  sendAdminChatMessageAction,
  toggleAdminConversationStatusAction,
} from "@/app/admin/chat/actions";

export const dynamic = "force-dynamic";

type AdminChatPageProps = {
  searchParams?: Promise<{
    c?: string;
  }>;
};

export default async function AdminChatPage({ searchParams }: AdminChatPageProps) {
  const admin = await requireAdmin();
  const conversations = await getAdminChatConversations();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedConversationId =
    resolvedSearchParams?.c && conversations.some((conversation) => conversation.id === resolvedSearchParams.c)
      ? resolvedSearchParams.c
      : conversations[0]?.id;
  const conversation = selectedConversationId
    ? await getAdminConversationDetails(selectedConversationId)
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="پیام‌رسان ادمین"
        title="صندوق گفت‌وگوهای پشتیبانی"
        description="هر کاربر به‌صورت جداگانه در ستون کناری نمایش داده می‌شود و گفت‌وگوی فعال در پنل اصلی باز می‌شود."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(conversations.length)} گفتگو`} />}
      />

      <ChatShell
        role="ADMIN"
        currentUserId={admin.id}
        initialConversations={conversations}
        initialConversation={conversation}
        sendAction={sendAdminChatMessageAction}
        toggleStatusAction={toggleAdminConversationStatusAction}
        emptyListText="هنوز هیچ گفت‌وگویی ثبت نشده است."
        variant="telegramAdmin"
      />
    </div>
  );
}
