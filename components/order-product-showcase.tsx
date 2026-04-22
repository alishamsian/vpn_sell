import {
  BadgeCheck,
  CalendarDays,
  Hash,
  Layers,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { CopyField } from "@/components/ui/copy-field";
import type { ReactNode } from "react";

type OrderStatus = "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED";
type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | undefined;

type OrderProductShowcaseProps = {
  orderId: string;
  planName: string;
  priceFormatted: string;
  durationFormatted: string;
  userLimitFormatted: string;
  orderStatusLabel: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAtFormatted: string;
  expiresAtFormatted: string | null;
  subscriptionRemainingLabel: string | null;
  primaryAction?: ReactNode;
};

function statusPresentation(orderStatus: OrderStatus, paymentStatus: PaymentStatus) {
  if (orderStatus === "FULFILLED") {
    return {
      pill: "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/45 dark:text-emerald-100",
      dot: "bg-emerald-500",
      accent: "from-emerald-500/25 via-cyan-500/15 to-amber-500/10",
    };
  }
  if (orderStatus === "WAITING_FOR_ACCOUNT") {
    return {
      pill: "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100",
      dot: "bg-amber-500",
      accent: "from-amber-500/20 via-orange-500/10 to-transparent",
    };
  }
  if (orderStatus === "PAYMENT_SUBMITTED" || paymentStatus === "PENDING") {
    return {
      pill: "border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/45 dark:text-sky-100",
      dot: "bg-sky-500",
      accent: "from-sky-500/20 via-cyan-500/12 to-transparent",
    };
  }
  if (paymentStatus === "REJECTED") {
    return {
      pill: "border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/45 dark:text-rose-100",
      dot: "bg-rose-500",
      accent: "from-rose-500/15 via-amber-500/10 to-transparent",
    };
  }
  return {
    pill: "border-stroke/90 bg-elevated text-ink dark:border-stroke dark:bg-elevated",
    dot: "bg-slate-400 dark:bg-slate-500",
    accent: "from-slate-400/15 via-slate-300/10 to-transparent",
  };
}

function SpecTile({
  children,
  hint,
  icon: Icon,
  label,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: string;
  hint?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-stroke/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.88))] p-4 shadow-sm dark:bg-[linear-gradient(145deg,rgba(30,41,59,0.9),rgba(15,23,42,0.92))]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md shadow-slate-900/15">
        <Icon className="h-5 w-5 opacity-95" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold tracking-wide text-faint">{label}</div>
        <div className="mt-0.5 text-base font-semibold leading-snug text-ink">{children}</div>
        {hint ? <div className="mt-1 text-xs leading-5 text-faint">{hint}</div> : null}
      </div>
    </div>
  );
}

export function OrderProductShowcase(props: OrderProductShowcaseProps) {
  const vis = statusPresentation(props.orderStatus, props.paymentStatus);

  return (
    <section className="relative overflow-hidden rounded-card border border-stroke/90 bg-panel shadow-soft">
      <div
        className={`pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-gradient-to-br ${vis.accent} blur-3xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-gradient-to-tl ${vis.accent} blur-2xl opacity-80`}
        aria-hidden
      />

      <div className="relative border-b border-stroke/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.5),transparent)] px-5 py-6 dark:border-stroke/60 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.35),transparent)] sm:px-8 sm:py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke/90 bg-panel/90 px-3 py-1 text-[11px] font-semibold text-prose shadow-sm backdrop-blur-sm">
                <Layers className="h-3.5 w-3.5 text-sky-600" aria-hidden />
                جزئیات محصول و سفارش
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${vis.pill}`}
              >
                <span className={`h-2 w-2 rounded-full ${vis.dot}`} aria-hidden />
                {props.orderStatusLabel}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl lg:text-[2rem] lg:leading-snug">
                {props.planName}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-prose">
                این پلن برای همین سفارش ثبت شده است. مبلغ، مدت و محدودیت کاربر را یکجا ببین و در صورت نیاز از
                چت همین صفحه پیگیری کن.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-panel/80 px-2.5 py-1 ring-1 ring-stroke/80">
                <CalendarDays className="h-3.5 w-3.5 text-faint" aria-hidden />
                ثبت سفارش: {props.createdAtFormatted}
              </span>
              {props.expiresAtFormatted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-panel/80 px-2.5 py-1 ring-1 ring-stroke/80">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  اعتبار تا: {props.expiresAtFormatted}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative shrink-0 lg:w-[min(100%,17.5rem)]">
            <div className="relative overflow-hidden rounded-2xl border border-stroke/90 bg-[linear-gradient(155deg,rgba(15,23,42,0.98),rgba(15,23,42,0.88))] p-5 text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(232,148,32,0.12),transparent_40%)]" />
              <div className="relative space-y-1">
                <div className="flex items-center gap-2 text-[11px] font-medium text-sky-200/90">
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                  مبلغ پرداختی
                </div>
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">{props.priceFormatted}</div>
                <div className="text-xs text-faint">یک‌بار برای کل دوره اشتراک</div>
              </div>
              <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-panel/5 px-3 py-2 text-[11px] text-sky-100/90">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300/90" aria-hidden />
                تحویل کانفیگ بعد از تایید پرداخت، فقط در همین سفارش
              </div>
              {props.primaryAction ? <div className="relative mt-4">{props.primaryAction}</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-7">
        <CopyField label="کد سفارش (برای پیگیری)" value={props.orderId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <SpecTile icon={CalendarDays} label="مدت اشتراک" hint="از لحظه تحویل کانفیگ">
            {props.durationFormatted}
          </SpecTile>
          <SpecTile icon={Users} label="تعداد کاربر" hint="طبق تعریف پلن">
            {props.userLimitFormatted}
          </SpecTile>
        </div>

        {props.subscriptionRemainingLabel ? (
          <div className="rounded-2xl border border-stroke/80 bg-gradient-to-l from-inset to-sky-50/40 px-4 py-4 dark:from-slate-900 dark:to-sky-950/30 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Hash className="h-4 w-4 text-sky-600" aria-hidden />
                وضعیت اشتراک
              </div>
              <span className="rounded-full bg-panel/90 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/80 dark:text-sky-200 dark:ring-sky-700/60">
                {props.subscriptionRemainingLabel}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
