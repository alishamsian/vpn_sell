"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthActionState } from "@/app/(auth)/actions";

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
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "در حال پردازش..." : label}
    </button>
  );
}

export function AuthForm(props: AuthFormProps) {
  const [state, formAction] = useActionState(props.action, initialState);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
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
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
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
            <Link href={props.helperLink.href} className="font-medium text-sky-700 transition hover:text-sky-800">
              {props.helperLink.label}
            </Link>
          </div>
        ) : null}

        <SubmitButton label={props.submitLabel} />
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {props.alternateText}{" "}
        <Link href={props.alternateHref} className="font-medium text-slate-950">
          {props.alternateLabel}
        </Link>
      </p>
    </div>
  );
}
