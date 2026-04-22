"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center" dir="rtl">
      <h1 className="text-xl font-semibold text-ink">خطای سرور</h1>
      <p className="text-sm leading-7 text-prose">
        این صفحه به‌درستی بارگذاری نشد. اگر تازه دیپلوی کرده‌اید، اتصال دیتابیس و متغیرهای محیطی (مثل{" "}
        <span className="font-mono text-xs" dir="ltr">
          DATABASE_URL
        </span>
        ) را در پنل Vercel بررسی کنید.
      </p>
      {error.digest ? (
        <p className="text-xs text-faint" dir="ltr">
          digest: {error.digest}
        </p>
      ) : null}
      <button type="button" onClick={() => reset()} className="btn-brand w-full sm:w-auto">
        تلاش دوباره
      </button>
    </div>
  );
}
