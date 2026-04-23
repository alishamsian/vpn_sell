import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { answerTelegramCallbackSafe, sendAdminPlainTextMessage } from "@/lib/telegram";
import { inventoryCallbackData } from "@/lib/telegram-inventory-bot";

const TG_RULE = "────────────";
const WIZARD_TTL_MS = 30 * 60 * 1000;

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
}

function actorFromMessage(fromId: number | undefined): string | null {
  if (fromId == null) {
    return null;
  }
  return String(fromId);
}

function normalizeAsciiNumber(raw: string): number | null {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  let s = raw.trim().replace(/[,،]/g, "").replace(/\s+/g, "");
  for (let i = 0; i < 10; i++) {
    s = s.split(fa[i]).join(String(i));
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type PlanPayload = {
  name?: string;
  price?: number;
  durationDays?: number;
  maxUsers?: number | null;
  field?: "name" | "price" | "durationDays" | "maxUsers";
};

function readPayload(raw: unknown): PlanPayload {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as PlanPayload;
}

export async function clearPlanWizard(actorTelegramId: string) {
  await prisma.telegramPlanWizardState.deleteMany({
    where: { actorTelegramId },
  });
}

export async function startPlanCreateWizard(actorTelegramId: string) {
  await prisma.telegramPlanWizardState.upsert({
    where: { actorTelegramId },
    create: {
      actorTelegramId,
      phase: "create_name",
      planId: null,
      payload: {},
    },
    update: {
      phase: "create_name",
      planId: null,
      payload: {},
    },
  });

  await sendAdminPlainTextMessage(
    [
      "➕ ساخت پلن جدید",
      TG_RULE,
      "۱) نام پلن را بفرستید (فقط یک خط متن، بدون /).",
      "۲) بعد قیمت به تومان، مدت روز، و در پایان حداکثر کاربر (یا بفرستید: خالی)",
      "",
      "لغو: /plancancel",
    ].join("\n"),
  );
}

function planCallbackData(op: string, planId: string) {
  return `P|${op}|${planId}`;
}

async function sendPlanEditMenu(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    await sendAdminPlainTextMessage("پلن پیدا نشد.");
    return;
  }

  const price = new Intl.NumberFormat("fa-IR").format(Number(plan.price));
  const maxLabel = plan.maxUsers == null ? "نامحدود" : String(plan.maxUsers);

  const text = [
    "✏️ مدیریت پلن",
    TG_RULE,
    `نام: ${plan.name}`,
    `قیمت: ${price} تومان`,
    `مدت: ${plan.durationDays} روز`,
    `حداکثر کاربر: ${maxLabel}`,
    `شناسه: ${plan.id}`,
    "",
    "یکی از دکمه‌ها را بزنید:",
  ].join("\n");

  const mk = (op: string, label: string) => ({
    text: label,
    callback_data: planCallbackData(op, planId),
  });

  await sendAdminPlainTextMessage(text, {
    reply_markup: {
      inline_keyboard: [
        [mk("name", "نام"), mk("price", "قیمت")],
        [mk("dur", "مدت روز"), mk("max", "حداکثر کاربر")],
        [mk("dup", "📋 کپی پلن"), mk("del", "🗑 حذف")],
        [{ text: "📥 افزودن موجودی (همین پلن)", callback_data: inventoryCallbackData("open", planId) }],
      ],
    },
  });
}

export async function sendPlanListMessage() {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { orders: true, accounts: true },
      },
    },
  });

  if (plans.length === 0) {
    await sendAdminPlainTextMessage(
      ["📦 لیست پلن‌ها", TG_RULE, "هنوز پلنی ثبت نشده است.", "", "ساخت: /plannew", "موجودی: /stockadd"].join("\n"),
    );
    return;
  }

  const nf = new Intl.NumberFormat("fa-IR");
  const lines = plans.map((p, i) => {
    const price = nf.format(Number(p.price));
    return `${nf.format(i + 1)}) ${p.name}\n   قیمت: ${price} تومان · ${p.durationDays} روز · سفارش: ${nf.format(p._count.orders)} · اکانت: ${nf.format(p._count.accounts)}\n   id: ${p.id}`;
  });

  const rows = plans.map((p) => [
    {
      text: `✏️ ${p.name.length > 28 ? `${p.name.slice(0, 26)}…` : p.name}`,
      callback_data: planCallbackData("menu", p.id),
    },
  ]);

  await sendAdminPlainTextMessage(
    ["📦 پلن‌های فعال", TG_RULE, ...lines, "", "موجودی: /stockadd یا دکمهٔ «افزودن موجودی»"].join("\n\n"),
    {
      reply_markup: { inline_keyboard: rows },
    },
  );
}

function assertWizardFresh(state: { updatedAt: Date }) {
  if (Date.now() - state.updatedAt.getTime() > WIZARD_TTL_MS) {
    throw new Error("expired");
  }
}

