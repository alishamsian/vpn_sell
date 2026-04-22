"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

import { requireUser } from "@/lib/auth";
import { createOrderForUser, payOrderWithWallet, repricePendingOrder, submitPaymentReceipt } from "@/lib/orders";
import { submitWalletTopUpReceipt } from "@/lib/wallet-topups";

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

export async function payWithWalletAction(
  orderId: string,
  previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    void previousState;
    void formData;
    const user = await requireUser();
    await payOrderWithWallet({ orderId, userId: user.id });
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath("/admin");
    return { status: "success", message: "پرداخت با کیف‌پول انجام شد." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "پرداخت با کیف‌پول ناموفق بود." };
  }
}

export async function applyPricingOptionsAction(
  orderId: string,
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const user = await requireUser();
    const couponCode = String(formData.get("couponCode") ?? "").trim();
    const giftCardCode = String(formData.get("giftCardCode") ?? "").trim();
    const useWallet = String(formData.get("useWallet") ?? "") === "on";

    await repricePendingOrder({
      orderId,
      userId: user.id,
      couponCode: couponCode || null,
      giftCardCode: giftCardCode || null,
      useWallet,
    });

    revalidatePath(`/dashboard/orders/${orderId}`);
    return { status: "success", message: "مبلغ سفارش به‌روزرسانی شد." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "اعمال گزینه‌ها ناموفق بود.",
    };
  }
}

export async function submitWalletTopUpAction(
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
      return { status: "error", message: "همه فیلدهای فرم شارژ را کامل کنید." };
    }

    await submitWalletTopUpReceipt({
      userId: user.id,
      amount,
      trackingCode,
      cardLast4,
      receiptFile,
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { status: "success", message: "درخواست شارژ ثبت شد و پس از تایید ادمین به کیف‌پول اضافه می‌شود." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "ثبت شارژ ناموفق بود." };
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
