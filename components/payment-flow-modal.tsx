"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { PaymentActionState } from "@/app/dashboard/orders/[orderId]/actions";
import { CryptoPayCard } from "@/components/crypto-pay-card";
import { CopyField } from "@/components/ui/copy-field";
import { OrderPricingOptions } from "@/components/order-pricing-options";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<PaymentMethod>("WALLET");
  const [proofTrackingCode, setProofTrackingCode] = useState("");
  const [proofCardLast4, setProofCardLast4] = useState("");
  const [proofReceipt, setProofReceipt] = useState<File | null>(null);
  const [proofClientError, setProofClientError] = useState("");
  const [proofSubmitError, setProofSubmitError] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const MAX_RECEIPT_FILE_SIZE_BYTES = 2 * 1024 * 1024;

  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      html.dataset.paymentOpen = "1";
      return () => {
        delete html.dataset.paymentOpen;
      };
    }
    delete html.dataset.paymentOpen;
    return;
  }, [open]);

  const payableRial = useMemo(() => Math.round(props.pricing.payable * 10), [props.pricing.payable]);
  const payableRialDisplay = useMemo(
    () => `${new Intl.NumberFormat("fa-IR").format(payableRial)} ریال`,
    [payableRial],
  );

  const title = props.paymentRejected ? "اصلاح و ارسال دوباره رسید" : "پرداخت سفارش";
  const subtitle = props.paymentRejected
    ? props.rejectionReason
      ? "رسید قبلی رد شده است. دلیل را بخوانید، مبلغ را بررسی کنید و رسید جدید بفرستید."
      : "رسید قبلی رد شده است. روش پرداخت را انتخاب کنید و رسید جدید بفرستید."
    : "روش پرداخت را انتخاب کنید و در پایان، تایید نهایی انجام دهید.";

  const canUseWalletPay = useMemo(() => props.pricing.walletPayableWith20Percent > 0, [props.pricing.walletPayableWith20Percent]);

  const tonBaseToman = useMemo(() => {
    if (step === 2 && method === "WALLET" && canUseWalletPay) {
      return props.pricing.walletPayableWith20Percent;
    }
    return props.pricing.payable;
  }, [canUseWalletPay, method, props.pricing.payable, props.pricing.walletPayableWith20Percent, step]);

  const tonLabel = useMemo(() => {
    if (step === 2 && method === "WALLET" && canUseWalletPay) {
      return "معادل TON (با تخفیف کیف‌پول)";
    }
    return "معادل TON";
  }, [canUseWalletPay, method, step]);

  function handleReceiptChange(file: File | null) {
    if (!file) {
      setProofReceipt(null);
      setProofClientError("");
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
      setProofReceipt(null);
      setProofClientError("حجم تصویر رسید نباید بیشتر از ۲ مگابایت باشد.");
      return;
    }

    setProofReceipt(file);
    setProofClientError("");
  }

  function validateProofInputs() {
    if (!proofTrackingCode.trim()) {
      return "کد پیگیری را وارد کنید.";
    }
    if (method === "CARD" && proofCardLast4.trim().length !== 4) {
      return "۴ رقم آخر کارت را درست وارد کنید.";
    }
    if (!proofReceipt) {
      return "تصویر رسید را انتخاب کنید.";
    }
    if (proofClientError) {
      return proofClientError;
    }
    return null;
  }

  async function submitProof() {
    const error = validateProofInputs();
    if (error) {
      setProofSubmitError(error);
      return;
    }

    setProofSubmitError(null);
    setIsSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.set("orderId", props.orderId);
      formData.set("amount", String(props.pricing.payable));
      formData.set("trackingCode", proofTrackingCode.trim());
      formData.set("cardLast4", method === "CRYPTO" ? "CRYP" : proofCardLast4.trim());
      if (proofReceipt) {
        formData.set("receipt", proofReceipt);
      }
      const result = await props.submitPaymentAction({ status: "idle", message: "" } as PaymentActionState, formData);
      if (result.status !== "success") {
        setProofSubmitError(result.message || "ارسال رسید انجام نشد.");
        return;
      }
      router.refresh();
      window.setTimeout(() => setOpen(false), 350);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ارسال رسید انجام نشد.";
      setProofSubmitError(message);
    } finally {
      setIsSubmittingProof(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStep(1);
          setMethod("WALLET");
          setProofTrackingCode("");
          setProofCardLast4("");
          setProofReceipt(null);
          setProofClientError("");
          setProofSubmitError(null);
          setIsSubmittingProof(false);
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
            onClick={() => {
              if (!isSubmittingProof) {
                setOpen(false);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[1] flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-stroke bg-panel shadow-2xl sm:max-h-[min(92dvh,56rem)] sm:rounded-3xl"
          >
            {isSubmittingProof ? (
              <div className="absolute inset-0 z-[5] grid place-items-center bg-panel/80 backdrop-blur-sm">
                <div className="w-[min(22rem,calc(100%-2rem))] rounded-3xl border border-stroke bg-panel px-5 py-5 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-stroke border-t-sky-500" aria-hidden />
                    <div className="text-sm font-semibold text-ink">در حال ارسال رسید…</div>
                  </div>
                  <div className="mt-2 text-[13px] leading-6 text-faint">
                    لطفاً چند ثانیه صبر کنید. بعد از ثبت موفق، صفحه به‌روزرسانی می‌شود.
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stroke/70 px-4 pb-3 pt-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs leading-6 text-faint">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingProof) {
                    setOpen(false);
                  }
                }}
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
                  <span className="sm:hidden">۱) روش</span>
                  <span className="hidden sm:inline">۱) روش پرداخت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    step === 2 ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
                  }`}
                >
                  <span className="sm:hidden">۲) اطلاعات</span>
                  <span className="hidden sm:inline">۲) اطلاعات پرداخت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    step === 3 ? "bg-panel text-ink shadow-sm" : "text-prose hover:text-ink"
                  }`}
                >
                  <span className="sm:hidden">۳) تایید</span>
                  <span className="hidden sm:inline">۳) تایید نهایی</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
                <div className="space-y-6">
                  {step === 1 ? (
                    <div className="rounded-3xl border border-stroke bg-panel p-5 shadow-soft sm:p-6">
                      <h4 className="text-base font-semibold text-ink sm:text-lg">روش پرداخت</h4>
                      <p className="mt-1 text-[13px] leading-6 text-faint sm:mt-2 sm:text-sm sm:leading-7 sm:text-prose">
                        یک روش را انتخاب کنید.
                      </p>

                      <div className="mt-4 grid gap-2 sm:gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setMethod("WALLET")}
                          disabled={!canUseWalletPay}
                          className={`rounded-2xl border p-4 text-right transition sm:rounded-3xl sm:p-5 ${
                            method === "WALLET"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          } ${!canUseWalletPay ? "opacity-60" : ""}`}
                        >
                          <div className="text-sm font-semibold">کیف‌پول (۲۰٪ تخفیف)</div>
                          <div
                            className={`mt-1 text-[12px] leading-6 ${method === "WALLET" ? "text-white/80 dark:text-prose" : "text-faint"}`}
                          >
                            بدون رسید
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethod("CARD")}
                          className={`rounded-2xl border p-4 text-right transition sm:rounded-3xl sm:p-5 ${
                            method === "CARD"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          }`}
                        >
                          <div className="text-sm font-semibold">کارت‌به‌کارت</div>
                          <div
                            className={`mt-1 text-[12px] leading-6 ${method === "CARD" ? "text-white/80 dark:text-prose" : "text-faint"}`}
                          >
                            واریز + رسید
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethod("CRYPTO")}
                          className={`rounded-2xl border p-4 text-right transition sm:col-span-2 sm:rounded-3xl sm:p-5 ${
                            method === "CRYPTO"
                              ? "border-transparent bg-slate-950 text-white dark:bg-elevated dark:text-ink"
                              : "border-stroke bg-panel text-ink hover:bg-elevated"
                          }`}
                        >
                          <div className="text-sm font-semibold">ارز دیجیتال (TON)</div>
                          <div
                            className={`mt-1 text-[12px] leading-6 ${method === "CRYPTO" ? "text-white/80 dark:text-prose" : "text-faint"}`}
                          >
                            پرداخت + هش
                          </div>
                        </button>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="btn-brand"
                          onClick={() => {
                            setStep(2);
                          }}
                        >
                          ادامه
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    method === "WALLET" ? (
                      <div className="space-y-4">
                        <details className="rounded-3xl border border-stroke bg-panel shadow-soft">
                          <summary className="cursor-pointer select-none bg-inset px-5 py-4 text-sm font-semibold text-ink hover:bg-elevated">
                            کد تخفیف و گزینه‌ها (اختیاری)
                          </summary>
                          <div className="px-5 pb-5">
                            <OrderPricingOptions action={props.applyPricingOptionsAction} />
                          </div>
                        </details>
                        <WalletPayCard
                          payableToman={props.pricing.walletPayableWith20Percent}
                          action={props.payWithWalletAction}
                        />
                        {props.submitWalletTopUpAction ? (
                          <details className="rounded-3xl border border-stroke bg-panel shadow-soft">
                            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-ink hover:bg-inset">
                              شارژ کیف‌پول (اختیاری)
                            </summary>
                            <div className="space-y-4 px-5 pb-5">
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
                          </details>
                        ) : null}
                      </div>
                    ) : method === "CRYPTO" ? (
                      <div className="space-y-4">
                        <details className="rounded-3xl border border-stroke bg-panel shadow-soft">
                          <summary className="cursor-pointer select-none bg-inset px-5 py-4 text-sm font-semibold text-ink hover:bg-elevated">
                            کد تخفیف و گزینه‌ها (اختیاری)
                          </summary>
                          <div className="px-5 pb-5">
                            <OrderPricingOptions action={props.applyPricingOptionsAction} />
                          </div>
                        </details>
                        <CryptoPayCard walletAddress={props.tonWalletAddress} tomanAmount={tonBaseToman} />
                        <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                          <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                            <h4 className="text-base font-semibold text-ink">هش تراکنش</h4>
                            <p className="mt-1 text-[13px] leading-6 text-faint sm:text-sm sm:leading-7 sm:text-prose">
                              هش + تصویر رسید را وارد کنید؛ در مرحله بعد تایید نهایی می‌کنید.
                            </p>
                          </div>
                          <div className="px-5 py-5">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label htmlFor="trackingCode" className="text-sm font-medium text-prose">
                                  هش تراکنش
                                </label>
                                <input
                                  id="trackingCode"
                                  dir="ltr"
                                  value={proofTrackingCode}
                                  onChange={(e) => setProofTrackingCode(e.target.value)}
                                  placeholder="Tx Hash"
                                  className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="receipt" className="text-sm font-medium text-prose">
                                  تصویر رسید
                                </label>
                                <input
                                  id="receipt"
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(e) => handleReceiptChange(e.currentTarget.files?.[0] ?? null)}
                                  className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                                />
                                <div className="text-xs text-faint">حداکثر حجم مجاز: ۲ مگابایت</div>
                              </div>

                              <button
                                type="button"
                                className="btn-brand w-full"
                                onClick={() => {
                                  const err = validateProofInputs();
                                  if (err) {
                                    setProofSubmitError(err);
                                    return;
                                  }
                                  setProofSubmitError(null);
                                  setStep(3);
                                }}
                              >
                                ادامه (تایید نهایی)
                              </button>
                            </div>
                          </div>
                        </section>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <details className="rounded-3xl border border-stroke bg-panel shadow-soft">
                          <summary className="cursor-pointer select-none bg-inset px-5 py-4 text-sm font-semibold text-ink hover:bg-elevated">
                            کد تخفیف و گزینه‌ها (اختیاری)
                          </summary>
                          <div className="px-5 pb-5">
                            <OrderPricingOptions action={props.applyPricingOptionsAction} />
                          </div>
                        </details>

                        <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                          <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                            <h4 className="text-base font-semibold text-ink">اطلاعات واریز</h4>
                            <p className="mt-1 text-[13px] leading-6 text-faint sm:text-sm sm:leading-7 sm:text-prose">
                              مبلغ و شماره کارت را کپی کنید و بعد رسید را ثبت کنید.
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
                            <h4 className="text-base font-semibold text-ink">ثبت رسید</h4>
                            <p className="mt-1 text-[13px] leading-6 text-faint sm:text-sm sm:leading-7 sm:text-prose">
                              بعد از واریز، اطلاعات را وارد کنید؛ در مرحله بعد تایید نهایی می‌کنید.
                            </p>
                          </div>
                          <div className="px-5 py-5">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label htmlFor="trackingCode" className="text-sm font-medium text-prose">
                                  کد پیگیری
                                </label>
                                <input
                                  id="trackingCode"
                                  dir="ltr"
                                  value={proofTrackingCode}
                                  onChange={(e) => setProofTrackingCode(e.target.value)}
                                  placeholder="مثلا 123456"
                                  className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="cardLast4" className="text-sm font-medium text-prose">
                                  ۴ رقم آخر کارت پرداخت‌کننده
                                </label>
                                <input
                                  id="cardLast4"
                                  dir="ltr"
                                  maxLength={4}
                                  value={proofCardLast4}
                                  onChange={(e) => setProofCardLast4(e.target.value)}
                                  placeholder="1234"
                                  className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="receipt" className="text-sm font-medium text-prose">
                                  تصویر رسید
                                </label>
                                <input
                                  id="receipt"
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={(e) => handleReceiptChange(e.currentTarget.files?.[0] ?? null)}
                                  className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
                                />
                                <div className="text-xs text-faint">حداکثر حجم مجاز: ۲ مگابایت</div>
                              </div>

                              <button
                                type="button"
                                className="btn-brand w-full"
                                onClick={() => {
                                  const err = validateProofInputs();
                                  if (err) {
                                    setProofSubmitError(err);
                                    return;
                                  }
                                  setProofSubmitError(null);
                                  setStep(3);
                                }}
                              >
                                ادامه (تایید نهایی)
                              </button>
                            </div>
                          </div>
                        </section>
                      </div>
                    )
                  ) : null}

                  {step === 3 ? (
                    method === "CARD" || method === "CRYPTO" ? (
                      <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
                        <div className="border-b border-stroke/70 bg-inset px-5 py-4">
                          <h4 className="text-base font-semibold text-ink">تایید نهایی</h4>
                          <p className="mt-1 text-[13px] leading-6 text-faint sm:text-sm sm:leading-7 sm:text-prose">
                            اگر اطلاعات درست است، تایید کنید تا رسید ارسال شود.
                          </p>
                        </div>
                        <div className="space-y-3 px-5 py-5 text-[13px] text-prose sm:text-sm">
                          <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                            <div className="text-xs font-medium text-faint">مبلغ</div>
                            <div className="mt-1 font-semibold text-ink">{formatPrice(props.pricing.payable)}</div>
                          </div>
                          <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                            <div className="text-xs font-medium text-faint">
                              {method === "CRYPTO" ? "هش تراکنش" : "کد پیگیری"}
                            </div>
                            <div className="mt-1 font-semibold text-ink break-words" dir="ltr">
                              {proofTrackingCode || "-"}
                            </div>
                          </div>
                          {method === "CARD" ? (
                            <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                              <div className="text-xs font-medium text-faint">۴ رقم آخر کارت</div>
                              <div className="mt-1 font-semibold text-ink" dir="ltr">
                                {proofCardLast4 || "-"}
                              </div>
                            </div>
                          ) : null}
                          <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
                            <div className="text-xs font-medium text-faint">فایل رسید</div>
                            <div className="mt-1 font-semibold text-ink break-words" dir="ltr">
                              {proofReceipt?.name ?? "-"}
                            </div>
                          </div>

                          {proofSubmitError ? (
                            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                              {proofSubmitError}
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              className="rounded-2xl border border-stroke bg-panel px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-inset"
                              onClick={() => setStep(2)}
                              disabled={isSubmittingProof}
                            >
                              برگشت
                            </button>
                            <button
                              type="button"
                              className="btn-brand w-full"
                              onClick={() => void submitProof()}
                              disabled={isSubmittingProof}
                            >
                              {isSubmittingProof ? "در حال ارسال…" : "تایید و ارسال رسید"}
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : (
                      <div className="rounded-3xl border border-stroke bg-panel p-5 text-sm text-prose shadow-soft">
                        برای این روش پرداخت، تایید نهایی لازم نیست.
                      </div>
                    )
                  ) : null}
                </div>

                <aside className="space-y-6 hidden lg:block">
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

