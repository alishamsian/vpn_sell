"use client";

import { LogIn, MessageCircleMore, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function FloatingChatGuestWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-6 inset-inline-start-6 inline-flex h-14 items-center gap-3 rounded-full border border-sky-100 bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
        style={{ zIndex: 99999 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <MessageCircleMore className="h-4.5 w-4.5" />
        </span>
        <span>چت</span>
      </button>

      {isOpen ? (
        <div
          className="fixed bottom-24 inset-inline-start-4 w-[min(23rem,calc(100vw-2rem))]"
          style={{ zIndex: 99999 }}
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">پشتیبانی سریع</div>
                <div className="mt-1 text-xs text-slate-500">برای شروع گفتگو، ابتدا وارد حساب شوید.</div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                title="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-5">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                بعد از ورود، چت پشتیبانی شناور و نسخه کامل صفحه چت برای شما فعال می‌شود.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  ورود
                </Link>
                <Link
                  href="/register"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                  ثبت‌نام
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
