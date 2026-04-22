import { AdminPaymentReview } from "@/components/admin-payment-review";
import { ReceiptPreviewDialog } from "@/components/receipt-preview-dialog";
import { formatPrice } from "@/lib/format";
import { AdminTableEmptyState } from "@/components/admin/admin-ui";
import { getAdminPayments } from "@/lib/queries";

type AdminPaymentsListProps = {
  payments: Awaited<ReturnType<typeof getAdminPayments>>;
  limit?: number;
};

export function PaymentReviewList({ payments, limit }: AdminPaymentsListProps) {
  const visiblePayments = typeof limit === "number" ? payments.slice(0, limit) : payments;

  if (visiblePayments.length === 0) {
    return <AdminTableEmptyState label="هنوز هیچ پرداختی ثبت نشده است." />;
  }

  return (
    <div className="grid gap-4">
      {visiblePayments.map((payment) => (
        <article key={payment.id} className="rounded-3xl border border-stroke p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <div className="text-lg font-semibold text-ink">{payment.order.plan.name}</div>
              <div className="text-sm text-prose">
                کاربر: {payment.order.user.name} | {payment.order.user.phone ?? payment.order.user.email ?? "-"}
              </div>
              <div className="text-sm text-prose">
                مبلغ: {formatPrice(Number(payment.amount))} | کد پیگیری: {payment.trackingCode}
              </div>
              <div className="text-sm text-prose">۴ رقم آخر کارت: {payment.cardLast4}</div>
              <div className="text-sm text-prose">
                وضعیت: {translatePaymentStatus(payment.status)}
                {payment.reviewSource ? ` | منبع بررسی: ${translateReviewSource(payment.reviewSource)}` : ""}
                {payment.order.status === "WAITING_FOR_ACCOUNT" ? " | سفارش: در انتظار تخصیص اکانت" : ""}
              </div>
              <div className="text-sm text-prose">
                تلگرام:{" "}
                {payment.telegramSentAt
                  ? "ارسال شده"
                  : payment.telegramError
                    ? "خطا در ارسال"
                    : "ارسال نشده"}
              </div>
              {payment.telegramError ? (
                <div className="text-xs text-rose-600">{payment.telegramError}</div>
              ) : null}
            </div>

            <div className="space-y-3">
              <ReceiptPreviewDialog orderId={payment.order.id} receiptUrl={payment.previewReceiptUrl} />
            </div>
          </div>

          <div className="mt-4">
            <AdminPaymentReview paymentId={payment.id} status={payment.status} />
            {payment.reviewNote ? (
              <div className="mt-3 rounded-2xl bg-inset px-4 py-3 text-sm text-prose">
                یادداشت بررسی: {payment.reviewNote}
              </div>
            ) : null}
            {payment.auditLogs.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-stroke bg-inset px-4 py-3">
                <div className="text-xs font-medium text-faint">تاریخچه پرداخت</div>
                <div className="mt-2 space-y-2">
                  {payment.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs text-prose"
                    >
                      <span>{log.message}</span>
                      <span className="text-faint">{formatAdminDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
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

function translateReviewSource(source: "ADMIN_PANEL" | "TELEGRAM") {
  return source === "TELEGRAM" ? "تلگرام" : "پنل ادمین";
}

function formatAdminDateTime(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
