"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
};

function getWebApp(): TgWebApp | null {
  const w = window as unknown as { Telegram?: { WebApp?: TgWebApp } };
  return w.Telegram?.WebApp ?? null;
}

export default function TelegramWebAppLoginPage() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptLoaded) {
      return;
    }

    const ac = new AbortController();

    (async () => {
      setStatus("loading");
      setError(null);

      const tg = getWebApp();
      if (!tg) {
        if (!ac.signal.aborted) {
          setStatus("error");
          setError("این صفحه را باید از داخل تلگرام (دکمهٔ Web App) باز کنید.");
        }
        return;
      }

      tg.ready();
      tg.expand();

      const initData = tg.initData?.trim() ?? "";
      if (!initData) {
        if (!ac.signal.aborted) {
          setStatus("error");
          setError("دادهٔ احراز تلگرام نیامد؛ یک بار صفحه را ببندید و دوباره از ربات باز کنید.");
        }
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
      }
    })();

    return () => ac.abort();
  }, [scriptLoaded]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center text-zinc-100" dir="rtl">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      <h1 className="text-lg font-semibold">ورود به پنل ادمین</h1>

      {status === "idle" || status === "loading" ? (
        <p className="max-w-sm text-sm text-zinc-400">در حال تأیید هویت با تلگرام…</p>
      ) : null}

      {status === "error" ? (
        <div className="max-w-md space-y-3 rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-100">
          <p>{error}</p>
          <p className="text-xs text-red-200/80">
            در BotFather برای این ربات دامنه را با <code className="rounded bg-black/30 px-1">/setdomain</code> روی همان
            دامنهٔ سایت ست کنید.
          </p>
          <Link href="/login" className="inline-block text-sm text-sky-400 underline">
            ورود معمولی با رمز
          </Link>
        </div>
      ) : null}

      {status === "done" ? <p className="text-sm text-emerald-400">موفق — در حال انتقال به پنل…</p> : null}
    </div>
  );
}
