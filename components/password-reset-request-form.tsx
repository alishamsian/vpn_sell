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
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel="ارسال لینک بازنشانی"
        pendingLabel="در حال ارسال…"
        spinnerClassName="h-4 w-4 text-white"
      />
    </button>
  );
}

export function PasswordResetRequestForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">فراموشی رمز عبور</h1>
        <p className="text-sm leading-6 text-slate-600">
          ایمیل یا شماره موبایل حساب را وارد کنید. اگر روی حساب شما ایمیل ثبت شده باشد، لینک
          بازنشانی ارسال می‌شود.
        </p>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label htmlFor="identifier" className="text-sm font-medium text-slate-700">
            ایمیل یا شماره موبایل
          </label>
          <input
            id="identifier"
            name="identifier"
            dir="ltr"
            placeholder="example@mail.com یا 0912..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
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

      <p className="mt-6 text-center text-sm text-slate-600">
        یادت آمد؟{" "}
        <Link href="/login" className="font-medium text-slate-950">
          بازگشت به ورود
        </Link>
      </p>
    </div>
  );
}
