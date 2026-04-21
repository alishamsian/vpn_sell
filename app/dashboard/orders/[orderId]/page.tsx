import { notFound } from "next/navigation";

import { submitPaymentAction } from "@/app/dashboard/orders/[orderId]/actions";
import {
  sendUserChatMessageAction,
  toggleUserConversationStatusAction,
} from "@/app/dashboard/chat/actions";
import { OrderSupportChatCard } from "@/components/chat/order-support-chat-card";
import { DeliveredConfigCard } from "@/components/delivered-config-card";
import { OrderReviewPendingCard } from "@/components/order-review-pending-card";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { RenewPlanButton } from "@/components/renew-plan-button";
import { requireUser } from "@/lib/auth";
import { ensureOrderConversation } from "@/lib/chat";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatRemainingDays,
  formatUserLimit,
  getExpiryStatus,
} from "@/lib/format";
import { getOrderConversationDetails, getOrderDetails } from "@/lib/queries";

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

  await ensureOrderConversation({
    orderId: order.id,
    userId: user.id,
  });

  const orderConversation = await getOrderConversationDetails(order.id, user.id);
  const progress = buildOrderProgress({
    status: order.status,
    paymentStatus: order.payment?.status,
    paymentReviewNote: order.payment?.reviewNote ?? null,
    expiresAt: order.expiresAt ?? null,
  });
  const chatUnlockAt =
    order.payment && order.status !== "FULFILLED" && order.status !== "WAITING_FOR_ACCOUNT"
      ? new Date(order.payment.submittedAt.getTime() + 5 * 60 * 1000).toISOString()
      : null;
  const isOrderChatEnabled =
    order.status === "FULFILLED" || order.status === "WAITING_FOR_ACCOUNT" ? true : false;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.22fr)_minmax(280px,0.72fr)]">
        <section className="space-y-6">
          {order.expiresAt ? <SubscriptionNoticeCard expiresAt={order.expiresAt} /> : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
            <h1 className="text-3xl font-semibold text-slate-950">جزئیات سفارش</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoCard title="کد سفارش" value={order.id} mono />
              <InfoCard title="پلن" value={order.plan.name} />
              <InfoCard title="مبلغ" value={formatPrice(Number(order.amount))} />
              <InfoCard title="مدت اشتراک" value={formatDuration(order.plan.durationDays)} />
              <InfoCard title="تعداد کاربر" value={formatUserLimit(order.plan.maxUsers)} />
              <InfoCard title="وضعیت سفارش" value={translateOrderStatus(order.status)} />
              {order.expiresAt ? <InfoCard title="اعتبار اشتراک" value={formatDate(order.expiresAt)} /> : null}
              {order.expiresAt ? (
                <InfoCard title="وضعیت اشتراک" value={formatRemainingDays(order.expiresAt) ?? "-"} />
              ) : null}
            </div>
          </div>

          {order.status === "FULFILLED" && order.account ? (
            <div id="config-ready" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-emerald-900">کانفیگ شما آماده است</h2>
              <p className="mt-3 text-sm leading-6 text-emerald-800">
                پرداخت شما تایید شده و اکانت به سفارش اختصاص داده شده است.
                {order.expiresAt ? ` این اشتراک تا ${formatDate(order.expiresAt)} فعال است.` : ""}
              </p>
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-white/70 p-4">
                <DeliveredConfigCard config={order.account.config} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/70 px-4 py-3">
                <div className="text-sm text-emerald-900">برای ادامه استفاده، از همین‌جا سفارش تمدید بسازید.</div>
                <RenewPlanButton orderId={order.id} />
              </div>
            </div>
          ) : order.status === "WAITING_FOR_ACCOUNT" ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-amber-900">پرداخت تایید شد</h2>
              <p className="mt-3 text-sm leading-6 text-amber-800">
                پرداخت این سفارش تایید شده اما موجودی این پلن فعلا تمام شده است. به محض اضافه شدن
                اکانت، سفارش شما خودکار تحویل می‌شود و نتیجه در داشبورد نمایش داده خواهد شد.
              </p>
            </div>
          ) : order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING" ? (
            <OrderReviewPendingCard />
          ) : (
            <div id="payment-proof" className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-slate-950">
                {order.payment?.status === "REJECTED" ? "ثبت مجدد رسید پرداخت" : "ثبت رسید پرداخت"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {order.payment?.status === "REJECTED"
                  ? `رسید قبلی رد شده است${order.payment.reviewNote ? `: ${order.payment.reviewNote}` : "."} لطفا اطلاعات را اصلاح کنید و دوباره رسید را ثبت کنید.`
                  : "مبلغ را کارت‌به‌کارت کنید و سپس اطلاعات و تصویر رسید را برای بررسی ثبت کنید."}
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

        <aside id="order-chat" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <OrderSupportChatCard
            currentUserId={user.id}
            orderId={order.id}
            initialConversation={orderConversation}
            sendAction={sendUserChatMessageAction}
            toggleStatusAction={toggleUserConversationStatusAction}
            compact
            enabled={isOrderChatEnabled}
            unlockAt={chatUnlockAt}
          />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">مسیر سفارش</h2>
                <p className="mt-1 text-xs leading-6 text-slate-500">{progress.summary}</p>
              </div>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                {progress.badge}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {progress.steps.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <div className="flex w-6 flex-col items-center">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        step.state === "done"
                          ? "bg-emerald-500 text-white"
                          : step.state === "current"
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < progress.steps.length - 1 ? (
                      <span className="mt-1 h-8 w-px bg-slate-200" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          step.state === "done"
                            ? "bg-emerald-50 text-emerald-700"
                            : step.state === "current"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {step.state === "done"
                          ? "انجام شد"
                          : step.state === "current"
                            ? "در حال انجام"
                            : "مرحله بعد"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-xs font-medium text-slate-500">اقدام پیشنهادی</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{progress.nextTitle}</div>
              <p className="mt-1 text-xs leading-6 text-slate-500">{progress.nextDescription}</p>
              {progress.ctaHref ? (
                <a
                  href={progress.ctaHref}
                  className="mt-3 inline-flex rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                >
                  {progress.ctaLabel}
                </a>
              ) : (
                <div className="mt-3 inline-flex rounded-xl bg-slate-950 px-3 py-2 text-xs font-medium text-white">
                  {progress.ctaLabel}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
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

function translateOrderStatus(
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED",
) {
  if (status === "PENDING_PAYMENT") {
    return "در انتظار پرداخت";
  }

  if (status === "PAYMENT_SUBMITTED") {
    return "در حال بررسی";
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

type ProgressStep = {
  title: string;
  description: string;
  state: "done" | "current" | "upcoming";
};

function buildOrderProgress({
  status,
  paymentStatus,
  paymentReviewNote,
  expiresAt,
}: {
  status: "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED";
  paymentStatus: "PENDING" | "APPROVED" | "REJECTED" | undefined;
  paymentReviewNote: string | null;
  expiresAt: Date | null;
}) {
  const steps: ProgressStep[] = [
    {
      title: "ثبت سفارش",
      description: "سفارش شما ثبت شده و آماده شروع فرایند پرداخت است.",
      state: "done",
    },
    {
      title: paymentStatus === "REJECTED" ? "ارسال مجدد رسید" : "ارسال رسید",
      description:
        paymentStatus === "REJECTED"
          ? paymentReviewNote
            ? `رسید قبلی نیاز به اصلاح دارد: ${paymentReviewNote}`
            : "رسید قبلی رد شده و برای ادامه باید رسید جدید ثبت کنید."
          : "مبلغ را واریز کنید و تصویر رسید را ثبت کنید تا سفارش جلو برود.",
      state:
        paymentStatus === "REJECTED" || status === "PENDING_PAYMENT"
          ? "current"
          : "done",
    },
    {
      title: "بررسی و تایید پرداخت",
      description:
        paymentStatus === "PENDING"
          ? "رسید شما ثبت شده و اکنون در صف بررسی ادمین قرار دارد."
          : "پس از تایید پرداخت، سفارش وارد مرحله آماده‌سازی می‌شود.",
      state:
        paymentStatus === "PENDING"
          ? "current"
          : paymentStatus === "APPROVED" || status === "WAITING_FOR_ACCOUNT" || status === "FULFILLED"
            ? "done"
            : "upcoming",
    },
    {
      title: "تحویل کانفیگ",
      description:
        status === "WAITING_FOR_ACCOUNT"
          ? "پرداخت تایید شده و سفارش در صف تخصیص اکانت قرار دارد."
          : status === "FULFILLED"
            ? expiresAt
              ? `کانفیگ تحویل شده و اشتراک تا ${formatDate(expiresAt)} فعال است.`
              : "کانفیگ تحویل داده شده و آماده استفاده است."
            : "بعد از تایید پرداخت، کانفیگ در همین صفحه تحویل داده می‌شود.",
      state:
        status === "WAITING_FOR_ACCOUNT"
          ? "current"
          : status === "FULFILLED"
            ? "done"
            : "upcoming",
    },
  ];

  if (paymentStatus === "REJECTED" || status === "PENDING_PAYMENT") {
    return {
      badge: "مرحله ۲ از ۴",
      summary: "برای جلو رفتن سفارش، فقط ثبت رسید باقی مانده است.",
      nextTitle: "رسید را ثبت کن",
      nextDescription: "هرچه زودتر رسید واضح و کامل ثبت شود، سفارش سریع‌تر وارد بررسی می‌شود.",
      ctaLabel: paymentStatus === "REJECTED" ? "ثبت رسید جدید" : "ثبت رسید پرداخت",
      ctaHref: "#payment-proof",
      steps,
    };
  }

  if (paymentStatus === "PENDING") {
    return {
      badge: "مرحله ۳ از ۴",
      summary: "رسید ثبت شده و اکنون سفارش در حال بررسی است.",
      nextTitle: "در دست بررسی",
      nextDescription: "اگر نیاز به پیگیری یا توضیح بیشتر داشتی، از چت همین سفارش استفاده کن.",
      ctaLabel: "پیگیری از چت",
      ctaHref: "#order-chat",
      steps,
    };
  }

  if (status === "WAITING_FOR_ACCOUNT") {
    return {
      badge: "مرحله ۴ از ۴",
      summary: "پرداخت تایید شده و سفارش در صف تحویل قرار گرفته است.",
      nextTitle: "منتظر تحویل بمان",
      nextDescription: "در این مرحله نزدیک تحویل هستی؛ اگر سوالی داری از چت سفارش پیگیری کن.",
      ctaLabel: "پیگیری وضعیت",
      ctaHref: "#order-chat",
      steps,
    };
  }

  return {
    badge: "تکمیل شد",
    summary: "سفارش کامل شده و کانفیگ از همین صفحه قابل دریافت است.",
    nextTitle: "کانفیگ را دریافت کن",
    nextDescription: "اکنون می‌توانی کانفیگ را کپی کنی، QR را اسکن کنی یا سفارش را تمدید کنی.",
    ctaLabel: "مشاهده کانفیگ",
    ctaHref: "#config-ready",
    steps,
  };
}

function SubscriptionNoticeCard({ expiresAt }: { expiresAt: Date }) {
  const expiryStatus = getExpiryStatus(expiresAt);

  const toneClass =
    expiryStatus === "expired"
      ? "border-rose-200 bg-rose-50"
      : expiryStatus === "expiringSoon"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50";
  const title =
    expiryStatus === "expired"
      ? "اشتراک این سفارش منقضی شده است"
      : expiryStatus === "expiringSoon"
        ? "زمان تمدید این اشتراک نزدیک است"
        : "اشتراک این سفارش فعال است";
  const description =
    expiryStatus === "expired"
      ? "برای ادامه استفاده، از همین صفحه سفارش تمدید ثبت کنید."
      : expiryStatus === "expiringSoon"
        ? `این اشتراک تا ${formatDate(expiresAt)} معتبر است و ${formatRemainingDays(expiresAt)}.`
        : `این اشتراک تا ${formatDate(expiresAt)} فعال است و ${formatRemainingDays(expiresAt)}.`;

  return (
    <div className={`rounded-3xl border p-5 shadow-soft ${toneClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <a
          href="#config-ready"
          className="inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {expiryStatus === "active" ? "مشاهده کانفیگ" : "تمدید سفارش"}
        </a>
      </div>
    </div>
  );
}
