import { redirect } from "next/navigation";

import { PasswordResetRequestForm } from "@/components/password-reset-request-form";
import { getSession } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <PasswordResetRequestForm />;
}
