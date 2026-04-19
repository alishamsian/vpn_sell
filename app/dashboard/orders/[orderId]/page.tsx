import { notFound } from "next/navigation";

import { submitPaymentAction } from "@/app/dashboard/orders/[orderId]/actions";
import { CopyButton } from "@/components/copy-button";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { formatPrice } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getOrderDetails } from "@/lib/queries";

type OrderPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderDetailsPage({ params }: OrderPageProps) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await getOrderDetails(orderId, user.id);

  if (!order) {
    notFound();
  }

  const boundSubmitPaymentAction = submitPaymentAction.bind(null, order.id);
  const cardHolder = process.env.CARD_TO_CARD_HOLDER ?? "نام دارنده کارت را در env تنظیم کنید";
  const cardNumber = process.env.CARD_TO_CARD_NUMBER ?? "شماره کارت را در env تنظیم کنید";
  const bankName = process.env.CARD_TO_CARD_BANK ?? "نام بانک";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h1 className="text-3xl font-semibold text-slate-950">جزئیات سفارش</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard title="کد سفارش" value={order.id} mono />
            <InfoCard title="پلن" value={order.plan.name} />
            <InfoCard title="مبلغ" value={formatPrice(Number(order.amount))} />
            <InfoCard title="وضعیت سفارش" value={translateOrderStatus(order.status)} />
          </div>
        </div>

        {order.status === "FULFILLED" && order.account ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-soft">
            <h2 className="text-2xl font-semibold text-emerald-900">کانفیگ شما آماده است</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-800">
              پرداخت شما تایید شده و اکانت به سفارش اختصاص داده شده است.
            </p>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-slate-950 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-sm leading-6 text-slate-100">
                {order.account.config}
              </pre>
            </div>
            <div className="mt-4">
              <CopyButton value={order.account.config} />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-semibold text-slate-950">ثبت رسید پرداخت</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              مبلغ را کارت‌به‌کارت کنید و سپس اطلاعات و تصویر رسید را برای بررسی ثبت کنید.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard title="نام دارنده کارت" value={cardHolder} />
              <InfoCard title="شماره کارت" value={cardNumber} mono />
              <InfoCard title="بانک" value={bankName} />
              <InfoCard
                title="وضعیت پرداخت"
                value={order.payment ? translatePaymentStatus(order.payment.status) : "هنوز ثبت نشده"}
              />
            </div>

            <div className="mt-8">
              <PaymentProofForm
                orderId={order.id}
                amount={String(Number(order.amount))}
                action={boundSubmitPaymentAction}
              />
            </div>
          </div>
        )}
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-950">وضعیت فعلی</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {order.payment?.status === "REJECTED"
            ? `پرداخت قبلی رد شده است. ${order.payment.reviewNote ?? ""}`
            : order.payment?.status === "PENDING"
              ? "رسید شما ثبت شده و منتظر بررسی ادمین است."
              : order.payment?.status === "APPROVED"
                ? "پرداخت تایید شده و سفارش تحویل داده شده است."
                : "هنوز پرداختی برای این سفارش ثبت نشده است."}
        </p>
      </aside>
    </div>
  );
}

function InfoCard({ mono = false, title, value }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className={`mt-2 text-sm font-medium text-slate-950 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function translateOrderStatus(status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "FULFILLED") {
  if (status === "PENDING_PAYMENT") {
    return "در انتظار پرداخت";
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "در حال بررسی";
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
