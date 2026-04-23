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

async function getRequestOrigin() {
  // Prefer Vercel-provided production hostname to avoid localhost misconfig.
  // (Server Actions may not always expose forwarded headers.)
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) {
    return `https://${prod.replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  const maybe = headers();
  // Next 16: headers() might be async depending on runtime typing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = (await (maybe as any)) as any;
  const getHeader = (name: string) => (h?.get?.(name) as string | null | undefined) ?? null;
  const proto = getHeader("x-forwarded-proto") ?? "https";
  const host = getHeader("x-forwarded-host") ?? getHeader("host") ?? "";
  if (host) {
    return `${proto}://${host}`;
  }

  // Last resort: NEXT_PUBLIC_APP_URL (but this might be localhost in prod if misconfigured)
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  return "";
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

  const origin = await getRequestOrigin();
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

