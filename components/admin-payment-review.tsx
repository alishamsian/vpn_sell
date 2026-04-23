"use client";

import { useActionState, useEffect } from "react";

import { reviewPaymentAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";

type AdminPaymentReviewProps = {
  paymentId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

export function AdminPaymentReview({ paymentId, status }: AdminPaymentReviewProps) {
  const [state, formAction] = useActionState(reviewPaymentAction, initialState);
  const { showToast } = useToast();

  useEffect(() => {
    if (state.message && state.status !== "idle") {
      showToast(state.message, state.status === "success" ? "success" : "error");
    }
  }, [showToast, state.message, state.status]);

  if (status !== "PENDING") {
    return null;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="space-y-1.5">
        <label htmlFor={`review-note-${paymentId}`} className="text-xs font-medium text-prose">
          یادداشت بررسی
        </label>
        <textarea
          id={`review-note-${paymentId}`}
          name="reviewNote"
          rows={3}
          placeholder="برای تایید: اختیاری. برای رد پرداخت: الزامی — دلیل را برای کاربر بنویسید (مثلاً تصویر نامشخص، مبلغ نادرست، …)."
          className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
        />
        <p className="text-[11px] leading-5 text-faint">
          با «رد پرداخت» حداقل ۳ نویسه توضیح لازم است؛ همان متن در داشبورد کاربر و اعلان سایت نشان داده می‌شود.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approve"
          className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          تایید پرداخت
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          رد پرداخت
        </button>
      </div>
    </form>
  );
}
