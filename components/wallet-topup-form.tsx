"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { TonLiveConverter } from "@/components/ton-live-converter";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

type WalletTopUpFormProps = {
  action: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
};

const initialState: PaymentActionState = { status: "idle", message: "" };

const MAX_RECEIPT_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-brand w-full">
      <AppLoadingButtonLabel pending={pending} idleLabel="ثبت شارژ کیف‌پول" pendingLabel="در حال ارسال…" />
    </button>
  );
}

export function WalletTopUpForm({ action }: WalletTopUpFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [clientError, setClientError] = useState("");
  const [amountValue, setAmountValue] = useState("");

  const tomanAmount = useMemo(() => {
    const parsed = Number(String(amountValue).replace(/[,\s]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountValue]);

  function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      setClientError("");
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      event.currentTarget.value = "";
      setClientError("حجم تصویر رسید نباید بیشتر از ۲ مگابایت باشد.");
      return;
    }

    setClientError("");
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <div className="text-sm font-medium text-prose">مبلغ شارژ (تومان)</div>
          <input
            name="amount"
            dir="ltr"
            inputMode="numeric"
            placeholder="مثلا 200000"
            value={amountValue}
            onChange={(event) => setAmountValue(event.currentTarget.value)}
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <TonLiveConverter tomanAmount={tomanAmount} label="معادل TON (برای مبلغ شارژ)" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <div className="text-sm font-medium text-prose">کد پیگیری</div>
          <input
            name="trackingCode"
            dir="ltr"
            placeholder="مثلا 123456"
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-2">
          <div className="text-sm font-medium text-prose">۴ رقم آخر کارت</div>
          <input
            name="cardLast4"
            dir="ltr"
            maxLength={4}
            placeholder="1234"
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-prose">تصویر رسید</div>
        <input
          name="receipt"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleReceiptChange}
          className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
        />
        <div className="text-xs text-faint">حداکثر حجم مجاز: ۲ مگابایت</div>
      </div>

      {clientError ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
          {clientError}
        </div>
      ) : null}

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton disabled={Boolean(clientError)} />
    </form>
  );
}

