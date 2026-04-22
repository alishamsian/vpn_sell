import type { OrderStatus } from "@prisma/client";

import { ChatShell } from "@/components/chat/chat-shell";
import type { UserChatOrderOption } from "@/components/chat/user-chat-order-context-picker";
import { requireUser } from "@/lib/auth";
import { ensureGeneralConversation } from "@/lib/chat";
import { getDashboardOrders, getUserChatConversations, getUserConversationDetails } from "@/lib/queries";
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

function orderStatusLabel(status: OrderStatus) {
  if (status === "PENDING_PAYMENT") {
    return "در انتظار پرداخت";
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "در انتظار بررسی";
  }

  if (status === "WAITING_FOR_ACCOUNT") {
    return "در انتظار تحویل";
  }

  return "تحویل‌شده";
}

export default async function DashboardChatPage({ searchParams }: DashboardChatPageProps) {
  const user = await requireUser();
  const generalConversation = await ensureGeneralConversation(user.id);
  const [conversations, orders] = await Promise.all([
    getUserChatConversations(user.id),
    getDashboardOrders(user.id),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedConversationId =
    resolvedSearchParams?.c && conversations.some((conversation) => conversation.id === resolvedSearchParams.c)
      ? resolvedSearchParams.c
      : generalConversation.id;
  const conversation = await getUserConversationDetails(selectedConversationId, user.id);

  const userChatOrderOptions: UserChatOrderOption[] = orders.map((order) => ({
    id: order.id,
    planName: order.plan.name,
    statusLabel: orderStatusLabel(order.status),
  }));

  return (
    <div className="space-y-4 sm:space-y-8">
      <section className="rounded-2xl border border-stroke bg-panel p-4 shadow-soft sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="max-w-3xl space-y-2 sm:space-y-3">
          <div className="text-xs font-medium text-faint sm:text-sm">پشتیبانی</div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl lg:text-3xl">چت</h1>
          <p className="hidden text-sm leading-7 text-prose sm:block">
            گفتگوی عمومی و مکالمه‌های مرتبط با هر سفارش در یک‌جا.
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
        userChatOrderOptions={userChatOrderOptions}
        generalConversationId={generalConversation.id}
      />
    </div>
  );
}
