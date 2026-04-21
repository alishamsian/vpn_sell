"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthActionState } from "@/app/(auth)/actions";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

type AuthFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  alternateLabel: string;
  alternateHref: string;
  alternateText: string;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  notice?: string;
  helperLink?: {
    label: string;
    href: string;
  };
  fields: Array<
    | {
        name: string;
        label: string;
        type?: "text" | "email" | "password";
        placeholder?: string;
      }
    | {
        name: string;
        label: string;
        type: "phone";
        placeholder?: string;
      }
  >;
};

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand w-full disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100 disabled:active:scale-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel={label}
        pendingLabel="در حال پردازش…"
        spinnerClassName="h-4 w-4 text-white"
      />
    </button>
  );
}

export function AuthForm(props: AuthFormProps) {
  const [state, formAction] = useActionState(props.action, initialState);

  return (
    <div className="card-surface mx-auto max-w-md rounded-3xl p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">{props.title}</h1>
        <p className="text-sm leading-6 text-slate-600">{props.description}</p>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        {props.notice ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{props.notice}</div>
        ) : null}

        {props.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label htmlFor={field.name} className="text-sm font-medium text-slate-700">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type === "phone" ? "text" : field.type ?? "text"}
              dir={field.type === "phone" || field.type === "email" || field.type === "password" ? "ltr" : "rtl"}
              placeholder={field.placeholder}
              className="input-brand"
            />
          </div>
        ))}

        {state.message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              state.status === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        {props.helperLink ? (
          <div className="text-left text-sm">
            <Link href={props.helperLink.href} className="link-brand">
              {props.helperLink.label}
            </Link>
          </div>
        ) : null}

        <SubmitButton label={props.submitLabel} />
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {props.alternateText}{" "}
        <Link href={props.alternateHref} className="font-semibold text-slate-950 underline-offset-4 transition hover:text-brand-cyan hover:underline">
          {props.alternateLabel}
        </Link>
      </p>
    </div>
  );
}
