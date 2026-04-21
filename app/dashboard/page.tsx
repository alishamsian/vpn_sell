import Link from "next/link";

import { DeliveredConfigCard } from "@/components/delivered-config-card";
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

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-500">داشبورد کاربری</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {user.name}، سفارش‌های شما
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              وضعیت پرداخت، سفارش‌های در حال بررسی و کانفیگ‌های تحویل‌شده را از همین‌جا پیگیری
              کنید.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            ثبت سفارش جدید
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="کل سفارش‌ها"
          value={toPersianNumber(totalOrders)}
          tone="default"
        />
        <DashboardStatCard
          label="تحویل‌شده"
          value={toPersianNumber(fulfilledOrders)}
          tone="success"
        />
        <DashboardStatCard
          label="نیازمند اقدام"
          value={toPersianNumber(pendingOrders)}
          tone="warning"
        />
        <DashboardStatCard
          label="در انتظار تحویل"
          value={toPersianNumber(waitingForAccountOrders)}
          tone="default"
        />
        <DashboardStatCard
          label="مجموع پرداخت موفق"
          value={formatPrice(totalSpent)}
          tone="default"
        />
        <DashboardStatCard
          label="نزدیک انقضا"
          value={toPersianNumber(expiringOrders.length)}
          tone="warning"
        />
      </section>

      {expiringOrders.length > 0 || expiredOrders.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-amber-950">یادآور تمدید اشتراک</h2>
              <p className="mt-1 text-sm text-amber-800">
                {expiredOrders.length > 0
                  ? "بعضی از اشتراک‌های شما منقضی شده یا به پایان نزدیک هستند."
                  : "برخی از اشتراک‌های فعال شما در چند روز آینده منقضی می‌شوند."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {[...expiredOrders, ...expiringOrders].slice(0, 3).map((order) => {
              const expiryStatus = getExpiryStatus(order.expiresAt);

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm transition hover:border-amber-300"
                >
                  <div className="font-semibold text-slate-950">{order.plan.name}</div>
                  <div className="text-slate-600">
                    {expiryStatus === "expired"
                      ? "اشتراک منقضی شده است"
                      : `${formatRemainingDays(order.expiresAt)} | اعتبار تا ${formatDate(order.expiresAt!)}`}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">اعلان‌های اخیر</h2>
            <p className="mt-1 text-sm text-slate-600">آخرین تغییرات سفارش و نتیجه بررسی‌ها اینجا نمایش داده می‌شود.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                <div className="text-xs text-slate-500">{formatDateTime(notification.createdAt)}</div>
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</div>
            </div>
          ))}

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              هنوز اعلانی برای شما ثبت نشده است.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">سفارش‌های من</h2>
            <p className="mt-1 text-sm text-slate-600">
              لیست کامل سفارش‌ها با وضعیت فعلی و مسیر ادامه.
            </p>
          </div>
          <div className="text-sm text-slate-500">در حال بررسی: {toPersianNumber(reviewingOrders)}</div>
        </div>

        <div className="mt-6 grid gap-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/30"
            >
              <div className="space-y-4">
                <div className="space-y-3">
                  {order.expiresAt ? (
                    <ExpiryBanner expiresAt={order.expiresAt} orderId={order.id} />
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg font-semibold text-slate-950">{order.plan.name}</h3>
                    <StatusBadge label={translateOrderStatus(order.status)} tone={getOrderTone(order.status)} />
                    <StatusBadge
                      label={order.payment ? translatePaymentStatus(order.payment.status) : "بدون پرداخت"}
                      tone={getPaymentTone(order.payment?.status)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    <span>مبلغ: {formatPrice(Number(order.amount))}</span>
                    <span>{formatDuration(order.plan.durationDays)}</span>
                    <span>{formatUserLimit(order.plan.maxUsers)}</span>
                    <span>{formatDateTime(order.createdAt)}</span>
                    {order.expiresAt ? <span>اعتبار تا: {formatDate(order.expiresAt)}</span> : null}
                  </div>
                </div>

                {order.status === "FULFILLED" && order.account ? (
                  <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-lg bg-white/85 p-4">
                      <div className="text-sm font-semibold text-slate-950">کانفیگ آماده دریافت است</div>
                      <div className="mt-2 text-xs leading-6 text-slate-600">
                        کانفیگ این سفارش تحویل شده و از همین بخش می‌توانید آن را کپی، اسکن یا
                        کامل مشاهده کنید.
                      </div>

                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        اطلاعات بیشتر
                      </Link>
                    </div>

                    <DeliveredConfigCard config={order.account.config} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-950">{getOrderActionTitle(order)}</div>
                    <div className="mt-2 text-xs leading-6 text-slate-500">
                      {getOrderActionDescription(order)}
                    </div>

                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      اطلاعات بیشتر
                    </Link>
                  </div>
                )}
              </div>
            </article>
          ))}

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              هنوز سفارشی ثبت نکرده‌اید.
            </div>
          ) : null}
        </div>
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

function DashboardStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-5 shadow-soft ${toneClass}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
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
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>{label}</span>;
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
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : status === "expiringSoon"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

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
