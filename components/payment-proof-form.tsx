"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { useToast } from "@/components/toast-provider";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

type PaymentProofFormProps = {
  orderId: string;
  amount: string;
  showAmountField?: boolean;
  trackingLabel?: string;
  trackingPlaceholder?: string;
  showCardLast4Field?: boolean;
  cardLast4Default?: string;
  action: (
    state: PaymentActionState,
    formData: FormData,
  ) => Promise<PaymentActionState>;
};

const initialState: PaymentActionState = {
  status: "idle",
  message: "",
};

const MAX_RECEIPT_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-brand w-full disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 disabled:hover:bg-slate-950 dark:disabled:hover:bg-slate-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel="ثبت رسید پرداخت"
        pendingLabel="در حال ارسال…"
        spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
      />
    </button>
  );
}

export function PaymentProofForm({
  action,
  amount,
  orderId,
  showAmountField = true,
  trackingLabel,
  trackingPlaceholder,
  showCardLast4Field,
  cardLast4Default,
}: PaymentProofFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [clientError, setClientError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!state.message || state.status === "idle") {
      return;
    }

    showToast(state.message, state.status === "success" ? "success" : "error");
  }, [showToast, state.message, state.status]);

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
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="amount" value={amount} />

      {showAmountField ? (
        <div className="space-y-2">
          <div className="text-sm font-medium text-prose">مبلغ پرداختی (تومان)</div>
          <div className="w-full rounded-2xl border border-stroke bg-inset px-4 py-3 font-mono font-semibold text-ink" dir="ltr">
            {amount}
          </div>
          <div className="text-xs text-faint">
            مبلغ این سفارش ثابت است و رسید باید دقیقا با همین مبلغ ثبت شود.
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="trackingCode" className="text-sm font-medium text-prose">
          {trackingLabel ?? "کد پیگیری"}
        </label>
        <input
          id="trackingCode"
          name="trackingCode"
          dir="ltr"
          placeholder={trackingPlaceholder ?? "مثلا 123456"}
          className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
        />
      </div>

      {showCardLast4Field === false ? (
        <input type="hidden" name="cardLast4" value={cardLast4Default ?? "0000"} />
      ) : (
        <div className="space-y-2">
          <label htmlFor="cardLast4" className="text-sm font-medium text-prose">
            ۴ رقم آخر کارت پرداخت‌کننده
          </label>
          <input
            id="cardLast4"
            name="cardLast4"
            dir="ltr"
            maxLength={4}
            placeholder="1234"
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium text-prose">
          تصویر رسید
        </label>
        <input
          id="receipt"
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
