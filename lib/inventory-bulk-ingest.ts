import { AccountStatus } from "@prisma/client";

import { ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE, ADMIN_BULK_ACCOUNT_MAX_LINES } from "@/lib/admin-inventory-limits";
import { fulfillWaitingOrdersForPlan } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BulkIngestAccountsResult =
  | {
      ok: true;
      created: number;
      duplicateInBatch: number;
      duplicateInDb: number;
      fulfilledWaitingOrders: number;
    }
  | { ok: false; message: string };

const nf = (n: number) => n.toLocaleString("fa-IR");

export function formatBulkIngestSuccess(r: Extract<BulkIngestAccountsResult, { ok: true }>): string {
  const parts: string[] = [`${nf(r.created)} اکانت به موجودی اضافه شد.`];
  if (r.duplicateInBatch > 0) {
    parts.push(`${nf(r.duplicateInBatch)} خط تکراری در همان ارسال نادیده گرفته شد.`);
  }
  if (r.duplicateInDb > 0) {
    parts.push(`${nf(r.duplicateInDb)} مورد از قبل در دیتابیس این پلن بود و رد شد.`);
  }
  if (r.fulfilledWaitingOrders > 0) {
    parts.push(`${nf(r.fulfilledWaitingOrders)} سفارش «منتظر اکانت» خودکار تحویل شد.`);
  }
  return parts.join(" ");
}

/**
 * افزودن گروهی اکانت به یک پلن (بدون چک session ادمین — فقط برای استفادهٔ داخلی پس از احراز دسترسی).
 */
export async function bulkIngestAccountsForPlan(planId: string, rawText: string): Promise<BulkIngestAccountsResult> {
  const configs = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!planId) {
    return { ok: false, message: "شناسهٔ پلن نامعتبر است." };
  }

  if (configs.length === 0) {
    return { ok: false, message: "حداقل یک خط کانفیگ معتبر لازم است." };
  }

  if (configs.length > ADMIN_BULK_ACCOUNT_MAX_LINES) {
    return {
      ok: false,
      message: `حداکثر ${nf(ADMIN_BULK_ACCOUNT_MAX_LINES)} خط در هر بار ارسال مجاز است.`,
    };
  }

  const tooLong = configs.find((line) => line.length > ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE);
  if (tooLong) {
    return {
      ok: false,
      message: `حداکثر طول هر کانفیگ ${nf(ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE)} نویسه است.`,
    };
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true },
  });

  if (!plan) {
    return { ok: false, message: "پلن پیدا نشد." };
  }

  const seenInBatch = new Set<string>();
  const uniqueOrdered: string[] = [];
  for (const line of configs) {
    if (seenInBatch.has(line)) {
      continue;
    }
    seenInBatch.add(line);
    uniqueOrdered.push(line);
  }
  const duplicateInBatch = configs.length - uniqueOrdered.length;

  const existing = new Set<string>();
  const chunkSize = 400;
  for (let i = 0; i < uniqueOrdered.length; i += chunkSize) {
    const chunk = uniqueOrdered.slice(i, i + chunkSize);
    const rows = await prisma.account.findMany({
      where: { planId, config: { in: chunk } },
      select: { config: true },
    });
    for (const row of rows) {
      existing.add(row.config);
    }
  }

  const toCreate = uniqueOrdered.filter((config) => !existing.has(config));
  const duplicateInDb = uniqueOrdered.length - toCreate.length;

  if (toCreate.length === 0) {
    const parts: string[] = [];
    if (duplicateInBatch > 0) {
      parts.push(`${duplicateInBatch} خط تکراری در همان متن بود.`);
    }
    if (duplicateInDb > 0) {
      parts.push(`${duplicateInDb} مورد از قبل برای همین پلن ثبت شده بود.`);
    }
    return {
      ok: false,
      message:
        parts.length > 0
          ? `هیچ اکانت جدیدی اضافه نشد. ${parts.join(" ")}`
          : "هیچ خط جدیدی برای افزودن وجود نداشت.",
    };
  }

  await prisma.account.createMany({
    data: toCreate.map((config) => ({
      config,
      planId,
      status: AccountStatus.available,
    })),
  });

  const fulfilledWaitingOrders = await fulfillWaitingOrdersForPlan(planId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");

  return {
    ok: true,
    created: toCreate.length,
    duplicateInBatch,
    duplicateInDb,
    fulfilledWaitingOrders,
  };
}
