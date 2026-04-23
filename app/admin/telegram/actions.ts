"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import {
  fetchTelegramWebhookInfo,
  getTelegramWebhookSecretNormalized,
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

export async function setWebhookFromAdminAction(formData: FormData) {
  await requireAdmin();
  void formData;

  const origin = getRequestOrigin();
  if (!origin) {
    throw new Error("آدرس سایت از روی درخواست مشخص نشد.");
  }

  const webhookUrl = `${origin}/api/telegram/review`;
  const secret = getTelegramWebhookSecretNormalized() ?? null;

  const result = await setTelegramWebhook({
    webhookUrl,
    secretToken: secret,
    allowedUpdates: ["callback_query", "message"],
  });

  revalidatePath("/admin/telegram");

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function refreshWebhookInfoAction() {
  await requireAdmin();
  const info = await fetchTelegramWebhookInfo();
  return { status: "success" as const, info };
}

