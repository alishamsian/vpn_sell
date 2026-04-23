"use client";

import { useMemo, useState } from "react";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { CryptoPayCard } from "@/components/crypto-pay-card";
import { CopyField } from "@/components/ui/copy-field";
import { OrderPricingOptions } from "@/components/order-pricing-options";
import { PaymentProofForm } from "@/components/payment-proof-form";
import { TonLiveConverter } from "@/components/ton-live-converter";
import { WalletPayCard } from "@/components/wallet-pay-card";
import { WalletTopUpForm } from "@/components/wallet-topup-form";
import { formatPrice } from "@/lib/format";

type PaymentFlowModalProps = {
  orderId: string;
  paymentRejected: boolean;
  /** دلیل رد از طرف ادمین (در صورت خالی، فقط متن عمومی نشان داده می‌شود) */
  rejectionReason?: string | null;
  statusLabel: string;
  triggerLabel?: string;
  triggerClassName?: string;
  pricing: {
    subtotal: number;
    discount: number;
    walletApplied: number;
    giftCardApplied: number;
    payable: number;
    walletPayableWith20Percent: number;
  };
  card: {
    holder: string;
    number: string;
    bank: string;
  };
  tonWalletAddress: string;
  applyPricingOptionsAction: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
  payWithWalletAction: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
  submitPaymentAction: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
  submitWalletTopUpAction?: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
};

type PaymentMethod = "WALLET" | "CARD" | "CRYPTO";

function StaticField({ label, value, size = "default" }: { label: string; value: string; size?: "default" | "sm" }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-stroke/90 bg-inset/80 backdrop-blur-sm ${
        size === "sm" ? "p-3" : "p-4"
      }`}
    >
      <div className={`font-medium text-faint ${size === "sm" ? "text-[11px]" : "text-xs"}`}>{label}</div>
      <div className={`mt-1 break-words font-semibold tracking-tight text-ink ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {value}
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-faint">{label}</div>
      <div className={`font-medium ${tone === "success" ? "text-emerald-700 dark:text-emerald-200" : "text-ink"}`}>
        {formatPrice(value)}
      </div>
    </div>
  );
}

