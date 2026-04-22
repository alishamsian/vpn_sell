"use client";

import { useActionState, useEffect } from "react";

import { adjustWalletAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminWalletAdjuster({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [state, action] = useActionState(adjustWalletAction, initialState);

  useEffect(() => {
    if (state.message && state.status !== "idle") {
      showToast(state.message, state.status === "success" ? "success" : "error");
    }
  }, [showToast, state.message, state.status]);

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-stroke bg-panel p-4 md:grid-cols-6">
      <input type="hidden" name="userId" value={userId} />
      <label className="space-y-1 md:col-span-2">
        <div className="text-xs font-medium text-faint">مبلغ (مثبت/منفی)</div>
        <input
          name="amount"
          inputMode="numeric"
          placeholder="50000 یا -20000"
          className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
        />
      </label>
      <label className="space-y-1 md:col-span-4">
        <div className="text-xs font-medium text-faint">دلیل</div>
        <input
          name="reason"
          placeholder="تنظیم دستی توسط ادمین"
          className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
        />
      </label>
      <div className="md:col-span-6">
        <button type="submit" className="btn-brand">
          اعمال تنظیم
        </button>
      </div>
    </form>
  );
}

