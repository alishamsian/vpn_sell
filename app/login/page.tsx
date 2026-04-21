import { redirect } from "next/navigation";

import { loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;

  return (
    <AuthForm
      title="ورود به حساب"
      description="برای ثبت سفارش و پیگیری پرداخت، با ایمیل یا شماره موبایل وارد شوید."
      submitLabel="ورود"
      alternateText="حساب ندارید؟"
      alternateLabel="ثبت‌نام"
      alternateHref="/register"
      notice={params?.reset === "success" ? "رمز عبور شما با موفقیت تغییر کرد. حالا وارد شوید." : undefined}
      helperLink={{
        href: "/forgot-password",
        label: "رمز عبور را فراموش کرده‌اید؟",
      }}
      action={loginAction}
      fields={[
        {
          name: "identifier",
          label: "ایمیل یا شماره موبایل",
          placeholder: "example@mail.com یا 0912...",
        },
        {
          name: "password",
          label: "رمز عبور",
          type: "password",
          placeholder: "رمز عبور",
        },
      ]}
    />
  );
}
