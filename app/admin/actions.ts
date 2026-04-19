"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { reviewPayment } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createPlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const priceValue = String(formData.get("price") ?? "").trim();
  const price = Number(priceValue);

  if (!name) {
    return {
      status: "error",
      message: "نام پلن الزامی است.",
    };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return {
      status: "error",
      message: "قیمت باید یک عدد مثبت باشد.",
    };
  }

  await prisma.plan.create({
    data: {
      name,
      price: new Prisma.Decimal(price),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    status: "success",
    message: "پلن با موفقیت ساخته شد.",
  };
}

export async function addAccountsAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const rawConfigs = String(formData.get("configs") ?? "");
  const configs = rawConfigs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!planId) {
    return {
      status: "error",
      message: "لطفا یک پلن انتخاب کنید.",
    };
  }

  if (configs.length === 0) {
    return {
      status: "error",
      message: "حداقل یک خط کانفیگ وارد کنید.",
    };
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
    select: {
      id: true,
    },
  });

  if (!plan) {
    return {
      status: "error",
      message: "پلن انتخاب‌شده دیگر وجود ندارد.",
    };
  }

  await prisma.account.createMany({
    data: configs.map((config) => ({
      config,
      planId,
      status: "available",
    })),
  });

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    status: "success",
    message: `${configs.length} اکانت با موفقیت اضافه شد.`,
  };
}

export async function reviewPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();

  if (!paymentId || !decision) {
    return {
      status: "error",
      message: "شناسه پرداخت و تصمیم ادمین الزامی است.",
    };
  }

  if (decision !== "approve" && decision !== "reject") {
    return {
      status: "error",
      message: "تصمیم انتخاب‌شده معتبر نیست.",
    };
  }

  try {
    await reviewPayment({
      paymentId,
      decision,
      source: "ADMIN_PANEL",
      reviewNote: reviewNote || undefined,
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: decision === "approve" ? "پرداخت تایید شد." : "پرداخت رد شد.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "بررسی پرداخت با خطا مواجه شد.",
    };
  }
}
