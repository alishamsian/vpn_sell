"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

import { requireUser } from "@/lib/auth";
import { createOrderForUser, submitPaymentReceipt } from "@/lib/orders";

export type PaymentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type RenewActionState = {
  status: "idle" | "success" | "error";
  message: string;
  redirectTo?: string;
};

export async function submitPaymentAction(
  orderId: string,
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const user = await requireUser();
    const amount = String(formData.get("amount") ?? "").trim();
    const trackingCode = String(formData.get("trackingCode") ?? "").trim();
    const cardLast4 = String(formData.get("cardLast4") ?? "").trim();
    const receiptFile = formData.get("receipt") as File | null;

    if (!amount || !trackingCode || !cardLast4 || !receiptFile) {
      return {
        status: "error",
        message: "همه فیلدهای فرم پرداخت را کامل کنید.",
      };
    }

    await submitPaymentReceipt({
      orderId,
      userId: user.id,
      amount,
      trackingCode,
      cardLast4,
      receiptFile,
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/admin");

    return {
      status: "success",
      message: "رسید با موفقیت ثبت شد و برای بررسی ارسال شد.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "ثبت رسید با خطا مواجه شد.",
    };
  }
}

export async function renewPlanAction(
  orderId: string,
  previousState: RenewActionState,
): Promise<RenewActionState> {
  try {
    void previousState;
    const user = await requireUser();
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      select: {
        planId: true,
      },
    });

    if (!order) {
      return {
        status: "error",
        message: "سفارش موردنظر پیدا نشد.",
      };
    }

    const newOrder = await createOrderForUser({
      userId: user.id,
      planId: order.planId,
    });

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "سفارش تمدید ساخته شد.",
      redirectTo: `/dashboard/orders/${newOrder.id}`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "ایجاد سفارش تمدید با خطا مواجه شد.",
    };
  }
}
