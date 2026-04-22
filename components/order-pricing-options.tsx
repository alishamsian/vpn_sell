"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { useToast } from "@/components/toast-provider";

const initialState: PaymentActionState = { status: "idle", message: "" };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-brand" disabled={pending || disabled}>
      {pending ? "در حال اعمال…" : "اعمال و به‌روزرسانی مبلغ"}
    </button>
  );
}

type PricingOptionMode = "coupon" | "gift";

export function OrderPricingOptions({
  action,
  disabled,
}: {
  action: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
  disabled?: boolean;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const [mode, setMode] = useState<PricingOptionMode>("coupon");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!state.message || state.status === "idle") return;
    showToast(state.message, state.status === "success" ? "success" : "error");
    if (state.status === "success") {
      // به جای رفرش کامل صفحه، داده‌های سرورکامپوننت را نرم refresh می‌کنیم
      window.setTimeout(() => {
        router.refresh();
      }, 50);
    }
  }, [router, showToast, state.message, state.status]);

  return (
    <form action={formAction} className="rounded-3xl border border-stroke bg-panel p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">اعمال کد</h3>
          <p className="mt-1 text-sm leading-7 text-prose">
            فقط یکی از گزینه‌ها را انتخاب کنید: کوپن یا بن خرید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCode("")}
          disabled={disabled}
          className="rounded-full border border-stroke bg-inset px-3 py-1.5 text-xs font-medium text-prose transition hover:bg-elevated disabled:opacity-60"
        >
          پاک کردن
        </button>
      </div>

      <div className="mt-4">
        <div className="flex gap-1 rounded-2xl bg-elevated p-1">
          <button
            type="button"
            onClick={() => setMode("coupon")}
            disabled={disabled}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              mode === "coupon" ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
            }`}
          >
            کد تخفیف
          </button>
          <button
            type="button"
            onClick={() => setMode("gift")}
            disabled={disabled}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              mode === "gift" ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
            }`}
          >
            بن خرید
          </button>
        </div>
      </div>

      {/* برای اکشن سرور هر دو فیلد را می‌فرستیم، یکی خالی می‌ماند */}
      <input type="hidden" name="couponCode" value={mode === "coupon" ? code : ""} />
      <input type="hidden" name="giftCardCode" value={mode === "gift" ? code : ""} />

      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-faint">{mode === "coupon" ? "کد تخفیف" : "کد بن خرید"}</div>
        <input
          value={code}
          onChange={(event) => setCode(event.currentTarget.value)}
          placeholder={mode === "coupon" ? "مثلاً SPRING1405" : "مثلاً GIFT-ABCD-1234"}
          disabled={disabled}
          dir="ltr"
          className="w-full rounded-2xl border border-stroke bg-inset px-4 py-3 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20 disabled:opacity-60"
        />
        <div className="text-xs text-faint">برای برداشتن کد، «پاک کردن» را بزنید و سپس اعمال کنید.</div>
      </div>

      <div className="mt-4">
        <SubmitButton disabled={disabled} />
      </div>
    </form>
  );
}

