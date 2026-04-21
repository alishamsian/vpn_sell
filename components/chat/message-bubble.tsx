"use client";

import Link from "next/link";

import type { ChatMessageItem } from "@/lib/queries";
import { AppLoadingSpinner } from "@/components/ui/app-loading";

type MessageBubbleProps = {
  message: ChatMessageItem;
  isOwnMessage: boolean;
};

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const isPending = message.id.startsWith("pending-");

  return (
    <div className={`flex ${isOwnMessage ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[78%] rounded-[1.75rem] px-4 py-3 shadow-soft ${
          isOwnMessage
            ? "rounded-br-md border border-sky-100 bg-sky-50 text-slate-800"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <div className="text-xs text-slate-500">
          {message.senderName}
        </div>

        {message.body ? (
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{message.body}</div>
        ) : null}

        {message.attachmentUrl ? (
          <div
            className={`mt-3 rounded-2xl border px-3 py-3 ${
              isOwnMessage ? "border-sky-200 bg-white/80" : "border-slate-200 bg-slate-50"
            }`}
          >
            {message.type === "IMAGE" ? (
              <Link href={message.attachmentUrl} target="_blank" className="text-sm underline">
                مشاهده تصویر پیوست
              </Link>
            ) : (
              <Link href={message.attachmentUrl} target="_blank" className="text-sm underline">
                دانلود فایل {message.attachmentName ? `(${message.attachmentName})` : ""}
              </Link>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{formatDateTime(message.createdAt)}</span>
          {isPending ? (
            <span className="inline-flex items-center gap-1 text-sky-600">
              <AppLoadingSpinner className="h-3 w-3 text-sky-600" />
              در حال ارسال…
            </span>
          ) : null}
          {message.readAt ? <span>خوانده شد</span> : null}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
