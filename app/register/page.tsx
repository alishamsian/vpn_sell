import { redirect } from "next/navigation";

import { registerAction } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthForm
      title="ساخت حساب کاربری"
      description="برای اینکه پرداخت‌ها به نام شما ثبت شود، یک حساب کاربری بسازید."
      submitLabel="ثبت‌نام"
      alternateText="قبلا ثبت‌نام کرده‌اید؟"
      alternateLabel="ورود"
      alternateHref="/login"
      action={registerAction}
      fields={[
        {
          name: "name",
          label: "نام و نام خانوادگی",
          placeholder: "نام شما",
        },
        {
          name: "email",
          label: "ایمیل",
          type: "email",
          placeholder: "example@mail.com",
        },
        {
          name: "phone",
          label: "شماره موبایل",
          type: "phone",
          placeholder: "0912...",
        },
        {
          name: "password",
          label: "رمز عبور",
          type: "password",
          placeholder: "حداقل ۸ کاراکتر",
        },
      ]}
    />
  );
}
