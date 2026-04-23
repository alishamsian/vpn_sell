"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

function getWebApp(): TgWebApp | null {
  const w = window as unknown as { Telegram?: { WebApp?: TgWebApp } };
  return w.Telegram?.WebApp ?? null;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * تلگرام گاهی بعد از load اسکریپت و ready() چند صد میلی‌ثانیه طول می‌کشد تا initData پر شود.
 */
async function waitForInitData(options: { timeoutMs: number; intervalMs: number }): Promise<string | null> {
  const { timeoutMs, intervalMs } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const tg = getWebApp();
    if (tg) {
      tg.ready();
      tg.expand();
      const raw = tg.initData?.trim() ?? "";
      if (raw.length > 0) {
        return raw;
      }
    }
    await sleep(intervalMs);
  }

  return null;
}

const EMPTY_INIT_HELP = [
  "تلگرام دادهٔ امضاشده (initData) را نفرستاد؛ بدون آن سرور نمی‌تواند هویت شما را تأیید کند.",
  "",
  "معمولاً یکی از این‌هاست:",
  "• صفحه را با «لینک معمولی» یا مرورگر باز کرده‌اید — باید فقط با دکمهٔ «پنل کامل در تلگرام / پنل کامل (تلگرام)» داخل خودِ ربات باز شود.",
  "• در BotFather دامنه ست نشده یا با دامنهٔ واقعی سایت فرق دارد: @BotFather → /setdomain → همان دامنه‌ای که سایت با آن بالا می‌آید، بدون https (مثلاً shop.example.com). اگر سایت با www است، www را هم بدهید.",
  "• آدرس سایت در env با دامنهٔ Web App یکی نیست: مقدار NEXT_PUBLIC_APP_URL در Vercel باید همان دامنهٔ تأییدشده باشد (ترجیحاً https://…).",
  "• روی localhost معمولاً Web App درست کار نمی‌کند؛ با دامنهٔ production یا تونل (مثل ngrok) تست کنید.",
].join("\n");

export default function TelegramWebAppLoginPage() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showSetdomainHint, setShowSetdomainHint] = useState(true);

  useEffect(() => {
    if (!scriptLoaded) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setStatus("loading");
      setError(null);
      setShowSetdomainHint(true);

      const initData = await waitForInitData({ timeoutMs: 8000, intervalMs: 120 });

      if (ac.signal.aborted) {
        return;
      }

      if (!getWebApp()) {
        setStatus("error");
        setError(
          "شیء Telegram.WebApp پیدا نشد. این صفحه را فقط از داخل تلگرام و با دکمهٔ Web App ربات باز کنید؛ باز کردن در Safari/Chrome معمولی کار نمی‌کند.",
        );
        setShowSetdomainHint(false);
        return;
      }

      if (!initData) {
        setStatus("error");
        setError(EMPTY_INIT_HELP);
        return;
      }

      try {
        const res = await fetch("/api/auth/telegram-webapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
          credentials: "include",
          signal: ac.signal,
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };

        if (ac.signal.aborted) {
          return;
        }

        if (!res.ok || !data.ok) {
          setStatus("error");
          setError(data.error ?? "ورود ناموفق بود.");
          setShowSetdomainHint(false);
          return;
        }

        setStatus("done");
        window.location.replace("/admin");
      } catch (e) {
        if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
          return;
        }
        setStatus("error");
        setError("ارتباط با سرور برقرار نشد.");
        setShowSetdomainHint(false);
      }
    })();

    return () => ac.abort();
  }, [scriptLoaded]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center text-zinc-100" dir="rtl">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => {
          requestAnimationFrame(() => setScriptLoaded(true));
        }}
      />

      <h1 className="text-lg font-semibold">ورود به پنل ادمین</h1>

      {status === "idle" || status === "loading" ? (
        <p className="max-w-sm text-sm text-zinc-400">در حال اتصال به تلگرام و دریافت initData…</p>
      ) : null}

      {status === "error" ? (
        <div className="max-w-lg space-y-3 rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-right text-sm leading-relaxed text-red-100">
          <p className="whitespace-pre-wrap">{error}</p>
          {showSetdomainHint ? (
            <p className="text-xs text-red-200/90">
              اگر initData خالی است، اول <code className="rounded bg-black/30 px-1">/setdomain</code> را در @BotFather
              چک کنید؛ اگر امضا رد شد، همان پیام خطای API را ببینید.
            </p>
          ) : null}
          <Link href="/login" className="inline-block text-sm text-sky-400 underline">
            ورود معمولی با رمز
          </Link>
        </div>
      ) : null}

      {status === "done" ? <p className="text-sm text-emerald-400">موفق — در حال انتقال به پنل…</p> : null}
    </div>
  );
}
