"use client";

import { useActionState, useEffect } from "react";

import { createGiftCardAction, setGiftCardStatusAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminGiftCardsManager({
  giftCards,
}: {
  giftCards: Array<{
    id: string;
    code: string;
    initialAmount: string;
    balance: string;
    status: "ACTIVE" | "DISABLED" | "EXPIRED";
    createdAt: string;
  }>;
}) {
  const { showToast } = useToast();
  const [createState, createAction] = useActionState(createGiftCardAction, initialState);
  const [statusState, statusAction] = useActionState(setGiftCardStatusAction, initialState);

  useEffect(() => {
    if (createState.message && createState.status !== "idle") {
      showToast(createState.message, createState.status === "success" ? "success" : "error");
    }
  }, [createState.message, createState.status, showToast]);

  useEffect(() => {
    if (statusState.message && statusState.status !== "idle") {
      showToast(statusState.message, statusState.status === "success" ? "success" : "error");
    }
  }, [showToast, statusState.message, statusState.status]);

  return (
    <div className="space-y-8">
      <form action={createAction} className="grid gap-4 rounded-2xl border border-stroke bg-panel p-4 md:grid-cols-6">
        <label className="space-y-1 md:col-span-3">
          <div className="text-xs font-medium text-faint">کد بن</div>
          <input
            name="code"
            placeholder="GIFT-ABCD-1234"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium text-faint">مبلغ</div>
          <input
            name="amount"
            inputMode="numeric"
            placeholder="200000"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <div className="flex items-end md:col-span-1">
          <button type="submit" className="btn-brand w-full">
            ساخت
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-stroke">
        <table className="w-full text-sm">
          <thead className="bg-inset text-faint">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">کد</th>
              <th className="px-4 py-3 font-medium">موجودی</th>
              <th className="px-4 py-3 font-medium">اولیه</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">ساخته‌شده</th>
              <th className="px-4 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke/70 bg-panel">
            {giftCards.map((card) => (
              <tr key={card.id} className="text-prose">
                <td className="px-4 py-3 font-medium text-ink">{card.code}</td>
                <td className="px-4 py-3">{card.balance}</td>
                <td className="px-4 py-3">{card.initialAmount}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-stroke bg-inset px-3 py-1 text-xs font-medium text-ink">
                    {card.status}
                  </span>
                </td>
                <td className="px-4 py-3">{card.createdAt}</td>
                <td className="px-4 py-3">
                  <form action={statusAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="giftCardId" value={card.id} />
                    <button
                      type="submit"
                      name="status"
                      value="ACTIVE"
                      className="rounded-full border border-stroke bg-inset px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-elevated"
                    >
                      فعال
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="DISABLED"
                      className="rounded-full border border-stroke bg-inset px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-elevated"
                    >
                      غیرفعال
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {giftCards.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-faint">
                  هنوز هیچ بن خریدی ساخته نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

