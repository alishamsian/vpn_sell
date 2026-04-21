"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";

type PaymentProofFormProps = {
  orderId: string;
  amount: string;
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
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "در حال ارسال..." : "ثبت رسید پرداخت"}
    </button>
  );
}

export function PaymentProofForm({ action, amount, orderId }: PaymentProofFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [clientError, setClientError] = useState("");

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

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium text-slate-700">
          مبلغ پرداختی
        </label>
        <input
          id="amount"
          name="amount"
          defaultValue={amount}
          dir="ltr"
          readOnly
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition"
        />
        <div className="text-xs text-slate-500">
          مبلغ این سفارش ثابت است و رسید باید دقیقا با همین مبلغ ثبت شود.
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="trackingCode" className="text-sm font-medium text-slate-700">
          کد پیگیری
        </label>
        <input
          id="trackingCode"
          name="trackingCode"
          dir="ltr"
          placeholder="مثلا 123456"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="cardLast4" className="text-sm font-medium text-slate-700">
          ۴ رقم آخر کارت پرداخت‌کننده
        </label>
        <input
          id="cardLast4"
          name="cardLast4"
          dir="ltr"
          maxLength={4}
          placeholder="1234"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium text-slate-700">
          تصویر رسید
        </label>
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleReceiptChange}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
        />
        <div className="text-xs text-slate-500">حداکثر حجم مجاز: ۲ مگابایت</div>
      </div>

      {clientError ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{clientError}</div>
      ) : null}

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton disabled={Boolean(clientError)} />
    </form>
  );
}
