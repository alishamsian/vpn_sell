"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { addAccountsAction, createPlanAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";
import type { PlanInventory } from "@/lib/queries";

type AdminFormsProps = {
  plans: PlanInventory[];
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
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? pendingLabel : idleLabel}
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
          ? "text-emerald-700"
          : status === "error"
            ? "text-rose-700"
            : "text-slate-500"
      }`}
    >
      {message}
    </p>
  );
}

export function AdminForms({ plans }: AdminFormsProps) {
  const [planState, planFormAction] = useActionState(createPlanAction, initialAdminActionState);
  const [accountState, accountFormAction] = useActionState(
    addAccountsAction,
    initialAdminActionState,
  );
  const { showToast } = useToast();
  const planFormRef = useRef<HTMLFormElement>(null);
  const accountFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (planState.status === "success" && planState.message) {
      showToast(planState.message, "success");
      planFormRef.current?.reset();
    }
  }, [planState.message, planState.status, showToast]);

  useEffect(() => {
    if (accountState.status === "success" && accountState.message) {
      showToast(accountState.message, "success");
      accountFormRef.current?.reset();
    }
  }, [accountState.message, accountState.status, showToast]);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">ساخت پلن</h2>
          <p className="text-sm text-slate-600">یک پلن فروش VPN با قیمت ثابت اضافه کنید.</p>
        </div>

        <form ref={planFormRef} action={planFormAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              نام پلن
            </label>
            <input
              id="name"
              name="name"
              placeholder="۲۰ گیگ / ۳۰ روز"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium text-slate-700">
              قیمت
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="9.99"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </div>

          <SubmitButton idleLabel="ایجاد پلن" pendingLabel="در حال ایجاد..." />
          <FormMessage status={planState.status} message={planState.message} />
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-950">افزودن گروهی اکانت‌ها</h2>
          <p className="text-sm text-slate-600">برای پلن انتخاب‌شده، هر کانفیگ را در یک خط قرار بده.</p>
        </div>

        <form ref={accountFormRef} action={accountFormAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="planId" className="text-sm font-medium text-slate-700">
              پلن
            </label>
            <select
              id="planId"
              name="planId"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              defaultValue=""
            >
              <option value="" disabled>
                یک پلن انتخاب کنید
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="configs" className="text-sm font-medium text-slate-700">
              کانفیگ‌ها
            </label>
            <textarea
              id="configs"
              name="configs"
              rows={8}
              placeholder={"vmess://...\nvless://...\ntrojan://..."}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </div>

          <SubmitButton idleLabel="افزودن اکانت‌ها" pendingLabel="در حال ذخیره..." />
          <FormMessage status={accountState.status} message={accountState.message} />
        </form>
      </div>
    </section>
  );
}
