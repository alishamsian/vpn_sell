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
      className="btn-brand w-full disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 disabled:hover:bg-slate-950 dark:disabled:hover:bg-slate-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel="ذخیره رمز جدید"
        pendingLabel="در حال ذخیره…"
        spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
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
    <div className="mx-auto max-w-md rounded-3xl border border-stroke bg-panel p-8 shadow-soft">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-ink">بازنشانی رمز عبور</h1>
        <p className="text-sm leading-6 text-prose">
          {userName ? `${userName}، ` : ""}رمز عبور جدید را وارد کنید. این لینک فقط یک بار قابل
          استفاده است.
        </p>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-prose">
            رمز عبور جدید
          </label>
          <input
            id="password"
            name="password"
            type="password"
            dir="ltr"
            placeholder="حداقل ۸ کاراکتر"
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-prose">
            تکرار رمز عبور جدید
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            dir="ltr"
            placeholder="تکرار رمز عبور"
            className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </div>

        {state.message ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {state.message}
          </div>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
