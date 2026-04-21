import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordResetConfirmForm } from "@/components/password-reset-confirm-form";
import { getSession } from "@/lib/auth";
import { validatePasswordResetToken } from "@/lib/password-reset";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const token = params?.token?.trim() ?? "";
  const validation = token
    ? await validatePasswordResetToken(token)
    : { valid: false, reason: "not_found" as const, userName: null };

  if (!validation.valid) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-950">لینک بازیابی معتبر نیست</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {validation.reason === "expired"
            ? "این لینک منقضی شده است. یک درخواست جدید ثبت کنید."
            : validation.reason === "used"
              ? "این لینک قبلا استفاده شده است. اگر لازم است دوباره درخواست بازیابی بدهید."
              : "لینک بازنشانی پیدا نشد یا معتبر نیست."}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          درخواست لینک جدید
        </Link>
      </div>
    );
  }

  return <PasswordResetConfirmForm token={token} userName={validation.userName} />;
}
