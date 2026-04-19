import { redirect } from "next/navigation";

import { loginAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthForm
      title="ورود به حساب"
      description="برای ثبت سفارش و پیگیری پرداخت، با ایمیل یا شماره موبایل وارد شوید."
      submitLabel="ورود"
      alternateText="حساب ندارید؟"
      alternateLabel="ثبت‌نام"
      alternateHref="/register"
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
