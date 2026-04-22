"use client";

import { useActionState, useEffect } from "react";

import { reviewWalletTopUpAction } from "@/app/admin/actions";
import { ReceiptPreviewDialog } from "@/components/receipt-preview-dialog";
import { useToast } from "@/components/toast-provider";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminWalletTopUpsList({
  topUps,
}: {
  topUps: Array<{
    id: string;
    amountFormatted: string;
    trackingCode: string;
    cardLast4: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    reviewNote: string | null;
    createdAt: string;
    userLabel: string;
    previewReceiptUrl: string;
  }>;
}) {
  const { showToast } = useToast();
  const [state, action] = useActionState(reviewWalletTopUpAction, initialState);

  useEffect(() => {
    if (!state.message || state.status === "idle") return;
    showToast(state.message, state.status === "success" ? "success" : "error");
  }, [showToast, state.message, state.status]);

  return (
    <div className="grid gap-4">
      {topUps.map((item) => (
        <article key={item.id} className="rounded-3xl border border-stroke p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <div className="text-lg font-semibold text-ink">شارژ کیف‌پول</div>
              <div className="text-sm text-prose">کاربر: {item.userLabel}</div>
              <div className="text-sm text-prose">
                مبلغ: {item.amountFormatted} | کد پیگیری: {item.trackingCode}
              </div>
              <div className="text-sm text-prose">۴ رقم آخر کارت: {item.cardLast4}</div>
              <div className="text-sm text-prose">وضعیت: {translateStatus(item.status)}</div>
              <div className="text-xs text-faint">ثبت: {item.createdAt}</div>
            </div>

            <div className="space-y-3">
              <ReceiptPreviewDialog orderId={`wallet-topup-${item.id}`} receiptUrl={item.previewReceiptUrl} />
            </div>
          </div>

          {item.status === "PENDING" ? (
            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="topUpId" value={item.id} />
              <textarea
                name="reviewNote"
                rows={2}
                placeholder="یادداشت ادمین (اختیاری)"
                className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  name="decision"
                  value="approve"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  تایید شارژ
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="reject"
                  className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  رد شارژ
                </button>
              </div>
            </form>
          ) : item.reviewNote ? (
            <div className="mt-4 rounded-2xl bg-inset px-4 py-3 text-sm text-prose">یادداشت: {item.reviewNote}</div>
          ) : null}
        </article>
      ))}

      {topUps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-10 text-center text-sm text-faint">
          هنوز هیچ شارژی ثبت نشده است.
        </div>
      ) : null}
    </div>
  );
}

function translateStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "PENDING") return "در انتظار بررسی";
  if (status === "APPROVED") return "تایید شده";
  return "رد شده";
}