export async function handleTelegramPlanWizardText(params: {
  actorTelegramId: string;
  text: string;
}): Promise<boolean> {
  const { actorTelegramId, text } = params;
  const state = await prisma.telegramPlanWizardState.findUnique({
    where: { actorTelegramId },
  });

  if (!state || state.phase === "idle") {
    return false;
  }

  try {
    await assertWizardFresh(state);
  } catch {
    await clearPlanWizard(actorTelegramId);
    await sendAdminPlainTextMessage("جلسهٔ ساخت/ویرایش پلن منقضی شد. دوباره /plannew را بزنید.");
    return true;
  }

  const payload = readPayload(state.payload);

  if (state.phase === "create_name") {
    const name = text.trim();
    if (!name || name.length > 200) {
      await sendAdminPlainTextMessage("نام نامعتبر است (۱ تا ۲۰۰ نویسه). دوباره بفرستید.");
      return true;
    }
    await prisma.telegramPlanWizardState.update({
      where: { actorTelegramId },
      data: {
        phase: "create_price",
        payload: { ...payload, name } as Prisma.InputJsonValue,
      },
    });
    await sendAdminPlainTextMessage("قیمت را به تومان (فقط عدد) بفرستید، مثلاً ۱۵۰۰۰۰");
    return true;
  }

  if (state.phase === "create_price") {
    const price = normalizeAsciiNumber(text);
    if (price == null || price <= 0 || !Number.isFinite(price)) {
      await sendAdminPlainTextMessage("قیمت نامعتبر است. یک عدد مثبت بفرستید.");
      return true;
    }
    await prisma.telegramPlanWizardState.update({
      where: { actorTelegramId },
      data: {
        phase: "create_duration",
        payload: { ...payload, price } as Prisma.InputJsonValue,
      },
    });
    await sendAdminPlainTextMessage("مدت اشتراک را به روز (عدد صحیح مثبت) بفرستید، مثلاً ۳۰");
    return true;
  }

  if (state.phase === "create_duration") {
    const durationDays = Math.round(normalizeAsciiNumber(text) ?? NaN);
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      await sendAdminPlainTextMessage("مدت نامعتبر است. عدد صحیح مثبت (روز) بفرستید.");
      return true;
    }
    await prisma.telegramPlanWizardState.update({
      where: { actorTelegramId },
      data: {
        phase: "create_max",
        payload: { ...payload, durationDays } as Prisma.InputJsonValue,
      },
    });
    await sendAdminPlainTextMessage(
      "حداکثر کاربر همزمان را بفرستید (عدد صحیح مثبت). برای نامحدود بفرستید: خالی",
    );
    return true;
  }

  if (state.phase === "create_max") {
    const t = text.trim().toLowerCase();
    let maxUsers: number | null;
    if (t === "خالی" || t === "-" || t === "null" || t === "نامحدود") {
      maxUsers = null;
    } else {
      const n = Math.round(normalizeAsciiNumber(text) ?? NaN);
      if (!Number.isInteger(n) || n <= 0) {
        await sendAdminPlainTextMessage("عدد نامعتبر است یا بفرستید: خالی");
        return true;
      }
      maxUsers = n;
    }

    const st2 = await prisma.telegramPlanWizardState.findUnique({
      where: { actorTelegramId },
    });
    const p = readPayload(st2?.payload);

    if (!p.name || p.price == null || p.durationDays == null) {
      await clearPlanWizard(actorTelegramId);
      await sendAdminPlainTextMessage("دادهٔ پلن ناقص بود؛ از اول /plannew را بزنید.");
      return true;
    }

    await prisma.plan.create({
      data: {
        name: p.name,
        price: new Prisma.Decimal(Math.round(p.price)),
        durationDays: p.durationDays,
        maxUsers,
      },
    });

    await clearPlanWizard(actorTelegramId);
    revalidateCatalog();
    await sendAdminPlainTextMessage(
      [
        "✅ پلن ساخته شد",
        TG_RULE,
        `نام: ${p.name}`,
        `قیمت: ${new Intl.NumberFormat("fa-IR").format(p.price)} تومان`,
        `مدت: ${p.durationDays} روز`,
        `حداکثر کاربر: ${maxUsers == null ? "نامحدود" : String(maxUsers)}`,
      ].join("\n"),
    );
    return true;
  }

  if (state.phase === "edit_value" && state.planId && payload.field) {
    const planId = state.planId;
    const field = payload.field;

    if (field === "name") {
      const name = text.trim();
      if (!name || name.length > 200) {
        await sendAdminPlainTextMessage("نام نامعتبر است.");
        return true;
      }
      await prisma.plan.update({ where: { id: planId }, data: { name } });
    } else if (field === "price") {
      const price = normalizeAsciiNumber(text);
      if (price == null || price <= 0) {
        await sendAdminPlainTextMessage("قیمت نامعتبر است.");
        return true;
      }
      await prisma.plan.update({
        where: { id: planId },
        data: { price: new Prisma.Decimal(Math.round(price)) },
      });
    } else if (field === "durationDays") {
      const durationDays = Math.round(normalizeAsciiNumber(text) ?? NaN);
      if (!Number.isInteger(durationDays) || durationDays <= 0) {
        await sendAdminPlainTextMessage("مدت نامعتبر است.");
        return true;
      }
      await prisma.plan.update({ where: { id: planId }, data: { durationDays } });
    } else if (field === "maxUsers") {
      const t = text.trim().toLowerCase();
      const maxUsers =
        t === "خالی" || t === "-" || t === "null" || t === "نامحدود" ? null : Math.round(normalizeAsciiNumber(text) ?? NaN);
      if (maxUsers !== null && (!Number.isInteger(maxUsers) || maxUsers <= 0)) {
        await sendAdminPlainTextMessage("عدد نامعتبر است یا بفرستید: خالی");
        return true;
      }
      await prisma.plan.update({ where: { id: planId }, data: { maxUsers } });
    }

    await clearPlanWizard(actorTelegramId);
    revalidateCatalog();
    await sendAdminPlainTextMessage("✅ پلن به‌روز شد.");
    return true;
  }

  return false;
}

