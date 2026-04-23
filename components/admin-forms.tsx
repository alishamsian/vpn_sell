"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createPlanAction } from "@/app/admin/actions";
import { AdminInventoryPanel } from "@/components/admin/admin-inventory-panel";
import { useToast } from "@/components/toast-provider";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";
import type { AdminPlanDashboard } from "@/lib/queries";

type AdminFormsProps = {
  plans: AdminPlanDashboard[];
};

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
};

function SubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 disabled:hover:bg-slate-950 dark:disabled:hover:bg-slate-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel={idleLabel}
        pendingLabel={pendingLabel}
        spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
      />
    </button>
  );
}

function FormMessage({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`text-sm ${
        status === "success"
          ? "text-emerald-700 dark:text-emerald-200"
          : status === "error"
            ? "text-rose-700 dark:text-rose-200"
            : "text-faint"
      }`}
    >
      {message}
    </p>
  );
}

export function AdminForms({ plans }: AdminFormsProps) {
  const [planState, planFormAction] = useActionState(createPlanAction, initialAdminActionState);
  const { showToast } = useToast();
  const planFormRef = useRef<HTMLFormElement>(null);
  const [desktopUi, setDesktopUi] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");

    const apply = () => {
      setDesktopUi(media.matches);
    };

    apply();

    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (planState.status === "success" && planState.message) {
      showToast(planState.message, "success");
      planFormRef.current?.reset();
    }
  }, [planState.message, planState.status, showToast]);

  return (
    <section className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
      <details
        open={desktopUi}
        className="group rounded-3xl border border-stroke bg-panel shadow-soft open:bg-panel"
      >
        <summary className="cursor-pointer list-none rounded-3xl px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink sm:text-xl">ساخت پلن</h2>
              <p className="text-sm text-prose">قیمت تومانی، مدت اشتراک و محدودیت کاربر (اختیاری).</p>
            </div>
            <span className="shrink-0 rounded-full border border-stroke bg-inset px-3 py-1 text-[11px] font-semibold text-prose transition group-open:border-stroke group-open:bg-panel group-open:text-ink">
              {desktopUi ? "باز" : "باز/بسته"}
            </span>
          </div>
        </summary>

        <div className="border-t border-stroke/70 px-5 pb-6 pt-2 sm:px-6">
          <form ref={planFormRef} action={planFormAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-prose">
                نام پلن
              </label>
              <input
                id="name"
                name="name"
                placeholder="مثلا پلن پایه ۲۰ گیگ"
                className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium text-prose">
                قیمت (تومان)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="1"
                placeholder="249000"
                dir="ltr"
                className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="durationDays" className="text-sm font-medium text-prose">
                مدت اشتراک (روز)
              </label>
              <input
                id="durationDays"
                name="durationDays"
                type="number"
                min="1"
                step="1"
                placeholder="30"
                dir="ltr"
                className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maxUsers" className="text-sm font-medium text-prose">
                حداکثر کاربر (اختیاری)
              </label>
              <input
                id="maxUsers"
                name="maxUsers"
                type="number"
                min="1"
                step="1"
                placeholder="خالی یعنی بدون محدودیت"
                dir="ltr"
                className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
              />
              <div className="text-xs text-faint">اگر خالی بماند، پلن با «بدون محدودیت کاربر» ساخته می‌شود.</div>
            </div>

            <SubmitButton idleLabel="ایجاد پلن" pendingLabel="در حال ایجاد..." />
            <FormMessage status={planState.status} message={planState.message} />
          </form>
        </div>
      </details>

      <AdminInventoryPanel plans={plans} />
    </section>
  );
}
