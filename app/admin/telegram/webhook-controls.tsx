"use client";

import { useActionState, useEffect } from "react";

import { useToast } from "@/components/toast-provider";

import { setWebhookFromAdminAction } from "./actions";

type ActionState =
  | { status: "idle"; message?: string }
  | { status: "success"; message: string; debug?: unknown }
  | { status: "error"; message: string; debug?: unknown };

const initialState: ActionState = { status: "idle" };

export function WebhookControls() {
  const { showToast } = useToast();
  const [state, action] = useActionState(setWebhookFromAdminAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      showToast(state.message, "success");
    } else if (state.status === "error") {
      showToast(state.message, "error");
    }
  }, [showToast, state]);

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-brand-sm">
          تنظیم/آپدیت وب‌هوک
        </button>
        <div className="text-xs text-faint">
          نکته: اگر روی Vercel «Deployment Protection» فعال باشد، تلگرام به وب‌هوک دسترسی ندارد.
        </div>
      </form>

      {state.status !== "idle" && state.debug ? (
        <details className="rounded-2xl border border-stroke bg-inset px-4 py-3 text-xs text-prose">
          <summary className="cursor-pointer select-none font-medium text-ink">جزئیات فنی (برای عیب‌یابی)</summary>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-faint" dir="ltr">
            {JSON.stringify(state.debug, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

