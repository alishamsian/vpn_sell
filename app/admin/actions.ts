"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createPlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
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
