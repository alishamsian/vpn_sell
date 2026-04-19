"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { formatPrice } from "@/lib/format";
import type { PlanInventory } from "@/lib/queries";

type OrderState = {
  orderId: string;
  planName: string;
};

type PlanListProps = {
  plans: PlanInventory[];
  currentUser: {
    name: string;
  } | null;
};

export function PlanList({ plans, currentUser }: PlanListProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderState | null>(null);
  const { showToast } = useToast();
  const router = useRouter();
  const items = plans;

  const hasStock = useMemo(
    () => items.some((plan) => plan.remainingCount > 0),
    [items],
  );

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
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">پلن‌های موجود</h2>
            <p className="mt-1 text-sm text-slate-600">
              بعد از ثبت سفارش و تایید پرداخت، کانفیگ همان پلن برای کاربر تخصیص داده می‌شود.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {hasStock ? "موجود" : "اتمام موجودی"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((plan) => {
            const disabled = plan.remainingCount === 0 || loadingPlanId !== null;
            const isLoading = loadingPlanId === plan.id;

            return (
              <article
                key={plan.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-400">پلن</div>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{plan.name}</h3>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-semibold text-slate-950">
                      {formatPrice(plan.price)}
                    </div>
                    <div className="text-sm text-slate-500">پرداخت یک‌باره</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div>
                    <div className="text-xs text-slate-400">باقی‌مانده</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {plan.remainingCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">فروخته‌شده</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{plan.soldCount}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleBuy(plan.id)}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">روند سفارش</h2>
          <p className="text-sm leading-6 text-slate-600">
            ابتدا سفارش می‌سازید، سپس رسید کارت‌به‌کارت را ثبت می‌کنید و بعد از تایید ادمین
            کانفیگ را تحویل می‌گیرید.
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
