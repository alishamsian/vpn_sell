"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  resetPasswordAction,
  type PasswordResetConfirmState,
} from "@/app/(auth)/actions";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

const initialState: PasswordResetConfirmState = {
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
        idleLabel="ذخیره رمز جدید"
        pendingLabel="در حال ذخیره…"
        spinnerClassName="h-4 w-4 text-white"
      />
    </button>
  );
}

export function PasswordResetConfirmForm({
  token,
  userName,
}: {
  token: string;
  userName: string | null;
}) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">بازنشانی رمز عبور</h1>
        <p className="text-sm leading-6 text-slate-600">
          {userName ? `${userName}، ` : ""}رمز عبور جدید را وارد کنید. این لینک فقط یک بار قابل
          استفاده است.
        </p>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            رمز عبور جدید
          </label>
          <input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            placeholder="حداقل ۸ کاراکتر"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            تکرار رمز عبور جدید
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            dir="ltr"
            placeholder="تکرار رمز عبور"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          />
        </div>

        {state.message ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.message}</div>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
