"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import {
  fetchTelegramWebhookInfo,
  getTelegramWebhookSecretNormalized,
  isTelegramConfigured,
  setTelegramWebhook,
} from "@/lib/telegram";

function getRequestOrigin() {
  const h = headers();
  // Next 16 headers() is async in some runtimes; support both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHeader = (name: string) => (h as any).get?.(name) as string | null | undefined;
  const proto = getHeader("x-forwarded-proto") ?? "https";
  const host = getHeader("x-forwarded-host") ?? getHeader("host") ?? "";
  if (!host) {
    return "";
  }
  return `${proto}://${host}`;
}

export async function setWebhookFromAdminAction(
  _prevState: unknown,
  formData: FormData,
) {
  await requireAdmin();
  void formData;

  if (!isTelegramConfigured()) {
    return {
      status: "error" as const,
      message: "تلگرام تنظیم نشده است (TELEGRAM_BOT_TOKEN یا TELEGRAM_ADMIN_CHAT_ID خالی است).",
    };
  }

  const origin = getRequestOrigin();
  if (!origin) {
    return { status: "error" as const, message: "آدرس سایت از روی درخواست مشخص نشد." };
  }

  const webhookUrl = `${origin}/api/telegram/review`;
  const secret = getTelegramWebhookSecretNormalized() ?? null;

  const before = await fetchTelegramWebhookInfo();
  const result = await setTelegramWebhook({
    webhookUrl,
    secretToken: secret,
    allowedUpdates: ["callback_query", "message"],
  });
  const after = await fetchTelegramWebhookInfo();

  revalidatePath("/admin/telegram");

  if (!result.ok) {
    return {
      status: "error" as const,
      message: result.error,
      debug: { webhookUrl, before, after },
    };
  }

  return {
    status: "success" as const,
    message: "وب‌هوک تلگرام تنظیم شد.",
    debug: { webhookUrl, before, after },
  };
}

export async function refreshWebhookInfoAction() {
  await requireAdmin();
  const info = await fetchTelegramWebhookInfo();
  return { status: "success" as const, info };
}

