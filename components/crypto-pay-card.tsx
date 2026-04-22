"use client";

import { useEffect, useMemo, useState } from "react";

import { CopyField } from "@/components/ui/copy-field";

type TonRateResponse =
  | {
      ok: true;
      priceToman: number;
      updatedAt: string;
      cached?: boolean;
      warning?: string;
    }
  | { ok: false; message: string };

export function CryptoPayCard({
  walletAddress,
  tomanAmount,
}: {
  walletAddress: string;
  tomanAmount: number;
}) {
  const [rate, setRate] = useState<{ priceToman: number; updatedAt: string; warning?: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/rates/ton", { cache: "no-store" });
        const data = (await response.json()) as TonRateResponse;
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError("نرخ TON در دسترس نیست.");
          return;
        }

        setError("");
        setRate({ priceToman: data.priceToman, updatedAt: data.updatedAt, warning: data.warning });
      } catch {
        if (cancelled) return;
        setError("نرخ TON در دسترس نیست.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const tonAmount = useMemo(() => {
    if (!rate?.priceToman || rate.priceToman <= 0) return null;
    return tomanAmount / rate.priceToman;
  }, [rate?.priceToman, tomanAmount]);

  const tonForCopy = useMemo(() => {
    if (tonAmount == null) return "";
    // برای انتقال، مقدار ثابت با ۶ رقم اعشار کپی شود
    return tonAmount.toFixed(6);
  }, [tonAmount]);

  const tonForDisplay = useMemo(() => {
    if (tonAmount == null) return "";
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 6 }).format(tonAmount)} TON`;
  }, [tonAmount]);

  return (
    <section className="overflow-hidden rounded-3xl border border-stroke bg-panel shadow-soft">
      <div className="border-b border-stroke/70 bg-inset px-5 py-4">
        <h4 className="text-base font-semibold text-ink">پرداخت با ارز دیجیتال (TON)</h4>
        <p className="mt-1 text-sm leading-7 text-prose">آدرس را کپی کنید و دقیقاً مقدار مشخص‌شده را ارسال کنید.</p>
      </div>
      <div className="space-y-3 px-5 py-5">
        <CopyField label="آدرس کیف‌پول (TON)" value={walletAddress} />
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : tonAmount != null ? (
          <CopyField label="مقدار پرداخت (TON)" value={tonForDisplay} copyValue={tonForCopy} />
        ) : (
          <div className="rounded-2xl border border-stroke bg-inset px-4 py-3 text-sm text-faint">در حال محاسبه مقدار TON…</div>
        )}
        {rate?.updatedAt ? (
          <div className="text-[11px] text-faint">
            نرخ: ۱ TON ≈ {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(rate.priceToman)} تومان | آپدیت:{" "}
            {new Date(rate.updatedAt).toLocaleTimeString("fa-IR")}
            {rate.warning ? ` | ${rate.warning}` : ""}
          </div>
        ) : null}
      </div>
    </section>
  );
}

