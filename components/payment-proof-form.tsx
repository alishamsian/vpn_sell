"use client";

import { useActionState } from "react";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "در حال ارسال..." : "ثبت رسید پرداخت"}
    </button>
  );
}

export function PaymentProofForm({ action, amount, orderId }: PaymentProofFormProps) {
  const [state, formAction] = useActionState(action, initialState);

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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
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
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
        />
      </div>

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

      <SubmitButton />
    </form>
  );
}
