"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { fulfillWaitingOrdersForPlan, reviewPayment } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export type AdminActionState = {
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
  const durationValue = String(formData.get("durationDays") ?? "").trim();
  const maxUsersRaw = String(formData.get("maxUsers") ?? "").trim();
  const price = Number(priceValue);
  const durationDays = Number(durationValue);

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

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return {
      status: "error",
      message: "مدت اشتراک باید یک عدد صحیح مثبت باشد.",
    };
  }

  let maxUsers: number | null = null;

  if (maxUsersRaw) {
    const parsedMaxUsers = Number(maxUsersRaw);

    if (!Number.isInteger(parsedMaxUsers) || parsedMaxUsers <= 0) {
      return {
        status: "error",
        message: "حداکثر کاربر باید یک عدد صحیح مثبت باشد یا خالی بماند.",
      };
    }

    maxUsers = parsedMaxUsers;
  }

  await prisma.plan.create({
    data: {
      name,
      price: new Prisma.Decimal(Math.round(price)),
      durationDays,
      maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

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

  const fulfilledWaitingOrders = await fulfillWaitingOrdersForPlan(planId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message:
      fulfilledWaitingOrders > 0
        ? `${configs.length} اکانت اضافه شد و ${fulfilledWaitingOrders} سفارش منتظر، خودکار تحویل شد.`
        : `${configs.length} اکانت با موفقیت اضافه شد.`,
  };
}

export async function updatePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceValue = String(formData.get("price") ?? "").trim();
  const durationValue = String(formData.get("durationDays") ?? "").trim();
  const maxUsersRaw = String(formData.get("maxUsers") ?? "").trim();
  const price = Number(priceValue);
  const durationDays = Number(durationValue);

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

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

  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return {
      status: "error",
      message: "مدت اشتراک باید یک عدد صحیح مثبت باشد.",
    };
  }

  let maxUsers: number | null = null;

  if (maxUsersRaw) {
    const parsedMaxUsers = Number(maxUsersRaw);

    if (!Number.isInteger(parsedMaxUsers) || parsedMaxUsers <= 0) {
      return {
        status: "error",
        message: "حداکثر کاربر باید یک عدد صحیح مثبت باشد یا خالی بماند.",
      };
    }

    maxUsers = parsedMaxUsers;
  }

  await prisma.plan.update({
    where: {
      id: planId,
    },
    data: {
      name,
      price: new Prisma.Decimal(Math.round(price)),
      durationDays,
      maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "پلن با موفقیت به‌روزرسانی شد.",
  };
}

export async function duplicatePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!plan) {
    return {
      status: "error",
      message: "پلن موردنظر پیدا نشد.",
    };
  }

  const baseName = `${plan.name} (کپی)`;
  const name = baseName.length > 120 ? `${baseName.slice(0, 117)}...` : baseName;

  await prisma.plan.create({
    data: {
      name,
      price: plan.price,
      durationDays: plan.durationDays,
      maxUsers: plan.maxUsers,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "کپی پلن با موفقیت ساخته شد.",
  };
}

export async function deletePlanAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const planId = String(formData.get("planId") ?? "").trim();
  const confirmDelete = String(formData.get("confirmDelete") ?? "");

  if (!planId) {
    return {
      status: "error",
      message: "شناسه پلن معتبر نیست.",
    };
  }

  if (confirmDelete !== "on") {
    return {
      status: "error",
      message: "برای حذف باید تایید را فعال کنید.",
    };
  }

  const ordersCount = await prisma.order.count({
    where: {
      planId,
    },
  });

  if (ordersCount > 0) {
    return {
      status: "error",
      message: "این پلن سفارش ثبت‌شده دارد و برای حفظ سوابق قابل حذف نیست.",
    };
  }

  await prisma.plan.delete({
    where: {
      id: planId,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");

  return {
    status: "success",
    message: "پلن حذف شد.",
  };
}

export async function reviewPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

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
    const result = await reviewPayment({
      paymentId,
      decision,
      source: "ADMIN_PANEL",
      reviewNote: reviewNote || undefined,
      actorId: admin.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/catalog");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message:
        decision === "approve"
          ? result.order.status === "WAITING_FOR_ACCOUNT"
            ? "پرداخت تایید شد و سفارش در انتظار تخصیص اکانت قرار گرفت."
            : "پرداخت تایید شد و اکانت تحویل گردید."
          : "پرداخت رد شد.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "بررسی پرداخت با خطا مواجه شد.",
    };
  }
}
