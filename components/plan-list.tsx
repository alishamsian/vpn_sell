"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { useToast } from "@/components/toast-provider";
import { formatPrice } from "@/lib/format";
import type { PlanInventory } from "@/lib/queries";

type PurchaseState = {
  orderId: string;
  config: string;
  createdAt: string;
  planName: string;
};

type PlanListProps = {
  plans: PlanInventory[];
};

function getOrCreateDummyUserId() {
  const storageKey = "vpn-sell-user-id";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}

export function PlanList({ plans }: PlanListProps) {
  const [items, setItems] = useState(plans);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseState | null>(null);
  const { showToast } = useToast();

  const hasStock = useMemo(
    () => items.some((plan) => plan.remainingCount > 0),
    [items],
  );

  async function handleBuy(planId: string) {
    setLoadingPlanId(planId);

    const selectedPlan = items.find((item) => item.id === planId);

    try {
      const response = await fetch("/api/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          userId: getOrCreateDummyUserId(),
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        orderId?: string;
        config?: string;
        createdAt?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.config || !payload.orderId || !payload.createdAt) {
        throw new Error(payload.error ?? "خرید انجام نشد.");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === planId
            ? {
                ...item,
                remainingCount: Math.max(item.remainingCount - 1, 0),
                soldCount: item.soldCount + 1,
              }
            : item,
        ),
      );

      setPurchase({
        orderId: payload.orderId,
        config: payload.config,
        createdAt: payload.createdAt,
        planName: selectedPlan?.name ?? "پلن انتخاب‌شده",
      });
      showToast("خرید با موفقیت انجام شد.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خرید انجام نشد.";
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
              موجودی از دیتابیس خوانده می‌شود و هر خرید دقیقا یک کانفیگ را رزرو می‌کند.
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
                  {isLoading
                    ? "در حال پردازش..."
                    : plan.remainingCount === 0
                      ? "ناموجود"
                      : "خرید"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">بعد از خرید</h2>
          <p className="text-sm leading-6 text-slate-600">
            بعد از موفقیت تراکنش، کانفیگ خریداری‌شده همین‌جا نمایش داده می‌شود.
          </p>
        </div>

        {purchase ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-semibold">خرید کامل شد</div>
              <div className="mt-1">{purchase.planName}</div>
              <div className="mt-1 text-xs text-emerald-700">
                سفارش #{purchase.orderId} • {new Date(purchase.createdAt).toLocaleString("fa-IR")}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-sm leading-6 text-slate-100">
                {purchase.config}
              </pre>
            </div>

            <CopyButton value={purchase.config} />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            با خرید هر پلن موجود، کانفیگ اینجا نمایش داده می‌شود.
          </div>
        )}
      </aside>
    </div>
  );
}
