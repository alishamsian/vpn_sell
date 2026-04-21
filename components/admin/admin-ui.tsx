import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? <div className="text-sm font-medium text-slate-500">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}

export function AdminMetricCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 shadow-soft ${toneClass}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AdminQuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-soft"
    >
      <div className="text-base font-semibold text-slate-950">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{description}</div>
    </Link>
  );
}

export function AdminTableEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export function AdminPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
}
