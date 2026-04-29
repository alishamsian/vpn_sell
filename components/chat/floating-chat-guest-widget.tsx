"use client";

import { LogIn, MessageCircleMore, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function FloatingChatGuestWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div data-floating-chat>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-[6.75rem] right-6 left-auto inline-flex h-12 items-center gap-2 rounded-full border border-stroke/80 bg-panel/92 px-4 text-xs font-semibold text-ink shadow-[0_18px_40px_rgba(2,6,23,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-stroke hover:bg-panel hover:shadow-[0_22px_48px_rgba(2,6,23,0.2)] dark:shadow-black/45 sm:bottom-6 sm:left-6 sm:right-auto sm:h-14 sm:gap-3 sm:px-5 sm:text-sm"
        style={{ zIndex: 99999 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/15 to-brand-cyan/10 text-prose ring-1 ring-sky-200/60 dark:ring-sky-900/60">
          <MessageCircleMore className="h-4.5 w-4.5" />
        </span>
        <span>چت</span>
      </button>

      {isOpen ? (
        <div
          data-floating-chat-panel
          className="fixed bottom-[11.25rem] inset-x-4 w-auto max-w-[22rem] sm:bottom-24 sm:max-w-[23rem]"
          style={{ zIndex: 99999 }}
        >
          <div className="overflow-hidden rounded-shell border border-stroke bg-panel shadow-2xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-center justify-between gap-3 border-b border-stroke px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-ink">پشتیبانی سریع</div>
                <div className="mt-1 text-xs text-faint">برای شروع گفتگو، ابتدا وارد حساب شوید.</div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stroke bg-panel text-prose transition hover:border-stroke hover:bg-inset"
                title="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-5">
              <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-5 text-sm leading-7 text-prose">
                بعد از ورود، چت پشتیبانی شناور و نسخه کامل صفحه چت برای شما فعال می‌شود.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="btn-brand flex-1 gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  ورود
                </Link>
                <Link
                  href="/register"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm font-medium text-prose transition hover:border-faint/60 hover:bg-inset"
                >
                  <UserPlus className="h-4 w-4" />
                  ثبت‌نام
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
