"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { TonLiveConverter } from "@/components/ton-live-converter";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

const initialState: PaymentActionState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-brand w-full" disabled={pending}>
      <AppLoadingButtonLabel pending={pending} idleLabel="پرداخت با کیف‌پول" pendingLabel="در حال پرداخت…" />
    </button>
  );
}

export function WalletPayCard({
  payableToman,
  action,
  onTopUp,
}: {
  payableToman: number;
  action: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
  onTopUp?: () => void;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="rounded-3xl border border-stroke bg-panel p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-ink">پرداخت با کیف‌پول (۲۰٪ تخفیف)</h3>
      <p className="mt-2 text-sm leading-7 text-prose">
        اگر با کیف‌پول پرداخت کنید، ۲۰٪ تخفیف می‌گیرید و سفارش همان لحظه بعد از پرداخت وارد مراحل تحویل می‌شود.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
          <div className="text-xs font-medium text-faint">مبلغ قابل پرداخت (بعد از تخفیف)</div>
          <div className="mt-2 text-sm font-semibold text-ink">
            {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(payableToman)} تومان
          </div>
        </div>
        <TonLiveConverter tomanAmount={payableToman} />
      </div>

      {state.message ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="mt-4">
        <SubmitButton />
      </form>

      {onTopUp ? (
        <button
          type="button"
          onClick={onTopUp}
          className="mt-3 w-full rounded-2xl border border-stroke bg-inset px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-elevated"
        >
          افزایش اعتبار کیف‌پول
        </button>
      ) : null}
    </div>
  );
}

