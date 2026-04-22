"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import type { RenewActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { renewPlanAction } from "@/app/dashboard/orders/[orderId]/actions";
import { useToast } from "@/components/toast-provider";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

const initialState: RenewActionState = {
  status: "idle",
  message: "",
};

type RenewPlanButtonProps = {
  orderId: string;
};

export function RenewPlanButton({ orderId }: RenewPlanButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    renewPlanAction.bind(null, orderId),
    initialState,
  );

  useEffect(() => {
    if (!state.message || state.status === "idle") {
      return;
    }

    showToast(state.message, state.status === "success" ? "success" : "error");

    if (state.status === "success" && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, showToast, state.message, state.redirectTo, state.status]);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-prose transition hover:border-slate-400 hover:bg-inset disabled:cursor-not-allowed disabled:opacity-60"
      >
        <AppLoadingButtonLabel
          pending={pending}
          idleLabel="تمدید همین پلن"
          pendingLabel="در حال ساخت سفارش…"
          spinnerClassName="h-4 w-4 text-prose"
        />
      </button>
    </form>
  );
}
