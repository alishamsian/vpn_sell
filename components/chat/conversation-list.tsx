"use client";

import type { ChatConversationSummary } from "@/lib/queries";

import { UnreadBadge } from "@/components/chat/unread-badge";

type ConversationListProps = {
  conversations: ChatConversationSummary[];
  selectedConversationId: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelect: (conversationId: string) => void;
  emptyText: string;
  role: "USER" | "ADMIN";
  title?: string;
  variant?: "default" | "embedded";
};

export function ConversationList({
  conversations,
  selectedConversationId,
  searchValue,
  onSearchChange,
  onSelect,
  emptyText,
  role,
  title,
  variant = "default",
}: ConversationListProps) {
  const filteredConversations = conversations.filter((conversation) => {
    const haystack = [
      conversation.title,
      conversation.lastMessagePreview ?? "",
      conversation.user.name,
      conversation.order?.planName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchValue.trim().toLowerCase());
  });

  return (
    <div
      className={
        variant === "embedded"
          ? "flex h-full min-h-0 flex-col bg-white"
          : "flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white shadow-soft"
      }
    >
      <div className="border-b border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-950">
          {title ?? (role === "ADMIN" ? "صندوق گفتگوها" : "گفتگوهای پشتیبانی")}
        </div>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجو در گفتگوها"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`w-full rounded-[1.5rem] border p-4 text-right transition ${
              conversation.id === selectedConversationId
                ? "border-sky-200 bg-sky-50 text-slate-950"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                {getInitials(conversation.user.name)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {role === "ADMIN" ? conversation.user.name : conversation.title}
                    </div>
                    <div
                      className={`mt-1 truncate text-xs ${
                        conversation.id === selectedConversationId ? "text-slate-500" : "text-slate-500"
                      }`}
                    >
                      {role === "ADMIN"
                        ? conversation.user.phone ?? conversation.user.email ?? "کاربر بدون شماره"
                        : conversation.lastMessageAt
                          ? `آخرین فعالیت: ${formatDateTime(conversation.lastMessageAt)}`
                          : "هنوز پیامی ثبت نشده است"}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {conversation.lastMessageAt ? (
                      <div className="text-[11px] text-slate-400">
                        {formatCompactTime(conversation.lastMessageAt)}
                      </div>
                    ) : null}
                    <UnreadBadge count={conversation.unreadCount} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      conversation.type === "ORDER_SUPPORT"
                        ? "bg-violet-50 text-violet-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {conversation.type === "ORDER_SUPPORT" ? "سفارش" : "عمومی"}
                  </span>
                  {conversation.order?.planName ? (
                    <span className="truncate rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      محصول: {conversation.order.planName}
                    </span>
                  ) : (
                    <span className="truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      بدون محصول مشخص
                    </span>
                  )}
                </div>

                <div className="mt-3 line-clamp-2 text-xs leading-6 text-slate-600">
                  {conversation.lastMessagePreview ?? "برای شروع گفتگو، پیام خود را ارسال کنید."}
                </div>
              </div>
            </div>
          </button>
        ))}

        {filteredConversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCompactTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
