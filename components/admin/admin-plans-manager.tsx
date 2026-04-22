"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deletePlanAction,
  duplicatePlanAction,
  updatePlanAction,
} from "@/app/admin/actions";
import type { AdminActionState } from "@/app/admin/actions";
import type { AdminPlanDashboard } from "@/lib/queries";
import { formatDuration, formatPrice, formatUserLimit } from "@/lib/format";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";

type AdminPlansManagerProps = {
  plans: AdminPlanDashboard[];
};

const initialActionState: AdminActionState = {
  status: "idle",
  message: "",
};

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = "primary",
  disabled = false,
  fullWidth = false,
}: {
  idleLabel: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();

  const className =
    variant === "danger"
      ? "rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
      : variant === "secondary"
        ? "rounded-2xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-prose transition hover:border-stroke hover:text-ink disabled:cursor-not-allowed disabled:bg-elevated"
        : "rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300";

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${className}${fullWidth ? " w-full" : ""}`}
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel={idleLabel}
        pendingLabel={pendingLabel}
        spinnerClassName={
          variant === "danger"
            ? "h-4 w-4 text-white"
            : variant === "secondary"
              ? "h-4 w-4 text-prose"
              : "h-4 w-4 text-white"
        }
      />
    </button>
  );
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        state.status === "error"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          : state.status === "success"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-inset text-prose"
      }`}
    >
      {state.message}
    </div>
  );
}

