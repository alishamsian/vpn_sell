import { ArrowLeft, CalendarDays, Hash, Layers, Package, Users, Wallet } from "lucide-react";
import Link from "next/link";

import {
  formatDate,
  formatDuration,
  formatPrice,
  formatRemainingDays,
  formatUserLimit,
  getExpiryStatus,
} from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDashboardNotifications, getDashboardOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

type DashboardOrder = Awaited<ReturnType<typeof getDashboardOrders>>[number];

export default async function DashboardPage() {
  const user = await requireUser();
  const orders = await getDashboardOrders(user.id);
  const notifications = await getDashboardNotifications(user.id);
  const totalOrders = orders.length;
  const fulfilledOrders = orders.filter((order) => order.status === "FULFILLED").length;
  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING_PAYMENT" || order.payment?.status === "REJECTED",
  ).length;
  const waitingForAccountOrders = orders.filter((order) => order.status === "WAITING_FOR_ACCOUNT").length;
  const reviewingOrders = orders.filter(
    (order) => order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING",
  ).length;
  const totalSpent = orders
    .filter((order) => order.payment?.status === "APPROVED" || order.status === "FULFILLED")
    .reduce((sum, order) => sum + Number(order.amount), 0);
  const expiringOrders = orders.filter(
    (order) => order.status === "FULFILLED" && getExpiryStatus(order.expiresAt) === "expiringSoon",
  );
  const expiredOrders = orders.filter(
    (order) => order.status === "FULFILLED" && getExpiryStatus(order.expiresAt) === "expired",
  );
  const notificationsPreview = notifications.slice(0, 3);

  const actionRequiredOrders = orders.filter(
    (order) => order.status === "PENDING_PAYMENT" || order.payment?.status === "REJECTED",
  );
  const reviewOrders = orders.filter(
    (order) => order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING",
  );
  const waitingOrders = orders.filter((order) => order.status === "WAITING_FOR_ACCOUNT");
  const fulfilled = orders.filter((order) => order.status === "FULFILLED");

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-stroke/70 bg-panel p-5 shadow-sm sm:rounded-2xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="text-sm font-medium text-faint">داشبورد کاربری</div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {user.name}، خوش آمدید
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-prose">
              سفارش‌ها، وضعیت پرداخت و تمدید را سریع و شفاف از همین‌جا مدیریت کنید.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/#plans" className="btn-brand w-full sm:w-auto">
              ثبت سفارش جدید
            </Link>
            <Link
              href="/dashboard/chat"
              className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-2xl border border-stroke bg-panel px-5 py-3 text-sm font-medium text-prose shadow-sm transition hover:border-stroke hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/25 focus-visible:ring-offset-2 sm:w-auto"
            >
              چت با پشتیبانی
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <DashboardStatChip label="کل سفارش‌ها" value={toPersianNumber(totalOrders)} tone="default" />
          <DashboardStatChip label="تحویل‌شده" value={toPersianNumber(fulfilledOrders)} tone="success" />
          <DashboardStatChip label="نیازمند اقدام" value={toPersianNumber(pendingOrders)} tone="warning" />
          <DashboardStatChip label="در انتظار تحویل" value={toPersianNumber(waitingForAccountOrders)} tone="default" />
          <DashboardStatChip label="در حال بررسی" value={toPersianNumber(reviewingOrders)} tone="warning" />
          <DashboardStatChip label="نزدیک انقضا" value={toPersianNumber(expiringOrders.length)} tone="warning" />
          <DashboardStatChip label="مجموع پرداخت موفق" value={formatPrice(totalSpent)} tone="default" />
        </div>
      </section>

      <section className="rounded-xl border border-stroke/70 bg-panel p-5 shadow-sm sm:rounded-2xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">سفارش‌های من</h2>
            <p className="max-w-xl text-sm leading-7 text-prose">
              هر کارت وضعیت لحظه‌ای را نشان می‌دهد؛ دکمهٔ اصلی مستقیم به همان کاری می‌برد که الان لازم داری.
            </p>
          </div>
          {orders.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-gradient-to-l from-sky-50 to-panel px-4 py-2 text-sm font-semibold text-sky-950 shadow-sm dark:border-sky-800/60 dark:from-sky-950/50 dark:to-panel dark:text-sky-100">
              <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
              <span className="tabular-nums">{toPersianNumber(orders.length)}</span>
              <span className="font-medium text-sky-800/90 dark:text-sky-200">سفارش</span>
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <EmptyTabState hasAnyOrders={false} />
          ) : (
            <>
              <details open className="rounded-lg border border-stroke/70 bg-panel">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink hover:bg-inset">
                  نیازمند اقدام
                </summary>
                <div className="grid gap-3 px-4 pb-4">
                  {actionRequiredOrders.length > 0 ? (
                    actionRequiredOrders.map((order) => <DashboardOrderCard key={order.id} order={order} />)
                  ) : (
                    <div className="rounded-lg border border-dashed border-stroke bg-inset/50 px-4 py-4 text-center text-sm text-faint">
                      موردی برای اقدام ندارید.
                    </div>
                  )}
                </div>
              </details>

              <details open className="rounded-lg border border-stroke/70 bg-panel">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink hover:bg-inset">
                  در حال بررسی
                </summary>
                <div className="grid gap-3 px-4 pb-4">
                  {reviewOrders.length > 0 ? (
                    reviewOrders.map((order) => <DashboardOrderCard key={order.id} order={order} />)
                  ) : (
                    <div className="rounded-lg border border-dashed border-stroke bg-inset/50 px-4 py-4 text-center text-sm text-faint">
                      موردی در صف بررسی نیست.
                    </div>
                  )}
                </div>
              </details>

              <details className="rounded-lg border border-stroke/70 bg-panel">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink hover:bg-inset">
                  در انتظار تحویل
                </summary>
                <div className="grid gap-3 px-4 pb-4">
                  {waitingOrders.length > 0 ? (
                    waitingOrders.map((order) => <DashboardOrderCard key={order.id} order={order} />)
                  ) : (
                    <div className="rounded-lg border border-dashed border-stroke bg-inset/50 px-4 py-4 text-center text-sm text-faint">
                      سفارشی در انتظار تحویل ندارید.
                    </div>
                  )}
                </div>
              </details>

              <details className="rounded-lg border border-stroke/70 bg-panel">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink hover:bg-inset">
                  تحویل‌شده
                </summary>
                <div className="grid gap-3 px-4 pb-4">
                  {fulfilled.length > 0 ? (
                    fulfilled.map((order) => <DashboardOrderCard key={order.id} order={order} />)
                  ) : (
                    <div className="rounded-lg border border-dashed border-stroke bg-inset/50 px-4 py-4 text-center text-sm text-faint">
                      هنوز سفارشی تحویل نشده است.
                    </div>
                  )}
                </div>
              </details>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-stroke/70 bg-panel p-5 shadow-sm sm:rounded-2xl sm:p-6">
        <details className="rounded-xl border border-stroke/70 bg-panel">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink hover:bg-inset">
            اعلان‌ها و یادآورها
          </summary>
          <div className="space-y-6 px-4 pb-4 pt-4">
            {expiringOrders.length > 0 || expiredOrders.length > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/40">
                <div className="text-sm font-semibold text-amber-950 dark:text-amber-100">یادآور تمدید</div>
                <div className="mt-1 text-[13px] leading-6 text-amber-800 dark:text-amber-200">
                  {expiredOrders.length > 0
                    ? "برخی اشتراک‌ها منقضی شده یا نزدیک پایان هستند."
                    : "برخی اشتراک‌ها در چند روز آینده منقضی می‌شوند."}
                </div>
                <div className="mt-3 grid gap-2">
                  {[...expiredOrders, ...expiringOrders].slice(0, 3).map((order) => {
                    const expiryStatus = getExpiryStatus(order.expiresAt);
                    return (
                      <Link
                        key={order.id}
                        href={`/dashboard/orders/${order.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-panel/80 px-4 py-3 text-sm transition hover:border-amber-300"
                      >
                        <div className="font-semibold text-ink">{order.plan.name}</div>
                        <div className="text-prose">
                          {expiryStatus === "expired"
                            ? "منقضی شده"
                            : `${formatRemainingDays(order.expiresAt)} | تا ${formatDate(order.expiresAt!)}`}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-5 text-center text-sm text-faint">
                یادآوری فعالی ندارید.
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stroke bg-inset px-4 py-5 text-center text-sm text-faint">
                هنوز اعلانی برای شما ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {notificationsPreview.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink">{notification.title}</div>
                      <div className="text-xs text-faint">{formatDateTime(notification.createdAt)}</div>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-prose">{notification.message}</div>
                  </div>
                ))}

                {notifications.length > notificationsPreview.length ? (
                  <details className="rounded-2xl border border-stroke bg-panel">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-prose hover:bg-inset">
                      نمایش همه اعلان‌ها
                    </summary>
                    <div className="space-y-3 px-4 pb-4">
                      {notifications.slice(notificationsPreview.length).map((notification) => (
                        <div key={notification.id} className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-ink">{notification.title}</div>
                            <div className="text-xs text-faint">{formatDateTime(notification.createdAt)}</div>
                          </div>
                          <div className="mt-1 text-sm leading-6 text-prose">{notification.message}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

function translateOrderStatus(
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED",
) {
  if (status === "PENDING_PAYMENT") {
    return "در انتظار پرداخت";
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "در انتظار بررسی";
  }

  if (status === "WAITING_FOR_ACCOUNT") {
    return "در انتظار تخصیص اکانت";
  }

  return "تحویل شده";
}

function translatePaymentStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "PENDING") {
    return "در حال بررسی";
  }

  if (status === "APPROVED") {
    return "تایید شده";
  }

  return "رد شده";
}

function getOrderDetailPath(orderId: string) {
  return `/dashboard/orders/${orderId}`;
}

function getOrderPrimaryHref(order: DashboardOrder) {
  const base = getOrderDetailPath(order.id);
  if (order.payment?.status === "REJECTED" || order.status === "PENDING_PAYMENT") {
    return `${base}#payment-proof`;
  }
  if (order.status === "FULFILLED") {
    return `${base}#config-ready`;
  }
  if (
    order.status === "WAITING_FOR_ACCOUNT" ||
    order.status === "PAYMENT_SUBMITTED" ||
    order.payment?.status === "PENDING"
  ) {
    return `${base}#order-chat`;
  }
  return base;
}

function getOrderPrimaryLabel(order: DashboardOrder) {
  if (order.payment?.status === "REJECTED") {
    return "ثبت رسید جدید";
  }
  if (order.status === "PENDING_PAYMENT") {
    return "ثبت رسید پرداخت";
  }
  if (order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING") {
    return "پیگیری و چت";
  }
  if (order.status === "WAITING_FOR_ACCOUNT") {
    return "وضعیت تحویل";
  }
  if (order.status === "FULFILLED") {
    return "دریافت کانفیگ";
  }
  return "جزئیات سفارش";
}

/** نوار کناری ظریف — رنگ بر اساس وضعیت، بدون شلوغی کارت */
function getOrderStripClass(order: DashboardOrder) {
  if (order.payment?.status === "REJECTED") {
    return "bg-gradient-to-b from-rose-500 to-rose-600";
  }
  if (order.status === "FULFILLED") {
    return "bg-gradient-to-b from-emerald-500 to-teal-600";
  }
  if (order.status === "WAITING_FOR_ACCOUNT") {
    return "bg-gradient-to-b from-amber-400 to-amber-500";
  }
  if (order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING") {
    return "bg-gradient-to-b from-sky-500 to-brand-cyan";
  }
  return "bg-gradient-to-b from-slate-400 to-slate-500";
}

function OrderStepTracker({ order }: { order: DashboardOrder }) {
  const receiptSubmitted = order.payment != null;
  const receiptCurrent = order.status === "PENDING_PAYMENT" || order.payment?.status === "REJECTED";
  const reviewDone =
    order.payment?.status === "APPROVED" ||
    order.status === "WAITING_FOR_ACCOUNT" ||
    order.status === "FULFILLED";
  const reviewCurrent = order.payment?.status === "PENDING";
  const deliverDone = order.status === "FULFILLED";
  const deliverCurrent = order.status === "WAITING_FOR_ACCOUNT";

  const steps = [
    { done: true, current: false, label: "سفارش" },
    { done: receiptSubmitted && !receiptCurrent, current: receiptCurrent, label: "رسید" },
    { done: reviewDone && !reviewCurrent, current: reviewCurrent, label: "بررسی" },
    { done: deliverDone, current: deliverCurrent, label: "تحویل" },
  ];

  return (
    <div className="w-full rounded-xl border border-stroke/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.6))] p-4 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.85),rgba(15,23,42,0.75))] lg:w-[13.5rem] lg:shrink-0">
      <p className="text-[11px] font-semibold tracking-wide text-faint">پیشرفت سفارش</p>
      <div className="mt-3 flex items-start justify-between gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shadow-sm ${
                step.done
                  ? "bg-emerald-500 text-white ring-2 ring-white dark:ring-emerald-950"
                  : step.current
                    ? "bg-gradient-to-br from-sky-500 to-brand-cyan text-white ring-2 ring-sky-100 dark:ring-sky-900/80"
                    : "bg-elevated text-faint ring-1 ring-stroke/80 dark:bg-slate-800 dark:ring-stroke"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-center text-[10px] font-semibold leading-tight text-prose">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardOrderCard({ order }: { order: DashboardOrder }) {
  const primaryHref = getOrderPrimaryHref(order);
  const detailHref = getOrderDetailPath(order.id);
  const stripClass = getOrderStripClass(order);

  return (
    <div className="flex overflow-hidden rounded-lg border border-stroke/70 bg-panel shadow-sm transition hover:bg-inset motion-reduce:transition-none">
      <div className={`w-1 shrink-0 sm:w-1.5 ${stripClass}`} aria-hidden />
      <article className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            {order.expiresAt ? <ExpiryBanner expiresAt={order.expiresAt} orderId={order.id} /> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 space-y-2">
                <h3 className="text-pretty text-base font-bold leading-snug tracking-tight text-ink sm:text-lg">
                  {order.plan.name}
                </h3>
                <p className="flex min-w-0 items-center gap-1.5 text-xs text-faint" dir="ltr">
                  <Hash className="h-3.5 w-3.5 shrink-0 text-sky-500/70" aria-hidden />
                  <span className="truncate font-mono tracking-tight text-prose">{order.id}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={translateOrderStatus(order.status)} tone={getOrderTone(order.status)} />
                <StatusBadge
                  label={order.payment ? translatePaymentStatus(order.payment.status) : "بدون پرداخت"}
                  tone={getPaymentTone(order.payment?.status)}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-stroke/70 bg-inset/70 px-3 py-2 transition hover:bg-inset">
                <dt className="flex items-center gap-1 text-[10px] font-bold text-faint">
                  <Wallet className="h-3 w-3 text-sky-600/80 dark:text-sky-400/90" aria-hidden />
                  مبلغ
                </dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{formatPrice(Number(order.amount))}</dd>
              </div>
              <div className="rounded-lg border border-stroke/70 bg-inset/70 px-3 py-2 transition hover:bg-inset">
                <dt className="flex items-center gap-1 text-[10px] font-bold text-faint">
                  <CalendarDays className="h-3 w-3 text-sky-600/80 dark:text-sky-400/90" aria-hidden />
                  مدت
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">{formatDuration(order.plan.durationDays)}</dd>
              </div>
              <div className="rounded-lg border border-stroke/70 bg-inset/70 px-3 py-2 transition hover:bg-inset">
                <dt className="flex items-center gap-1 text-[10px] font-bold text-faint">
                  <Users className="h-3 w-3 text-sky-600/80 dark:text-sky-400/90" aria-hidden />
                  کاربر
                </dt>
                <dd className="mt-1 text-sm font-bold text-ink">{formatUserLimit(order.plan.maxUsers)}</dd>
              </div>
              <div className="rounded-lg border border-stroke/70 bg-inset/70 px-3 py-2 transition hover:bg-inset">
                <dt className="text-[10px] font-bold text-faint">ثبت سفارش</dt>
                <dd className="mt-1 text-sm font-bold tabular-nums text-ink">{formatDateTime(order.createdAt)}</dd>
              </div>
            </dl>

            {order.expiresAt ? (
              <p className="text-xs text-prose">
                اعتبار اشتراک تا{" "}
                <span className="font-semibold text-ink">{formatDate(order.expiresAt)}</span>
              </p>
            ) : null}
          </div>

          <OrderStepTracker order={order} />
        </div>

        <div className="mt-4 rounded-lg border border-stroke/70 bg-inset/50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold text-ink">{getOrderActionTitle(order)}</p>
              <p className="text-xs leading-6 text-prose">{getOrderActionDescription(order)}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={primaryHref}
                className="btn-brand-sm inline-flex min-h-[2.5rem] w-full items-center justify-center gap-2 px-5 sm:w-auto sm:min-w-[10.5rem]"
              >
                <span>{getOrderPrimaryLabel(order)}</span>
                <ArrowLeft className="h-4 w-4 opacity-95" aria-hidden />
              </Link>
              <Link href={detailHref} className="btn-outline-sm w-full font-semibold sm:w-auto">
                جزئیات کامل
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100"
      : tone === "warning"
        ? "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100"
        : tone === "danger"
          ? "border-rose-200/90 bg-rose-50 text-rose-900 dark:border-rose-800/70 dark:bg-rose-950/45 dark:text-rose-100"
          : "border-stroke bg-panel text-prose";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${className}`}>{label}</span>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function toPersianNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function EmptyTabState({ hasAnyOrders }: { hasAnyOrders: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-stroke bg-inset/50 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-elevated text-faint">
        <Package className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-5 text-base font-semibold text-ink">
        {hasAnyOrders ? "در این دسته‌بندی سفارشی وجود ندارد" : "هنوز سفارشی ثبت نکرده‌اید"}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-prose">
        {hasAnyOrders
          ? "از تب‌های بالا دسته‌بندی دیگری را انتخاب کنید یا یک سفارش جدید ثبت کنید."
          : "از صفحهٔ اصلی یک پلن انتخاب کنید؛ بعد از ثبت سفارش، همین‌جا پیشرفت و پرداخت را دنبال می‌کنید."}
      </p>
      <Link href="/#plans" className="btn-brand mx-auto mt-6 inline-flex min-w-[12rem]">
        مشاهده پلن‌ها
      </Link>
    </div>
  );
}

function getOrderTone(
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED",
) {
  if (status === "FULFILLED") {
    return "success" as const;
  }

  if (status === "WAITING_FOR_ACCOUNT") {
    return "warning" as const;
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function DashboardStatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
        : "border-stroke bg-panel text-prose";

  return (
    <div
      className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${className}`}
    >
      <span className="text-[11px] font-medium opacity-80">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function getPaymentTone(status: "PENDING" | "APPROVED" | "REJECTED" | undefined) {
  if (status === "APPROVED") {
    return "success" as const;
  }

  if (status === "PENDING") {
    return "warning" as const;
  }

  if (status === "REJECTED") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getOrderActionTitle(order: {
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED";
  payment: { status: "PENDING" | "APPROVED" | "REJECTED" } | null;
}) {
  if (order.payment?.status === "REJECTED") {
    return "نیاز به ثبت دوباره رسید";
  }

  if (order.status === "PENDING_PAYMENT") {
    return "منتظر پرداخت شما";
  }

  if (order.status === "PAYMENT_SUBMITTED") {
    return "در صف بررسی ادمین";
  }

  if (order.status === "WAITING_FOR_ACCOUNT") {
    return "پرداخت تایید شده، منتظر تخصیص اکانت";
  }

  return "کانفیگ آماده دریافت است";
}

function getOrderActionDescription(order: {
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED";
  payment: { status: "PENDING" | "APPROVED" | "REJECTED"; reviewNote: string | null } | null;
}) {
  if (order.payment?.status === "REJECTED") {
    return order.payment.reviewNote
      ? `پرداخت قبلی رد شده است: ${order.payment.reviewNote}`
      : "پرداخت قبلی رد شده است و باید دوباره اطلاعات پرداخت را ثبت کنید.";
  }

  if (order.status === "PENDING_PAYMENT") {
    return "برای ادامه، مبلغ را کارت‌به‌کارت کنید و تصویر رسید را داخل جزئیات سفارش ثبت کنید.";
  }

  if (order.status === "PAYMENT_SUBMITTED") {
    return "رسید ثبت شده و تیم پشتیبانی در حال بررسی آن است. نتیجه پس از تایید در همین سفارش نمایش داده می‌شود.";
  }

  if (order.status === "WAITING_FOR_ACCOUNT") {
    return "پرداخت شما تایید شده اما موجودی این پلن موقتا تمام شده است. به محض اضافه شدن اکانت، سفارش به‌صورت خودکار تحویل می‌شود.";
  }

  return "پرداخت تایید شده و کانفیگ اختصاصی این سفارش داخل صفحه جزئیات آماده مشاهده است.";
}

function ExpiryBanner({ expiresAt, orderId }: { expiresAt: Date; orderId: string }) {
  const status = getExpiryStatus(expiresAt);

  if (status === "unknown") {
    return null;
  }

  const className =
    status === "expired"
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
      : status === "expiringSoon"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${className}`}>
      <div>
        {status === "expired"
          ? "این اشتراک منقضی شده است."
          : `اعتبار اشتراک تا ${formatDate(expiresAt)} است و ${formatRemainingDays(expiresAt)}.`}
      </div>
      <Link href={`/dashboard/orders/${orderId}`} className="font-semibold">
        {status === "expired" || status === "expiringSoon" ? "تمدید و مشاهده" : "جزئیات"}
      </Link>
    </div>
  );
}
