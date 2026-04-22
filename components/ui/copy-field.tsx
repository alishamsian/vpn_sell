"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

type CopyFieldProps = {
  value: string;
  copyValue?: string;
  label: string;
  className?: string;
  size?: "default" | "sm";
};

export function CopyField({ className = "", label, value, copyValue, size = "default" }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [copyValue, value]);

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-stroke/90 bg-inset/80 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between ${
        size === "sm" ? "p-3" : "p-4"
      } ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className={`font-medium text-faint ${size === "sm" ? "text-[11px]" : "text-xs"}`}>{label}</div>
        <div
          className={`mt-1 break-all font-mono font-semibold tracking-tight text-ink ${
            size === "sm" ? "text-xs" : "text-sm"
          }`}
          dir="ltr"
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-stroke bg-panel text-xs font-semibold text-prose shadow-sm transition hover:border-stroke hover:bg-inset hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/35 focus-visible:ring-offset-2 ${
          size === "sm" ? "px-3 py-1.5" : "px-3 py-2"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            کپی شد
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            کپی
          </>
        )}
      </button>
    </div>
  );
}
