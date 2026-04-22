import Link from "next/link";

import { ChatShell } from "@/components/chat/chat-shell";
import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminChatConversationsForUser,
  getAdminConversationDetails,
} from "@/lib/queries";
import {
  sendAdminChatMessageAction,
  toggleAdminConversationStatusAction,
} from "@/app/admin/chat/actions";

export const dynamic = "force-dynamic";

type AdminUserChatPageProps = {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<{ c?: string }>;
};

export default async function AdminUserChatPage({ params, searchParams }: AdminUserChatPageProps) {
  const admin = await requireAdmin();
  const { userId } = await params;
  const conversations = await getAdminChatConversationsForUser(userId);
  const resolved = searchParams ? await searchParams : undefined;
  const selectedConversationId =
    resolved?.c && conversations.some((c) => c.id === resolved.c)
      ? resolved.c
      : conversations.find((c) => c.type === "GENERAL_SUPPORT")?.id ?? conversations[0]?.id;

  const conversation = selectedConversationId ? await getAdminConversationDetails(selectedConversationId) : null;
  const general = conversations.find((c) => c.type === "GENERAL_SUPPORT") ?? null;
  const orderThreads = conversations.filter((c) => c.type === "ORDER_SUPPORT");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="پیام‌رسان ادمین"
        title="صفحه گفتگوهای کاربر"
        description="گفتگوی عمومی و گفتگوهای سفارش‌محور زیرمجموعه همین کاربر هستند."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(conversations.length)} رشته`} />}
      />

      <AdminSectionCard title="رشته‌ها" description="برای جابه‌جایی، یک زیررشته را انتخاب کنید.">
        <div className="flex flex-wrap gap-2">
          {general ? (
            <Link
              href={`/admin/chat/users/${userId}?c=${encodeURIComponent(general.id)}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedConversationId === general.id
                  ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                  : "border-stroke bg-panel text-prose hover:bg-elevated hover:text-ink"
              }`}
            >
              عمومی
            </Link>
          ) : null}
          {orderThreads.map((thread) => (
            <Link
              key={thread.id}
              href={`/admin/chat/users/${userId}?c=${encodeURIComponent(thread.id)}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedConversationId === thread.id
                  ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                  : "border-stroke bg-panel text-prose hover:bg-elevated hover:text-ink"
              }`}
            >
              {thread.order?.planName ? `سفارش: ${thread.order.planName}` : thread.title}
              {thread.unreadByAdmin > 0 ? ` (${new Intl.NumberFormat("fa-IR").format(thread.unreadByAdmin)})` : ""}
            </Link>
          ))}
          {conversations.length === 0 ? (
            <div className="text-sm text-faint">هنوز رشته‌ای برای این کاربر نداریم.</div>
          ) : null}
        </div>
      </AdminSectionCard>

      <div className="card-surface p-4">
        <ChatShell
          role="ADMIN"
          currentUserId={admin.id}
          initialConversations={conversations}
          initialConversation={conversation}
          sendAction={sendAdminChatMessageAction}
          toggleStatusAction={toggleAdminConversationStatusAction}
          emptyListText="هنوز هیچ گفت‌وگویی ثبت نشده است."
          variant="telegramAdmin"
          apiBasePath={`/api/admin/chat/users/${userId}`}
        />
      </div>
    </div>
  );
}

