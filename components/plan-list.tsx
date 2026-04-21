"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { formatDuration, formatPrice, formatUserLimit } from "@/lib/format";
import type { PlanInventory } from "@/lib/queries";

type OrderState = {
  orderId: string;
  planName: string;
};

type DurationFilter = "ALL" | "POPULAR" | "ONE_MONTH" | "TWO_MONTHS" | "THREE_MONTHS";

type PlanListProps = {
  plans: PlanInventory[];
  currentUser: {
    name: string;
  } | null;
};

const FILTER_OPTIONS: Array<{ id: DurationFilter; label: string }> = [
  { id: "ALL", label: "همه پلن‌ها" },
  { id: "POPULAR", label: "محبوب‌ترین‌ها" },
  { id: "ONE_MONTH", label: "یک‌ماهه" },
  { id: "TWO_MONTHS", label: "دوماهه" },
  { id: "THREE_MONTHS", label: "سه‌ماهه" },
];

export function PlanList({ plans, currentUser }: PlanListProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderState | null>(null);
  const [activeFilter, setActiveFilter] = useState<DurationFilter>("ALL");
  const { showToast } = useToast();
  const router = useRouter();
  const items = plans;

  const hasStock = useMemo(
    () => items.some((plan) => plan.remainingCount > 0),
    [items],
  );
  const filteredPlans = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const availabilityDiff = Number(b.remainingCount > 0) - Number(a.remainingCount > 0);

      if (availabilityDiff !== 0) {
        return availabilityDiff;
      }

      if (b.remainingCount !== a.remainingCount) {
        return b.remainingCount - a.remainingCount;
      }

      return a.durationDays - b.durationDays;
    });

    if (activeFilter === "ALL") {
      return sorted;
    }

    if (activeFilter === "POPULAR") {
      return [...sorted].sort((a, b) => {
        if (b.soldCount !== a.soldCount) {
          return b.soldCount - a.soldCount;
        }

        if (b.remainingCount !== a.remainingCount) {
          return b.remainingCount - a.remainingCount;
        }

        return a.durationDays - b.durationDays;
      });
    }

    return sorted.filter((plan) => getDurationBucket(plan.durationDays) === activeFilter);
  }, [activeFilter, items]);
  const popularPlanIds = useMemo(() => {
    return [...items]
      .filter((plan) => plan.soldCount > 0)
      .sort((a, b) => {
        if (b.soldCount !== a.soldCount) {
          return b.soldCount - a.soldCount;
        }

        return b.remainingCount - a.remainingCount;
      })
      .slice(0, 2)
      .map((plan) => plan.id);
  }, [items]);

  async function handleBuy(planId: string) {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setLoadingPlanId(planId);

    const selectedPlan = items.find((item) => item.id === planId);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        orderId?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.orderId) {
        throw new Error(payload.error ?? "ثبت سفارش انجام نشد.");
      }

      setCreatedOrder({
        orderId: payload.orderId,
        planName: selectedPlan?.name ?? "پلن انتخاب‌شده",
      });
      showToast("سفارش ساخته شد. حالا اطلاعات پرداخت را ثبت کنید.", "success");
      router.push(`/dashboard/orders/${payload.orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ثبت سفارش انجام نشد.";
      showToast(message, "error");
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
      <section id="plans" className="space-y-4 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">پلن‌های موجود</h2>
            <p className="mt-1 text-sm text-slate-600">
              پلن‌ها بر اساس بازه اشتراک دسته‌بندی شده‌اند تا انتخاب سریع‌تر و حرفه‌ای‌تر باشد.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            {hasStock ? "موجود" : "اتمام موجودی"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveFilter(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === option.id
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => {
            const disabled = plan.remainingCount === 0 || loadingPlanId !== null;
            const isLoading = loadingPlanId === plan.id;
            const stockLabel = plan.remainingCount === 0 ? "ناموجود" : plan.remainingCount > 3 ? "آماده سفارش" : "موجودی محدود";
            const isPopular = popularPlanIds.includes(plan.id);
            const cardTone = getPlanCardTone({
              isPopular,
              remainingCount: plan.remainingCount,
            });

            return (
              <article
                key={plan.id}
                className={`group relative overflow-hidden rounded-3xl border p-6 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${cardTone.card}`}
              >
                <div className={`absolute inset-0 ${cardTone.glow}`} />
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex flex-wrap items-center gap-2">
                    <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${cardTone.durationBadge}`}>
                      {getDurationLabel(plan.durationDays)}
                    </div>
                    {isPopular ? (
                      <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        محبوب
                      </div>
                    ) : null}
                  </div>
                  <div className={`relative inline-flex rounded-full px-3 py-1 text-xs font-medium ${cardTone.stockBadge}`}>
                    {stockLabel}
                  </div>
                </div>

                <div className="relative mt-5">
                  <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatPrice(plan.price)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">پرداخت یک‌باره</div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-slate-100/80 pt-5 text-sm text-slate-600">
                  <div>
                    <div className="text-xs text-slate-400">مدت اشتراک</div>
                    <div className="mt-1 font-medium text-slate-950">{formatDuration(plan.durationDays)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">تعداد کاربر</div>
                    <div className="mt-1 font-medium text-slate-950">{formatUserLimit(plan.maxUsers)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">موجودی</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {new Intl.NumberFormat("fa-IR").format(plan.remainingCount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">وضعیت</div>
                    <div className="mt-1 font-medium text-slate-950">{stockLabel}</div>
                  </div>
                </div>

                <div className={`relative mt-5 rounded-2xl px-4 py-3 text-sm ${cardTone.note}`}>
                  ثبت سفارش، ثبت رسید و تحویل بعد از تایید ادمین
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleBuy(plan.id)}
                  className={`relative mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${cardTone.button}`}
                >
                  {!currentUser
                    ? "ورود و ثبت سفارش"
                    : isLoading
                      ? "در حال پردازش..."
                      : plan.remainingCount === 0
                        ? "ناموجود"
                        : "ثبت سفارش"}
                </button>
              </article>
            );
          })}
        </div>

        {filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            برای این بازه زمانی هنوز پلنی ثبت نشده است.
          </div>
        ) : null}
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">روند خرید</h2>
          <p className="text-sm leading-6 text-slate-600">
            کل فرایند شفاف و قابل پیگیری است؛ از ثبت سفارش تا تحویل نهایی کانفیگ.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <StepItem index="۱" title="انتخاب پلن" description="پلن مناسب را انتخاب می‌کنی." />
          <StepItem index="۲" title="ثبت سفارش" description="یک کد سفارش برایت ساخته می‌شود." />
          <StepItem index="۳" title="ثبت رسید" description="رسید کارت‌به‌کارت را ثبت می‌کنی." />
          <StepItem index="۴" title="تحویل کانفیگ" description="بعد از تایید، کانفیگ نمایش داده می‌شود." />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-950">
            {currentUser ? `${currentUser.name}، آماده ثبت سفارش هستی.` : "برای شروع فقط یک حساب بساز."}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {currentUser
              ? "بعد از انتخاب پلن، مستقیم به صفحه پرداخت و ثبت رسید هدایت می‌شوی."
              : "بعد از ورود یا ثبت‌نام، می‌توانی سفارش بسازی و همه مراحل را از داخل پنل خودت پیگیری کنی."}
          </p>
        </div>

        {createdOrder ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-semibold">سفارش با موفقیت ساخته شد</div>
              <div className="mt-1">{createdOrder.planName}</div>
              <div className="mt-1 text-xs text-emerald-700">کد سفارش: {createdOrder.orderId}</div>
            </div>
            <Link
              href={`/dashboard/orders/${createdOrder.orderId}`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              ادامه پرداخت و ثبت رسید
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {currentUser
              ? "برای شروع، یکی از پلن‌ها را انتخاب و سفارش خود را ثبت کنید."
              : "برای ثبت سفارش و ثبت رسید، ابتدا وارد حساب خود شوید یا ثبت‌نام کنید."}
          </div>
        )}
      </aside>
    </div>
  );
}

