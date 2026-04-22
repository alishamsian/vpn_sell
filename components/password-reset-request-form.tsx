"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestPasswordResetAction,
  type PasswordResetRequestState,
} from "@/app/(auth)/actions";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

const initialState: PasswordResetRequestState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand w-full disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 disabled:hover:bg-slate-950 dark:disabled:hover:bg-slate-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel="ارسال لینک بازنشانی"
        pendingLabel="در حال ارسال…"
        spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
      />
    </button>
  );
}

export function PasswordResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-stroke bg-panel p-8 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-ink">فراموشی رمز عبور</h1>
        <p className="text-sm leading-6 text-prose">
          ایمیل یا شماره موبایل حساب را وارد کنید. اگر روی حساب شما ایمیل ثبت شده باشد، لینک
          بازنشانی ارسال می‌شود.
        </p>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-sm font-medium text-prose">
            ایمیل یا شماره موبایل
          </label>
          <input
            id="identifier"
            name="identifier"
            dir="ltr"
            placeholder="example@mail.com یا 0912..."
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </div>

        {state.message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              state.status === "error"
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
            }`}
          >
            <div>{state.message}</div>
            {state.debugUrl ? (
              <div className="mt-2 break-all text-xs">
                لینک توسعه:{" "}
                <a href={state.debugUrl} className="font-medium underline">
                  {state.debugUrl}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-prose">
        یادت آمد؟{" "}
        <Link href="/login" className="font-medium text-ink">
          بازگشت به ورود
        </Link>
      </p>
    </div>
  );
}
