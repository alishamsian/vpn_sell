"use client";

import { useEffect, useMemo, useState } from "react";

type TonRateResponse =
  | {
      ok: true;
      priceIrr: number;
      priceToman: number;
      updatedAt: string;
      cached?: boolean;
      warning?: string;
    }
  | { ok: false; message: string };

export function TonLiveConverter({
  tomanAmount,
  refreshMs = 30_000,
  label = "معادل TON",
}: {
  tomanAmount: number;
  refreshMs?: number;
  label?: string;
}) {
  const [rate, setRate] = useState<{ priceToman: number; updatedAt: string } | null>(null);
  const [error, setError] = useState<string>("");
  const [warning, setWarning] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/rates/ton", { cache: "no-store" });
        const data = (await response.json()) as TonRateResponse;
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError("نرخ TON در دسترس نیست.");
          setWarning("");
          return;
        }

        setError("");
        setWarning(data.warning ?? "");
        setRate({ priceToman: data.priceToman, updatedAt: data.updatedAt });
      } catch {
        if (cancelled) return;
        setError("نرخ TON در دسترس نیست.");
        setWarning("");
      }
    }

    void load();
    const interval = window.setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  const tonAmount = useMemo(() => {
    if (!rate?.priceToman || rate.priceToman <= 0) return null;
    return tomanAmount / rate.priceToman;
  }, [rate?.priceToman, tomanAmount]);

  return (
    <div className="rounded-2xl border border-stroke bg-inset px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-faint">{label}</div>
        {rate?.updatedAt ? (
          <div className="text-[11px] text-faint">آپدیت: {new Date(rate.updatedAt).toLocaleTimeString("fa-IR")}</div>
        ) : null}
      </div>
      {error ? (
        <div className="mt-2 text-sm text-rose-700 dark:text-rose-200">{error}</div>
      ) : tonAmount != null ? (
        <div className="mt-2">
          <div className="text-sm font-semibold text-ink">
            {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 6 }).format(tonAmount)} TON
          </div>
          {rate?.priceToman ? (
            <div className="mt-1 text-[11px] text-faint">
              نرخ تقریبی: ۱ TON ≈ {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(rate.priceToman)} تومان
            </div>
          ) : null}
          {warning ? <div className="mt-1 text-[11px] text-faint">{warning}</div> : null}
        </div>
      ) : (
        <div className="mt-2 text-sm text-faint">در حال دریافت…</div>
      )}
    </div>
  );
}