export function AdminPlansManager({ plans }: AdminPlansManagerProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"inventory_desc" | "inventory_asc" | "price_desc" | "price_asc" | "name">(
    "inventory_desc",
  );
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeDigits(query.trim().toLowerCase());

    const list = plans.filter((plan) => {
      if (onlyLowStock && plan.remainingCount > 2) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = normalizeDigits(`${plan.name} ${plan.id}`.toLowerCase());

      return haystack.includes(normalizedQuery);
    });

    const sorted = [...list].sort((left, right) => {
      if (sort === "inventory_desc") {
        return right.remainingCount - left.remainingCount;
      }

      if (sort === "inventory_asc") {
        return left.remainingCount - right.remainingCount;
      }

      if (sort === "price_desc") {
        return right.price - left.price;
      }

      if (sort === "price_asc") {
        return left.price - right.price;
      }

      return left.name.localeCompare(right.name, "fa");
    });

    return sorted;
  }, [onlyLowStock, plans, query, sort]);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-stroke bg-panel/80 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyLowStock((current) => !current)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                onlyLowStock
                  ? "bg-amber-600 text-white shadow-sm"
                  : "border border-stroke bg-panel text-prose hover:border-stroke"
              }`}
            >
              فقط موجودی کم
            </button>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="text-xs text-faint">
              نمایش{" "}
              <span className="font-semibold text-ink">{new Intl.NumberFormat("fa-IR").format(filtered.length)}</span>{" "}
              از{" "}
              <span className="font-semibold text-ink">{new Intl.NumberFormat("fa-IR").format(plans.length)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl lg:grid-cols-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو بر اساس نام یا شناسه پلن..."
              className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            >
              <option value="inventory_desc">مرتب‌سازی: بیشترین موجودی</option>
              <option value="inventory_asc">مرتب‌سازی: کمترین موجودی</option>
              <option value="price_desc">مرتب‌سازی: گران‌ترین</option>
              <option value="price_asc">مرتب‌سازی: ارزان‌ترین</option>
              <option value="name">مرتب‌سازی: نام</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stroke bg-inset px-4 py-10 text-center text-sm text-faint">
          پلنی با این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((plan) => (
            <PlanAdminCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanAdminCard({ plan }: { plan: AdminPlanDashboard }) {
  const [updateState, updateAction] = useActionState(updatePlanAction, initialActionState);
  const [duplicateState, duplicateAction] = useActionState(duplicatePlanAction, initialActionState);
  const [deleteState, deleteAction] = useActionState(deletePlanAction, initialActionState);

  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"edit" | "actions">("edit");

  useEffect(() => {
    if (!manageOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [manageOpen]);

  useEffect(() => {
    if (!manageOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setManageOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [manageOpen]);

  const openManage = (tab: "edit" | "actions") => {
    setManageTab(tab);
    setManageOpen(true);
  };

  const isLowStock = plan.remainingCount <= 2;

  return (
    <div className="rounded-card border border-stroke bg-panel p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-ink">{plan.name}</h3>
            {isLowStock ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                هشدار موجودی
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
            <span className="font-mono" dir="ltr">
              {plan.id}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(plan.id);
              }}
              className="rounded-full border border-stroke bg-panel px-2.5 py-1 text-xs font-medium text-prose transition hover:border-stroke"
            >
              کپی شناسه
            </button>
          </div>
        </div>

        <div className="text-left">
          <div className="text-sm font-semibold text-ink">{formatPrice(plan.price)}</div>
          <div className="mt-1 text-xs text-faint">
            {formatDuration(plan.durationDays)} • {formatUserLimit(plan.maxUsers)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <KpiChip label="موجودی" value={new Intl.NumberFormat("fa-IR").format(plan.remainingCount)} tone="slate" />
        <KpiChip label="فروخته" value={new Intl.NumberFormat("fa-IR").format(plan.soldCount)} tone="slate" />
        <KpiChip label="کل سفارش" value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.total)} tone="sky" />
        <KpiChip label="درآمد (~)" value={formatPrice(plan.revenueToman)} tone="emerald" />
        {plan.pendingPaymentReviews > 0 ? (
          <KpiChip
            label="صف بررسی"
            value={new Intl.NumberFormat("fa-IR").format(plan.pendingPaymentReviews)}
            tone="amber"
          />
        ) : null}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-faint">
        «درآمد (~)» تخمینی است و بر اساس سفارش‌های Fulfilled یا پرداخت‌های Approved محاسبه می‌شود.
      </div>

      <details className="group mt-4 rounded-2xl border border-stroke bg-panel/70 px-3 py-2 sm:px-4 sm:py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <span>جزئیات وضعیت سفارش‌ها</span>
            <span className="rounded-full border border-stroke bg-panel px-2.5 py-1 text-[11px] font-medium text-prose transition group-open:border-stroke group-open:text-ink">
              باز/بسته
            </span>
          </div>
          <div className="mt-1 text-xs leading-relaxed text-faint">
            تفکیک مراحل سفارش و تعداد سفارش‌هایی که هنوز رسیدشان در صف بررسی پرداخت است.
          </div>
        </summary>

        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill label="کل سفارش" value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.total)} compact />
            <StatPill
              label="در انتظار بررسی پرداخت"
              value={new Intl.NumberFormat("fa-IR").format(plan.pendingPaymentReviews)}
              compact
            />
            <StatPill label="موجودی" value={new Intl.NumberFormat("fa-IR").format(plan.remainingCount)} compact />
            <StatPill label="فروخته‌شده" value={new Intl.NumberFormat("fa-IR").format(plan.soldCount)} compact />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill
              label="منتظر پرداخت"
              value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.pendingPayment)}
              compact
            />
            <StatPill
              label="در حال بررسی رسید"
              value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.paymentSubmitted)}
              compact
            />
            <StatPill
              label="منتظر اکانت"
              value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.waitingForAccount)}
              compact
            />
            <StatPill label="تحویل‌شده" value={new Intl.NumberFormat("fa-IR").format(plan.orderCounts.fulfilled)} compact />
          </div>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openManage("edit")}
          className="rounded-2xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:border-stroke hover:bg-inset"
        >
          ویرایش پلن
        </button>
        <button
          type="button"
          onClick={() => openManage("actions")}
          className="rounded-2xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:border-stroke hover:bg-inset"
        >
          عملیات سریع
        </button>
      </div>

      {manageOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          dir="rtl"
        >
          <button
            type="button"
            aria-label="بستن پنجره"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setManageOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`plan-manage-title-${plan.id}`}
            className="relative z-[1] flex max-h-[min(90dvh,52rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stroke bg-panel shadow-2xl sm:rounded-3xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stroke/70 px-4 pb-3 pt-4 sm:px-5">
              <div className="min-w-0">
                <h4 id={`plan-manage-title-${plan.id}`} className="truncate text-base font-semibold text-ink">
                  {plan.name}
                </h4>
                <p className="mt-0.5 text-xs text-faint">مدیریت پلن</p>
              </div>
              <button
                type="button"
                onClick={() => setManageOpen(false)}
                className="shrink-0 rounded-full border border-stroke bg-panel px-3 py-1.5 text-xs font-medium text-prose transition hover:bg-inset"
              >
                بستن
              </button>
            </div>

            <div className="shrink-0 border-b border-stroke/70 px-4 py-2 sm:px-5">
              <div className="flex gap-1 rounded-2xl bg-elevated p-1">
                <button
                  type="button"
                  onClick={() => setManageTab("edit")}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    manageTab === "edit"
                      ? "bg-panel text-ink shadow-sm"
                      : "text-prose hover:text-ink"
                  }`}
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab("actions")}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    manageTab === "actions"
                      ? "bg-panel text-ink shadow-sm"
                      : "text-prose hover:text-ink"
                  }`}
                >
                  عملیات سریع
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              {manageTab === "edit" ? (
                <form action={updateAction} className="flex flex-col gap-4">
                  <p className="text-xs leading-relaxed text-faint">
                    نام، قیمت، مدت و محدودیت کاربر را به‌روزرسانی کنید؛ ذخیره فقط این پلن را تغییر می‌دهد.
                  </p>
                  <input type="hidden" name="planId" value={plan.id} />

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-prose" htmlFor={`name-${plan.id}`}>
                      نام پلن
                    </label>
                    <input
                      id={`name-${plan.id}`}
                      name="name"
                      defaultValue={plan.name}
                      className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-prose" htmlFor={`price-${plan.id}`}>
                        قیمت (تومان)
                      </label>
                      <input
                        id={`price-${plan.id}`}
                        name="price"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={String(plan.price)}
                        dir="ltr"
                        className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-prose" htmlFor={`duration-${plan.id}`}>
                        مدت (روز)
                      </label>
                      <input
                        id={`duration-${plan.id}`}
                        name="durationDays"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={String(plan.durationDays)}
                        dir="ltr"
                        className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-prose" htmlFor={`maxUsers-${plan.id}`}>
                      حداکثر کاربر (خالی = بدون محدودیت)
                    </label>
                    <input
                      id={`maxUsers-${plan.id}`}
                      name="maxUsers"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={plan.maxUsers == null ? "" : String(plan.maxUsers)}
                      placeholder="خالی"
                      dir="ltr"
                      className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                    />
                  </div>

                  <div className="space-y-3 border-t border-stroke/70 pt-4">
                    <ActionMessage state={updateState} />
                    <SubmitButton fullWidth idleLabel="ذخیره تغییرات" pendingLabel="در حال ذخیره..." />
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-5">
                  <p className="text-xs leading-relaxed text-faint">
                    کپی برای ساخت پلن مشابه؛ حذف فقط وقتی هنوز سفارشی برای این پلن ثبت نشده باشد.
                  </p>

                  <form action={duplicateAction} className="flex flex-col gap-3">
                    <input type="hidden" name="planId" value={plan.id} />
                    <div className="rounded-2xl border border-stroke/70 bg-inset/80 px-3 py-2.5 text-xs text-prose">
                      یک پلن جدید با همان مشخصات ایجاد می‌شود؛ بعداً می‌توانید نام یا قیمت را جدا ویرایش کنید.
                    </div>
                    <ActionMessage state={duplicateState} />
                    <SubmitButton
                      fullWidth
                      variant="secondary"
                      idleLabel="کپی پلن"
                      pendingLabel="در حال کپی..."
                    />
                  </form>

                  {plan.canDelete ? (
                    <form action={deleteAction} className="flex flex-col gap-3 border-t border-stroke/70 pt-5">
                      <input type="hidden" name="planId" value={plan.id} />
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-stroke bg-panel px-3 py-3 text-xs leading-relaxed text-prose transition hover:border-stroke">
                        <input type="checkbox" name="confirmDelete" className="mt-0.5 shrink-0" />
                        <span>می‌دانم این پلن حذف می‌شود و هنوز سفارشی برایش ثبت نشده است.</span>
                      </label>
                      <ActionMessage state={deleteState} />
                      <SubmitButton fullWidth variant="danger" idleLabel="حذف پلن" pendingLabel="در حال حذف..." />
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stroke bg-inset/60 px-4 py-3 text-xs leading-relaxed text-prose">
                      حذف پلن فقط وقتی امکان‌پذیر است که هیچ سفارشی برای آن ثبت نشده باشد. برای پلن‌های فعال، از
                      ویرایش یا کپی استفاده کنید.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatPill({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-stroke bg-panel ${
        compact ? "px-3 py-2.5" : "px-3 py-3"
      }`}
    >
      <div className={`text-faint ${compact ? "text-[11px]" : "text-xs"}`}>{label}</div>
      <div
        className={`font-semibold text-ink tabular-nums ${compact ? "mt-1 text-base" : "mt-1 text-sm"}`}
        dir="ltr"
      >
        {value}
      </div>
    </div>
  );
}

function KpiChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "sky" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-stroke bg-panel text-ink";

  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${toneClass}`}>
      <span className="text-prose">{label}</span>
      <span className="font-semibold tabular-nums text-ink" dir="ltr">
        {value}
      </span>
    </div>
  );
}