export function PaymentFlowModal(props: PaymentFlowModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);

  const payableRial = useMemo(() => Math.round(props.pricing.payable * 10), [props.pricing.payable]);
  const payableRialDisplay = useMemo(
    () => `${new Intl.NumberFormat("fa-IR").format(payableRial)} ریال`,
    [payableRial],
  );

  const title = props.paymentRejected ? "اصلاح و ارسال دوباره رسید" : "پرداخت سفارش";
  const subtitle = props.paymentRejected
    ? props.rejectionReason
      ? "رسید قبلی رد شده است. دلیل را بخوانید، مبلغ را بررسی کنید و رسید جدید بفرستید."
      : "رسید قبلی رد شده است. مبلغ را بررسی کنید و روش پرداخت را انتخاب کنید."
    : "مبلغ را بررسی کنید، گزینه‌ها را اعمال کنید و سپس روش پرداخت را انتخاب کنید.";

  const canUseWalletPay = useMemo(() => props.pricing.walletPayableWith20Percent > 0, [props.pricing.walletPayableWith20Percent]);

  const tonBaseToman = useMemo(() => {
    if (step === 3 && method === "WALLET" && canUseWalletPay) {
      return props.pricing.walletPayableWith20Percent;
    }
    return props.pricing.payable;
  }, [canUseWalletPay, method, props.pricing.payable, props.pricing.walletPayableWith20Percent, step]);

  const tonLabel = useMemo(() => {
    if (step === 3 && method === "WALLET" && canUseWalletPay) {
      return "معادل TON (با تخفیف کیف‌پول)";
    }
    return "معادل TON";
  }, [canUseWalletPay, method, step]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStep(1);
          setMethod("WALLET");
          setStep1Done(false);
          setStep2Done(false);
        }}
        className={props.triggerClassName ?? "btn-brand w-full sm:w-auto"}
      >
        {props.triggerLabel ?? "پرداخت"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" dir="rtl">
          <button
            type="button"
            aria-label="بستن پنجره"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] flex max-h-[min(92dvh,56rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-stroke bg-panel shadow-2xl sm:rounded-3xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stroke/70 px-4 pb-3 pt-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs leading-6 text-faint">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-stroke bg-panel px-3 py-1.5 text-xs font-medium text-prose transition hover:bg-inset"
              >
                بستن
              </button>
            </div>

            {props.paymentRejected && props.rejectionReason ? (
              <div className="shrink-0 border-b border-rose-200/90 bg-rose-50 px-4 py-3 dark:border-rose-800/50 dark:bg-rose-950/35 sm:px-6">
                <div className="text-xs font-semibold text-rose-950 dark:text-rose-100">دلیل رد از طرف پشتیبان</div>
                <p className="mt-1 text-sm leading-7 text-rose-900/95 dark:text-rose-50/90">{props.rejectionReason}</p>
              </div>
            ) : null}

            <div className="shrink-0 border-b border-stroke/70 px-4 py-2 sm:px-6">
              <div className="flex gap-1 rounded-2xl bg-elevated p-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    step === 1 ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
                  }`}
                >
                  ۱) مبلغ و گزینه‌ها
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (step1Done) {
                      setStep(2);
                    }
                  }}
                  disabled={!step1Done}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    step === 2 ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
                  } ${!step1Done ? "cursor-not-allowed opacity-55 hover:text-prose" : ""}`}
                >
                  ۲) روش پرداخت
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (step2Done) {
                      setStep(3);
                    }
                  }}
                  disabled={!step2Done}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    step === 3 ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
                  } ${!step2Done ? "cursor-not-allowed opacity-55 hover:text-prose" : ""}`}
                >
                  ۳) انجام پرداخت
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
                <div className="space-y-6">
                  {step === 1 ? (
                    <>
                      <OrderPricingOptions action={props.applyPricingOptionsAction} />
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stroke bg-inset px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-faint">مبلغ قابل پرداخت</div>
                          <div className="text-lg font-semibold text-ink">{formatPrice(props.pricing.payable)}</div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <button
                            type="button"
                            className="btn-brand w-full sm:w-auto"
                            onClick={() => {
                              setStep1Done(true);
                              setStep(2);
                            }}
                          >
                            ادامه
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {step === 2 ? (
                    <div className="rounded-3xl border border-stroke bg-panel p-6 shadow-soft">
                      <h4 className="text-lg font-semibold text-ink">انتخاب روش پرداخت</h4>
                      <p className="mt-2 text-sm leading-7 text-prose">یک روش را انتخاب کنید و سپس «ادامه» را بزنید.</p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setMethod("WALLET")}
                          disabled={!canUseWalletPay}
                          className={`rounded-3xl border p-5 text-right transition ${
                            method === "WALLET"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          } ${!canUseWalletPay ? "opacity-60" : ""}`}
                        >
                          <div className="text-sm font-semibold">کیف‌پول (۲۰٪ تخفیف)</div>
                          <div className={`mt-2 text-xs leading-6 ${method === "WALLET" ? "text-white/80 dark:text-prose" : "text-faint"}`}>
                            پرداخت کامل داخل سایت، بدون نیاز به رسید.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethod("CARD")}
                          className={`rounded-3xl border p-5 text-right transition ${
                            method === "CARD"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          }`}
                        >
                          <div className="text-sm font-semibold">کارت‌به‌کارت</div>
                          <div className={`mt-2 text-xs leading-6 ${method === "CARD" ? "text-white/80 dark:text-prose" : "text-faint"}`}>
                            واریز و سپس ثبت رسید برای بررسی.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethod("CRYPTO")}
                          className={`rounded-3xl border p-5 text-right transition sm:col-span-2 ${
                            method === "CRYPTO"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          }`}
                        >
                          <div className="text-sm font-semibold">ارز دیجیتال (TON)</div>
                          <div className={`mt-2 text-xs leading-6 ${method === "CRYPTO" ? "text-white/80 dark:text-prose" : "text-faint"}`}>
                            پرداخت با TON و ثبت هش تراکنش برای بررسی.
                          </div>
                        </button>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button type="button" className="rounded-2xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-inset" onClick={() => setStep(1)}>
                          برگشت
                        </button>
                        <button
                          type="button"
                          className="btn-brand"
                          onClick={() => {
                            setStep2Done(true);
                            setStep(3);
                          }}
                        >
                          ادامه
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    method === "WALLET" ? (
                      <div className="space-y-4">
                        <WalletPayCard
                          payableToman={props.pricing.walletPayableWith20Percent}
                          action={props.payWithWalletAction}
                        />
                        {props.submitWalletTopUpAction ? (
                          <div className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                            <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                              <h4 className="text-base font-semibold text-ink">افزایش اعتبار کیف‌پول (مبلغ دلخواه)</h4>
                              <p className="mt-1 text-sm leading-7 text-prose">
                                مبلغ دلخواه را کارت‌به‌کارت کنید و رسید را ثبت کنید تا بعد از تایید ادمین به کیف‌پول اضافه شود.
                              </p>
                            </div>
                            <div className="space-y-4 px-5 py-5">
                              <div className="grid gap-3">
                                <CopyField label="شماره کارت" value={props.card.number} />
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <StaticField label="نام دارنده کارت" value={props.card.holder} size="sm" />
                                  <StaticField label="بانک" value={props.card.bank} size="sm" />
                                </div>
                              </div>
                              <div className="rounded-2xl border border-stroke bg-inset p-4">
                                <div className="text-xs font-medium text-faint">ثبت رسید شارژ</div>
                                <div className="mt-3">
                                  <WalletTopUpForm action={props.submitWalletTopUpAction} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : method === "CRYPTO" ? (
                      <div className="space-y-4">
                        <CryptoPayCard walletAddress={props.tonWalletAddress} tomanAmount={tonBaseToman} />
                        <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                          <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                            <h4 className="text-base font-semibold text-ink">ثبت هش تراکنش</h4>
                            <p className="mt-1 text-sm leading-7 text-prose">
                              بعد از انتقال، هش تراکنش را وارد کنید و تصویر رسید/اسکرین‌شات انتقال را هم ارسال کنید.
                            </p>
                          </div>
                          <div className="px-5 py-5">
                            <PaymentProofForm
                              orderId={props.orderId}
                              amount={String(props.pricing.payable)}
                              action={props.submitPaymentAction}
                              showAmountField={false}
                              trackingLabel="هش تراکنش"
                              trackingPlaceholder="Tx Hash"
                              showCardLast4Field={false}
                              cardLast4Default="CRYP"
                            />
                          </div>
                        </section>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                          <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                            <h4 className="text-base font-semibold text-ink">اطلاعات کارت برای واریز</h4>
                            <p className="mt-1 text-sm leading-7 text-prose">
                              مبلغ سفارش ثابت است. بعد از واریز، رسید را در بخش پایین ثبت کنید.
                            </p>
                          </div>
                          <div className="space-y-3 px-5 py-5">
                            <CopyField label="مبلغ واریز (ریال)" value={payableRialDisplay} copyValue={String(payableRial)} />
                            <CopyField label="شماره کارت" value={props.card.number} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <StaticField label="نام دارنده کارت" value={props.card.holder} size="sm" />
                              <StaticField label="بانک" value={props.card.bank} size="sm" />
                            </div>
                          </div>
                        </section>
                        <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                          <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                            <h4 className="text-base font-semibold text-ink">ثبت رسید پرداخت</h4>
                            <p className="mt-1 text-sm leading-7 text-prose">
                              رسید را ارسال کنید تا بررسی شود. پیام موفقیت/خطا به‌صورت toast نمایش داده می‌شود.
                            </p>
                          </div>
                          <div className="px-5 py-5">
                          <PaymentProofForm
                            orderId={props.orderId}
                            amount={String(props.pricing.payable)}
                            action={props.submitPaymentAction}
                            showAmountField={false}
                          />
                          </div>
                        </section>
                      </div>
                    )
                  ) : null}
                </div>

                <aside className="space-y-6">
                  <section className="rounded-3xl border border-stroke bg-panel p-6 shadow-soft">
                    <h4 className="text-lg font-semibold text-ink">خلاصه مبلغ</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <PriceRow label="قیمت پایه" value={props.pricing.subtotal} />
                      {props.pricing.discount > 0 ? (
                        <PriceRow label="تخفیف" value={-props.pricing.discount} tone="success" />
                      ) : null}
                      {props.pricing.walletApplied > 0 ? (
                        <PriceRow label="کسر از کیف‌پول" value={-props.pricing.walletApplied} />
                      ) : null}
                      {props.pricing.giftCardApplied > 0 ? (
                        <PriceRow label="کسر از بن خرید" value={-props.pricing.giftCardApplied} />
                      ) : null}
                      <div className="mt-3 border-t border-stroke/80 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-ink">مبلغ قابل پرداخت</div>
                          <div className="text-sm font-semibold text-ink">{formatPrice(props.pricing.payable)}</div>
                        </div>
                        <div className="mt-3">
                          <TonLiveConverter tomanAmount={tonBaseToman} label={tonLabel} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-stroke bg-inset px-3 py-2 text-xs text-faint">
                      وضعیت: {props.statusLabel}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

