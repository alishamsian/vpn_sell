"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

type CopyButtonProps = {
  value: string;
};

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    showToast("کانفیگ در کلیپ‌بورد کپی شد.", "success");

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "کپی شد" : "کپی کانفیگ"}
    </button>
  );
}
