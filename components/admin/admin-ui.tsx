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
    <section className="card-surface px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? <div className="text-sm font-medium text-faint">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-7 text-prose">{description}</p> : null}
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
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/45"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/40"
          : "border-stroke bg-panel";

  return (
    <div className={`rounded-card border p-5 shadow-soft ${toneClass}`}>
      <div className="text-sm text-faint">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {hint ? <div className="mt-2 text-xs text-faint">{hint}</div> : null}
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
    <section className="card-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-prose">{description}</p> : null}
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
      className="card-surface block p-5 transition hover:-translate-y-0.5 hover:border-sky-300/80 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-sky-600/50"
    >
      <div className="text-base font-semibold text-ink">{title}</div>
      <div className="mt-2 text-sm leading-7 text-prose">{description}</div>
    </Link>
  );
}

export function AdminTableEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-10 text-center text-sm text-faint">
      {label}
    </div>
  );
}

export function AdminPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-stroke px-3 py-1 text-xs font-medium text-prose">
      {label}
    </span>
  );
}
