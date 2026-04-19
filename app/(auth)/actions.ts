"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSessionCookie, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!name) {
    return { status: "error", message: "نام و نام خانوادگی الزامی است." };
  }

  if (!email && !phone) {
    return { status: "error", message: "ایمیل یا شماره موبایل را وارد کنید." };
  }

  if (password.length < 8) {
    return { status: "error", message: "رمز عبور باید حداقل ۸ کاراکتر باشد." };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: email || undefined }, { phone: phone || undefined }],
    },
  });

  if (existing) {
    return { status: "error", message: "کاربری با این ایمیل یا شماره قبلا ثبت شده است." };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      passwordHash: await hashPassword(password),
    },
  });

  await setSessionCookie({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
  });

  revalidatePath("/");
  redirect("/dashboard");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!identifier || !password) {
    return { status: "error", message: "شناسه ورود و رمز عبور الزامی است." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  if (!user || user.passwordHash === "legacy-user") {
    return { status: "error", message: "کاربری با این اطلاعات پیدا نشد." };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return { status: "error", message: "رمز عبور اشتباه است." };
  }

  await setSessionCookie({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
  });

  revalidatePath("/");
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  revalidatePath("/");
  redirect("/");
}
