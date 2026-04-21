import { ChatShell } from "@/components/chat/chat-shell";
import { requireUser } from "@/lib/auth";
import { ensureGeneralConversation } from "@/lib/chat";
import { getUserChatConversations, getUserConversationDetails } from "@/lib/queries";
import {
  sendUserChatMessageAction,
  toggleUserConversationStatusAction,
} from "@/app/dashboard/chat/actions";

export const dynamic = "force-dynamic";

type DashboardChatPageProps = {
  searchParams?: Promise<{
    c?: string;
  }>;
};

export default async function DashboardChatPage({ searchParams }: DashboardChatPageProps) {
  const user = await requireUser();
  const generalConversation = await ensureGeneralConversation(user.id);
  const conversations = await getUserChatConversations(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedConversationId =
    resolvedSearchParams?.c && conversations.some((conversation) => conversation.id === resolvedSearchParams.c)
      ? resolvedSearchParams.c
      : generalConversation.id;
  const conversation = await getUserConversationDetails(selectedConversationId, user.id);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="max-w-3xl space-y-3">
          <div className="text-sm font-medium text-slate-500">مرکز گفتگو با پشتیبانی</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">چت حرفه‌ای پشتیبانی</h1>
          <p className="text-sm leading-7 text-slate-600">
            از این بخش می‌توانید هم گفت‌وگوی عمومی با پشتیبانی را مدیریت کنید و هم مکالمه‌های
            مرتبط با سفارش‌های خود را یکجا ببینید.
          </p>
        </div>
      </section>

      <ChatShell
        role="USER"
        currentUserId={user.id}
        initialConversations={conversations}
        initialConversation={conversation}
        sendAction={sendUserChatMessageAction}
        toggleStatusAction={toggleUserConversationStatusAction}
        emptyListText="هنوز گفت‌وگویی برای شما ثبت نشده است."
      />
    </div>
  );
}
