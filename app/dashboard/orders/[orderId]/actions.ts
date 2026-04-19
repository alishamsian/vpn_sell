"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { submitPaymentReceipt } from "@/lib/orders";

export type PaymentActionState = {
  status: "idle" | "success" | "error";
  message: string;
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
