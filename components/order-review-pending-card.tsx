"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

type OrderReviewPendingCardProps = {
  refreshIntervalSeconds?: number;
};

export function OrderReviewPendingCard({
  refreshIntervalSeconds = 15,
}: OrderReviewPendingCardProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIsRefreshing(true);
      router.refresh();
    }, refreshIntervalSeconds * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshIntervalSeconds, router]);

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isRefreshing]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-[radial-gradient(circle_at_top_right,rgba(186,230,253,0.45),transparent_28%),linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.96))] p-8 shadow-soft dark:border-sky-800/60 dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.15),transparent_28%),linear-gradient(135deg,rgba(12,74,110,0.35),rgba(15,23,42,0.96))]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(14,165,233,0.7),transparent)]" />

      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-panel/85 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm shadow-sky-100/80 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-200 dark:shadow-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
          بررسی فعال
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-sky-950 dark:text-sky-50">رسید شما با موفقیت ثبت شد</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-950/75 dark:text-sky-200/85">
          سفارش وارد صف بررسی شده است. اگر همین صفحه را باز نگه دارید، نتیجه پس از بررسی از
          همین‌جا نمایش داده می‌شود و وضعیت به‌صورت خودکار به‌روزرسانی خواهد شد.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-shell border border-white/80 bg-panel/80 p-5 shadow-[0_12px_35px_rgba(14,165,233,0.08)] backdrop-blur-sm dark:border-stroke dark:bg-elevated/90 dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-ink">در حال آماده‌سازی نتیجه بررسی</div>
            <div className="mt-1 text-xs leading-6 text-faint">
              به محض پاسخ ادمین، این بخش به‌روزرسانی می‌شود و مرحله بعد برای شما باز خواهد شد.
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="inline-flex h-2.5 w-2.5 animate-bounce rounded-full bg-sky-500"
                style={{ animationDelay: `${index * 0.18}s` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-sky-100/90 dark:bg-sky-950/50">
          <div className="h-full w-full animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(125,211,252,0.18),rgba(14,165,233,0.95),rgba(186,230,253,0.25))]" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 dark:border-sky-800/50 dark:bg-sky-950/35">
            <div className="text-xs font-medium text-sky-700 dark:text-sky-300">الان چه اتفاقی می‌افتد؟</div>
            <div className="mt-1 text-sm font-semibold text-ink">بررسی رسید و تطبیق پرداخت</div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 dark:border-sky-800/50 dark:bg-sky-950/35">
            <div className="text-xs font-medium text-sky-700 dark:text-sky-300">بهترین کار شما</div>
            <div className="mt-1 text-sm font-semibold text-ink">صفحه را باز نگه دارید</div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 dark:border-sky-800/50 dark:bg-sky-950/35">
            <div className="text-xs font-medium text-sky-700 dark:text-sky-300">بعد از تایید</div>
            <div className="mt-1 text-sm font-semibold text-ink">کانفیگ همین‌جا نمایش داده می‌شود</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setIsRefreshing(true);
            router.refresh();
          }}
          className="btn-brand inline-flex rounded-xl px-4 py-2.5 text-sm"
        >
          <AppLoadingButtonLabel
            pending={isRefreshing}
            idleLabel="بررسی دوباره وضعیت"
            pendingLabel="در حال به‌روزرسانی…"
            spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
          />
        </button>

        <a
          href="#order-chat"
          className="inline-flex rounded-xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-prose transition hover:border-stroke hover:text-ink"
        >
          پیگیری از گفت‌وگو
        </a>
      </div>
    </div>
  );
}
