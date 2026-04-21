"use client";

import { useEffect, useState } from "react";

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

  const sorted = sortConversations(filteredConversations);
  const openConversations = sorted.filter((c) => c.status === "OPEN");
  const closedConversations = sorted.filter((c) => c.status === "CLOSED");
  const archiveContainsSelection = closedConversations.some((c) => c.id === selectedConversationId);
  const [archiveOpen, setArchiveOpen] = useState(archiveContainsSelection);

  useEffect(() => {
    if (archiveContainsSelection) {
      setArchiveOpen(true);
    }
  }, [archiveContainsSelection]);

  return (
    <div
      className={
        variant === "embedded"
          ? "flex h-full min-h-0 flex-col bg-white"
          : "flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-soft sm:rounded-[2rem]"
      }
    >
      <div className="shrink-0 border-b border-slate-200 p-3 sm:p-4">
        <div className="text-sm font-semibold text-slate-950">
          {title ?? (role === "ADMIN" ? "صندوق گفتگوها" : "گفتگوهای پشتیبانی")}
        </div>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجو…"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 sm:rounded-2xl sm:py-3"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:p-3">
        {openConversations.length === 0 && closedConversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : null}

        {openConversations.length === 0 && closedConversations.length > 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs leading-6 text-slate-600">
            گفتگوی باز فعالی نیست. گفتگوهای قبلی را در بخش پایین باز کنید.
          </p>
        ) : null}

        {openConversations.map((conversation) => (
          <ConversationListRow
            key={conversation.id}
            conversation={conversation}
            role={role}
            selected={conversation.id === selectedConversationId}
            onSelect={() => onSelect(conversation.id)}
            compact={false}
          />
        ))}

        {closedConversations.length > 0 ? (
          <details
            className="group mt-1 rounded-xl border border-slate-200 bg-slate-50/80 open:bg-white"
            open={archiveOpen}
            onToggle={(event) => {
              setArchiveOpen((event.target as HTMLDetailsElement).open);
            }}
          >
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-700 marker:content-none sm:px-4 sm:text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span>گفتگوهای بسته‌شده</span>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 tabular-nums">
                  {closedConversations.length}
                </span>
              </span>
            </summary>
            <div className="space-y-1.5 border-t border-slate-200 p-2 pb-3 sm:space-y-2 sm:p-3">
              {closedConversations.map((conversation) => (
                <ConversationListRow
                  key={conversation.id}
                  conversation={conversation}
                  role={role}
                  selected={conversation.id === selectedConversationId}
                  onSelect={() => onSelect(conversation.id)}
                  compact
                />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function sortConversations(items: ChatConversationSummary[]) {
  return [...items].sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }

    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

    return tb - ta;
  });
}

function ConversationListRow({
  conversation,
  role,
  selected,
  onSelect,
  compact,
}: {
  conversation: ChatConversationSummary;
  role: "USER" | "ADMIN";
  selected: boolean;
  onSelect: () => void;
  compact: boolean;
}) {
  const primaryLabel = role === "ADMIN" ? conversation.user.name : conversation.title;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-lg border px-2.5 py-2 text-right transition sm:rounded-xl sm:px-3 ${
          selected
            ? "border-sky-200 bg-sky-50 text-slate-950"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {getInitials(conversation.user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 truncate text-xs font-semibold text-slate-900">{primaryLabel}</div>
              {conversation.lastMessageAt ? (
                <span className="shrink-0 text-[10px] text-slate-400">{formatCompactTime(conversation.lastMessageAt)}</span>
              ) : null}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
              {conversation.lastMessagePreview ?? "—"}
            </div>
          </div>
          <UnreadBadge count={conversation.unreadCount} />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-right transition sm:rounded-[1.5rem] sm:p-4 ${
        selected
          ? "border-sky-200 bg-sky-50 text-slate-950"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 sm:h-12 sm:w-12 sm:text-sm">
          {getInitials(conversation.user.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{primaryLabel}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                {role === "ADMIN"
                  ? conversation.user.phone ?? conversation.user.email ?? "—"
                  : conversation.lastMessageAt
                    ? formatDateTime(conversation.lastMessageAt)
                    : "بدون پیام"}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {conversation.lastMessageAt ? (
                <div className="text-[10px] text-slate-400 sm:text-[11px]">{formatCompactTime(conversation.lastMessageAt)}</div>
              ) : null}
              <UnreadBadge count={conversation.unreadCount} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${
                conversation.type === "ORDER_SUPPORT"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {conversation.type === "ORDER_SUPPORT" ? "سفارش" : "عمومی"}
            </span>
            {conversation.order?.planName ? (
              <span className="max-w-[10rem] truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 sm:max-w-[14rem] sm:text-[11px]">
                {conversation.order.planName}
              </span>
            ) : null}
          </div>

          <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-600 sm:text-xs sm:leading-6">
            {conversation.lastMessagePreview ?? "برای شروع پیام بفرستید."}
          </div>
        </div>
      </div>
    </button>
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
