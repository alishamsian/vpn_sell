import { notFound } from "next/navigation";

import {
  applyPricingOptionsAction,
  payWithWalletAction,
  submitWalletTopUpAction,
  submitPaymentAction,
} from "@/app/dashboard/orders/[orderId]/actions";
import {
  sendUserChatMessageAction,
  toggleUserConversationStatusAction,
} from "@/app/dashboard/chat/actions";
import { OrderSupportChatCard } from "@/components/chat/order-support-chat-card";
import { DeliveredConfigCard } from "@/components/delivered-config-card";
import { OrderProductShowcase } from "@/components/order-product-showcase";
import { OrderReviewPendingCard } from "@/components/order-review-pending-card";
import { PaymentFlowModal } from "@/components/payment-flow-modal";
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
  const boundPayWithWalletAction = payWithWalletAction.bind(null, order.id);
  const boundApplyPricingOptionsAction = applyPricingOptionsAction.bind(null, order.id);
  const boundSubmitWalletTopUpAction = submitWalletTopUpAction;
  const cardHolder = process.env.CARD_TO_CARD_HOLDER ?? "نام دارنده کارت را در env تنظیم کنید";
  const cardNumber = process.env.CARD_TO_CARD_NUMBER ?? "شماره کارت را در env تنظیم کنید";
  const bankName = process.env.CARD_TO_CARD_BANK ?? "نام بانک";
  const tonWalletAddress = process.env.TON_WALLET_ADDRESS ?? "آدرس کیف‌پول TON را در env تنظیم کنید";

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
  const shouldShowChat = isOrderChatEnabled;
  const pricing = {
    subtotal: Number(order.subtotalAmount),
    discount: Number(order.discountAmount),
    walletApplied: Number(order.walletAppliedAmount),
    giftCardApplied: Number(order.giftCardAppliedAmount),
    payable: Number(order.amount),
    walletPayableWith20Percent: Math.floor(Number(order.subtotalAmount) * 0.8),
  };
  const canPayNow =
    order.status === "PENDING_PAYMENT" &&
    (!order.payment || order.payment.status === "REJECTED");
  const paymentRejectionReason =
    order.payment?.status === "REJECTED" ? (order.payment.reviewNote?.trim() || null) : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-6">
          {order.expiresAt ? <SubscriptionNoticeCard expiresAt={order.expiresAt} /> : null}

          {order.payment?.status === "REJECTED" ? (
            <div
              id="order-payment"
              className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 shadow-soft dark:border-rose-800/50 dark:bg-rose-950/35"
              role="alert"
            >
              <h2 className="text-base font-semibold text-rose-950 dark:text-rose-100">رسید پرداخت رد شد</h2>
              {paymentRejectionReason ? (
                <p className="mt-2 text-sm leading-7 text-rose-900/95 dark:text-rose-100/90">
                  <span className="font-medium text-rose-950 dark:text-rose-50">دلیل اعلام‌شده از پشتیبان:</span>{" "}
                  {paymentRejectionReason}
                </p>
              ) : (
                <p className="mt-2 text-sm leading-7 text-rose-900/95 dark:text-rose-100/90">
                  رسید قبلی رد شده است. لطفاً با دکمهٔ زیر رسید جدید و درست ارسال کنید.
                </p>
              )}
              <p className="mt-2 text-xs leading-6 text-rose-800/90 dark:text-rose-200/80">
                می‌توانید مبلغ و روش پرداخت را دوباره بررسی کنید و تصویر رسید واضح‌تر آپلود کنید.
              </p>
            </div>
          ) : null}

          <OrderProductShowcase
            orderId={order.id}
            planName={order.plan.name}
            priceFormatted={formatPrice(Number(order.amount))}
            durationFormatted={formatDuration(order.plan.durationDays)}
            userLimitFormatted={formatUserLimit(order.plan.maxUsers)}
            orderStatusLabel={translateOrderStatus(order.status)}
            orderStatus={order.status}
            paymentStatus={order.payment?.status}
            createdAtFormatted={formatDate(order.createdAt)}
            expiresAtFormatted={order.expiresAt ? formatDate(order.expiresAt) : null}
            subscriptionRemainingLabel={
              order.expiresAt ? (formatRemainingDays(order.expiresAt) ?? null) : null
            }
            primaryAction={
              canPayNow ? (
                <div className="space-y-2">
                  <PaymentFlowModal
                    orderId={order.id}
                    paymentRejected={order.payment?.status === "REJECTED"}
                    rejectionReason={paymentRejectionReason}
                    statusLabel={order.payment ? translatePaymentStatus(order.payment.status) : "در انتظار پرداخت"}
                    triggerLabel={order.payment?.status === "REJECTED" ? "پرداخت مجدد و ارسال رسید" : "پرداخت و ادامه"}
                    triggerClassName="btn-brand w-full rounded-2xl py-3 text-base font-semibold shadow-lg shadow-black/20 hover:shadow-xl"
                    pricing={pricing}
                    card={{ holder: cardHolder, number: cardNumber, bank: bankName }}
                    tonWalletAddress={tonWalletAddress}
                    applyPricingOptionsAction={boundApplyPricingOptionsAction}
                    payWithWalletAction={boundPayWithWalletAction}
                    submitPaymentAction={boundSubmitPaymentAction}
                    submitWalletTopUpAction={boundSubmitWalletTopUpAction}
                  />
                  <div className="text-center text-xs text-sky-100/85">
                    برای شروع پرداخت روی دکمه بالا بزنید
                  </div>
                </div>
              ) : null
            }
          />

          {order.status === "FULFILLED" && order.account ? (
            <div
              id="config-ready"
              className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-soft dark:border-emerald-800/60 dark:bg-emerald-950/40"
            >
              <h2 className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">کانفیگ شما آماده است</h2>
              <p className="mt-3 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                پرداخت شما تایید شده و اکانت به سفارش اختصاص داده شده است.
                {order.expiresAt ? ` این اشتراک تا ${formatDate(order.expiresAt)} فعال است.` : ""}
              </p>
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-panel/70 p-4 dark:border-emerald-800/50">
                <DeliveredConfigCard config={order.account.config} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-panel/70 px-4 py-3 dark:border-emerald-800/50">
                <div className="text-sm text-emerald-900 dark:text-emerald-100">
                  برای ادامه استفاده، از همین‌جا سفارش تمدید بسازید.
                </div>
                <RenewPlanButton orderId={order.id} />
              </div>
            </div>
          ) : order.status === "WAITING_FOR_ACCOUNT" ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-soft dark:border-amber-800/60 dark:bg-amber-950/40">
              <h2 className="text-2xl font-semibold text-amber-900 dark:text-amber-100">پرداخت تایید شد</h2>
              <p className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
                پرداخت این سفارش تایید شده اما موجودی این پلن فعلا تمام شده است. به محض اضافه شدن
                اکانت، سفارش شما خودکار تحویل می‌شود و نتیجه در داشبورد نمایش داده خواهد شد.
              </p>
            </div>
          ) : order.status === "PAYMENT_SUBMITTED" || order.payment?.status === "PENDING" ? (
            <OrderReviewPendingCard />
          ) : (
            <div className="rounded-3xl border border-stroke bg-panel p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-ink">پرداخت و تکمیل سفارش</h2>
                  <p className="text-sm leading-7 text-prose">
                    برای ادامه، از دکمه پرداخت داخل کارت بالا استفاده کنید. همه گزینه‌ها (کوپن/بن/کیف‌پول) داخل همان پنجره مرحله‌ای قرار دارد.
                  </p>
                </div>
                {!canPayNow ? (
                  <span className="rounded-full border border-stroke bg-inset px-3 py-1 text-xs font-medium text-prose">
                    پرداخت در این مرحله فعال نیست
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <aside id="order-chat" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-card border border-stroke bg-panel p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">مسیر سفارش</h2>
                <p className="mt-1 text-xs leading-6 text-faint">{progress.summary}</p>
              </div>
              <span className="rounded-full bg-elevated px-2.5 py-1 text-[11px] font-medium text-prose">
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
                            : "bg-elevated text-faint"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < progress.steps.length - 1 ? <span className="mt-1 h-8 w-px bg-stroke/80" /> : null}
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-ink">{step.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          step.state === "done"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : step.state === "current"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                              : "bg-elevated text-faint"
                        }`}
                      >
                        {step.state === "done"
                          ? "انجام شد"
                          : step.state === "current"
                            ? "در حال انجام"
                            : "مرحله بعد"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-faint">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-stroke bg-inset px-3 py-3">
              <div className="text-xs font-medium text-faint">اقدام پیشنهادی</div>
              <div className="mt-1 text-sm font-semibold text-ink">{progress.nextTitle}</div>
              <p className="mt-1 text-xs leading-6 text-faint">{progress.nextDescription}</p>
              {progress.ctaHref ? (
                <a href={progress.ctaHref} className="btn-brand-sm mt-3">
                  {progress.ctaLabel}
                </a>
              ) : (
                <div className="btn-brand-sm mt-3 cursor-default opacity-80">{progress.ctaLabel}</div>
              )}
            </div>
          </section>

          {shouldShowChat ? (
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
          ) : null}
        </aside>
      </div>

      {canPayNow ? (
        <div className="fixed inset-x-4 bottom-4 z-[110] sm:hidden" dir="rtl">
          <div className="rounded-shell border border-stroke/80 bg-panel/92 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <PaymentFlowModal
              orderId={order.id}
              paymentRejected={order.payment?.status === "REJECTED"}
              rejectionReason={paymentRejectionReason}
              statusLabel={order.payment ? translatePaymentStatus(order.payment.status) : "در انتظار پرداخت"}
              triggerLabel={order.payment?.status === "REJECTED" ? "ارسال دوباره رسید" : "پرداخت"}
              triggerClassName="btn-brand w-full rounded-2xl py-3 text-base font-semibold"
              pricing={pricing}
              card={{ holder: cardHolder, number: cardNumber, bank: bankName }}
              tonWalletAddress={tonWalletAddress}
              applyPricingOptionsAction={boundApplyPricingOptionsAction}
              payWithWalletAction={boundPayWithWalletAction}
              submitPaymentAction={boundSubmitPaymentAction}
              submitWalletTopUpAction={boundSubmitWalletTopUpAction}
            />
          </div>
        </div>
      ) : null}
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
      nextDescription:
        paymentStatus === "REJECTED"
          ? "دلیل رد در کادر قرمز بالای صفحه آمده است؛ با دکمهٔ پرداخت مجدد رسید اصلاح‌شده را ارسال کنید."
          : "هرچه زودتر رسید واضح و کامل ثبت شود، سفارش سریع‌تر وارد بررسی می‌شود.",
      ctaLabel: paymentStatus === "REJECTED" ? "ثبت رسید جدید" : "ثبت رسید پرداخت",
      ctaHref: "#order-payment",
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
      ? "border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/40"
      : expiryStatus === "expiringSoon"
        ? "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40"
        : "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40";
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
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-prose">{description}</p>
        </div>
        <a
          href="#config-ready"
          className="btn-brand"
        >
          {expiryStatus === "active" ? "مشاهده کانفیگ" : "تمدید سفارش"}
        </a>
      </div>
    </div>
  );
}