function StepItem({
  description,
  index,
  title,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
        {index}
      </div>
      <div>
        <div className="font-medium text-slate-950">{title}</div>
        <div className="mt-1 text-sm leading-6 text-slate-600">{description}</div>
      </div>
    </div>
  );
}

function getDurationBucket(days: number): DurationFilter {
  if (days <= 45) {
    return "ONE_MONTH";
  }

  if (days <= 75) {
    return "TWO_MONTHS";
  }

  return "THREE_MONTHS";
}

function getDurationLabel(days: number) {
  const bucket = getDurationBucket(days);

  if (bucket === "ONE_MONTH") {
    return "یک‌ماهه";
  }

  if (bucket === "TWO_MONTHS") {
    return "دوماهه";
  }

  return "سه‌ماهه";
}

function getPlanCardTone({
  isPopular,
  remainingCount,
}: {
  isPopular: boolean;
  remainingCount: number;
}) {
  if (remainingCount === 0) {
    return {
      card: "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] hover:border-slate-300",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.12),transparent_28%)]",
      durationBadge: "bg-white text-slate-700 border border-slate-200",
      stockBadge: "bg-slate-100 text-slate-600",
      note: "bg-slate-100/80 text-slate-700",
      button: "bg-slate-400 hover:bg-slate-400",
    };
  }

  if (isPopular) {
    return {
      card: "border-violet-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,243,255,0.94))] hover:border-violet-300",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.16),transparent_28%),radial-gradient(circle_at_left,rgba(129,140,248,0.10),transparent_24%)]",
      durationBadge: "bg-slate-950 text-white",
      stockBadge: "bg-violet-50 text-violet-700",
      note: "bg-violet-50/70 text-violet-900",
      button: "bg-[linear-gradient(90deg,rgba(15,23,42,1),rgba(109,40,217,0.95))] hover:opacity-95",
    };
  }

  return {
    card: "border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.94))] hover:border-sky-300",
    glow: "bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_28%),radial-gradient(circle_at_left,rgba(14,165,233,0.08),transparent_24%)]",
    durationBadge: "bg-slate-950 text-white",
    stockBadge: "bg-sky-50 text-sky-700",
    note: "bg-sky-50/70 text-sky-900",
    button: "bg-[linear-gradient(90deg,rgba(15,23,42,1),rgba(3,105,161,0.95))] hover:opacity-95",
  };
}