function parsePlanCallback(data: string): { op: string; planId: string } | null {
  const parts = data.split("|");
  if (parts[0] !== "P" || parts.length !== 3) {
    return null;
  }
  return { op: parts[1], planId: parts[2] };
}

export async function tryHandleTelegramPlanCallback(params: {
  callbackQueryId: string;
  data: string;
  actorTelegramId: string;
}): Promise<boolean> {
  const parsed = parsePlanCallback(params.data);
  if (!parsed) {
    return false;
  }

  const { op, planId } = parsed;
  const actor = params.actorTelegramId;

  if (op === "menu") {
    await answerTelegramCallbackSafe(params.callbackQueryId, "منوی ویرایش");
    await sendPlanEditMenu(planId);
    return true;
  }

  if (op === "dup") {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      await answerTelegramCallbackSafe(params.callbackQueryId, "پلن نیست.", { showAlert: true });
      return true;
    }
    const baseName = `${plan.name} (کپی)`;
    const name = baseName.length > 120 ? `${baseName.slice(0, 117)}…` : baseName;
    await prisma.plan.create({
      data: {
        name,
        price: plan.price,
        durationDays: plan.durationDays,
        maxUsers: plan.maxUsers,
      },
    });
    revalidateCatalog();
    await answerTelegramCallbackSafe(params.callbackQueryId, "کپی شد.");
    await sendAdminPlainTextMessage(`پلن «${plan.name}» کپی شد.`);
    return true;
  }

  if (op === "del") {
    const ordersCount = await prisma.order.count({ where: { planId } });
    if (ordersCount > 0) {
      await answerTelegramCallbackSafe(
        params.callbackQueryId,
        "این پلن سفارش دارد و حذف نمی‌شود.",
        { showAlert: true },
      );
      return true;
    }
    await answerTelegramCallbackSafe(params.callbackQueryId, "تأیید حذف");
    await sendAdminPlainTextMessage(
      ["🗑 حذف پلن", TG_RULE, `شناسه: ${planId}`, "", "برای حذف قطعی دکمهٔ زیر را بزنید."].join("\n"),
      {
        reply_markup: {
          inline_keyboard: [[{ text: "✅ تأیید حذف", callback_data: planCallbackData("dely", planId) }]],
        },
      },
    );
    return true;
  }

  if (op === "dely") {
    const ordersCount = await prisma.order.count({ where: { planId } });
    if (ordersCount > 0) {
      await answerTelegramCallbackSafe(params.callbackQueryId, "سفارش دارد.", { showAlert: true });
      return true;
    }
    await prisma.plan.delete({ where: { id: planId } });
    await clearPlanWizard(actor);
    revalidateCatalog();
    await answerTelegramCallbackSafe(params.callbackQueryId, "حذف شد.");
    await sendAdminPlainTextMessage("پلن حذف شد.");
    return true;
  }

  const fieldMap: Record<string, "name" | "price" | "durationDays" | "maxUsers"> = {
    name: "name",
    price: "price",
    dur: "durationDays",
    max: "maxUsers",
  };

  const field = fieldMap[op];
  if (!field || !planId) {
    await answerTelegramCallbackSafe(params.callbackQueryId, "دکمه نامعتبر.", { showAlert: true });
    return true;
  }

  const hint =
    field === "name"
      ? "نام جدید را بفرستید."
      : field === "price"
        ? "قیمت جدید به تومان (عدد) را بفرستید."
        : field === "durationDays"
          ? "مدت جدید به روز (عدد صحیح) را بفرستید."
          : "حداکثر کاربر (عدد) یا بفرستید: خالی";

  await prisma.telegramPlanWizardState.upsert({
    where: { actorTelegramId: actor },
    create: {
      actorTelegramId: actor,
      phase: "edit_value",
      planId,
      payload: { field } as Prisma.InputJsonValue,
    },
    update: {
      phase: "edit_value",
      planId,
      payload: { field } as Prisma.InputJsonValue,
    },
  });

  await answerTelegramCallbackSafe(params.callbackQueryId, "منتظر متن شما");
  await sendAdminPlainTextMessage(["✏️ ویرایش پلن", TG_RULE, hint, "", "لغو: /plancancel"].join("\n"));
  return true;
}

export { actorFromMessage };
