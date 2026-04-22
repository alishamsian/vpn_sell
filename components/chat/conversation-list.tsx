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
      window.setTimeout(() => {
        setArchiveOpen(true);
      }, 0);
    }
  }, [archiveContainsSelection]);

  return (
    <div
      className={
        variant === "embedded"
          ? "flex h-full min-h-0 flex-col bg-panel"
          : "flex h-full min-h-0 flex-col rounded-2xl border border-stroke bg-panel shadow-soft sm:rounded-card"
      }
    >
      <div className="shrink-0 border-b border-stroke p-3 sm:p-4">
        <div className="text-sm font-semibold text-ink">
          {title ?? (role === "ADMIN" ? "صندوق گفتگوها" : "گفتگوهای پشتیبانی")}
        </div>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجو…"
          className="mt-2 w-full rounded-xl border border-stroke bg-inset px-3 py-2.5 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20 sm:rounded-2xl sm:py-3"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 sm:p-3">
        {openConversations.length === 0 && closedConversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-10 text-center text-sm text-faint">
            {emptyText}
          </div>
        ) : null}

        {openConversations.length === 0 && closedConversations.length > 0 ? (
          <p className="rounded-xl border border-stroke bg-inset px-3 py-2 text-center text-xs leading-6 text-prose">
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
            className="group mt-1 rounded-xl border border-stroke bg-inset/80 open:bg-panel"
            open={archiveOpen}
            onToggle={(event) => {
              setArchiveOpen((event.target as HTMLDetailsElement).open);
            }}
          >
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-prose marker:content-none sm:px-4 sm:text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span>گفتگوهای بسته‌شده</span>
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-bold text-prose tabular-nums">
                  {closedConversations.length}
                </span>
              </span>
            </summary>
            <div className="space-y-1.5 border-t border-stroke p-2 pb-3 sm:space-y-2 sm:p-3">
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
            ? "border-stroke bg-inset text-ink"
            : "border-stroke bg-panel hover:border-stroke hover:bg-inset"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elevated text-[11px] font-bold text-prose">
            {getInitials(conversation.user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 truncate text-xs font-semibold text-ink">{primaryLabel}</div>
              {conversation.lastMessageAt ? (
                <span className="shrink-0 text-[10px] text-faint">{formatCompactTime(conversation.lastMessageAt)}</span>
              ) : null}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] text-faint">
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
          ? "border-stroke bg-inset text-ink"
          : "border-stroke bg-panel hover:border-stroke hover:bg-inset"
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-bold text-prose sm:h-12 sm:w-12 sm:text-sm">
          {getInitials(conversation.user.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{primaryLabel}</div>
              <div className="mt-0.5 truncate text-[11px] text-faint sm:text-xs">
                {role === "ADMIN"
                  ? conversation.user.phone ?? conversation.user.email ?? "—"
                  : conversation.lastMessageAt
                    ? formatDateTime(conversation.lastMessageAt)
                    : "بدون پیام"}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {conversation.lastMessageAt ? (
                <div className="text-[10px] text-faint sm:text-[11px]">{formatCompactTime(conversation.lastMessageAt)}</div>
              ) : null}
              <UnreadBadge count={conversation.unreadCount} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${
                conversation.type === "ORDER_SUPPORT"
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"
                  : "bg-elevated text-prose"
              }`}
            >
              {conversation.type === "ORDER_SUPPORT" ? "سفارش" : "عمومی"}
            </span>
            {conversation.order?.planName ? (
              <span className="max-w-[10rem] truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 sm:max-w-[14rem] sm:text-[11px]">
                {conversation.order.planName}
              </span>
            ) : null}
          </div>

          <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-prose sm:text-xs sm:leading-6">
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
