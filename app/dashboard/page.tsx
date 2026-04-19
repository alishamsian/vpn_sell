import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDashboardOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const orders = await getDashboardOrders(user.id);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-950">داشبورد کاربری</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {user.name} عزیز، از اینجا می‌توانید سفارش‌ها، وضعیت پرداخت و کانفیگ‌های تحویل‌شده را
          مدیریت کنید.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">سفارش‌های من</h2>
            <p className="text-sm text-slate-600">همه سفارش‌ها و وضعیت فعلی آن‌ها.</p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            ثبت سفارش جدید
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{order.plan.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    مبلغ: {formatPrice(Number(order.amount))}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>وضعیت سفارش: {translateOrderStatus(order.status)}</div>
                  <div className="mt-1">
                    وضعیت پرداخت: {order.payment ? translatePaymentStatus(order.payment.status) : "ثبت نشده"}
                  </div>
                </div>
              </div>
            </Link>
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

function translateOrderStatus(status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "FULFILLED") {
  if (status === "PENDING_PAYMENT") {
    return "در انتظار پرداخت";
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "در انتظار بررسی";
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
