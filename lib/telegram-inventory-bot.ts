import { AccountStatus } from "@prisma/client";

import {
  ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE,
  ADMIN_BULK_ACCOUNT_MAX_LINES,
} from "@/lib/admin-inventory-limits";
import { bulkIngestAccountsForPlan, formatBulkIngestSuccess } from "@/lib/inventory-bulk-ingest";
import { prisma } from "@/lib/prisma";
import { answerTelegramCallbackSafe, sendAdminPlainTextMessage } from "@/lib/telegram";
import { clearAllTelegramWizards } from "@/lib/telegram-wizards";

const TG_RULE = "────────────";
const WIZARD_TTL_MS = 30 * 60 * 1000;
const MAX_BUFFER_CHARS = 500_000;

export function inventoryCallbackData(op: string, planId: string) {
  return `I|${op}|${planId}`;
}

export async function clearInventoryWizard(actorTelegramId: string) {
  await prisma.telegramInventoryWizardState.deleteMany({
    where: { actorTelegramId },
  });
}

function assertWizardFresh(state: { updatedAt: Date }) {
  if (Date.now() - state.updatedAt.getTime() > WIZARD_TTL_MS) {
    throw new Error("expired");
  }
}

function splitTelegramChunks(text: string, maxLen = 3800): string[] {
  if (text.length <= maxLen) {
    return [text];
  }
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf("\n", maxLen);
    if (cut < maxLen / 2) {
      cut = maxLen;
    }
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return chunks.filter(Boolean);
}

async function sendLongAdminText(text: string) {
  for (const part of splitTelegramChunks(text)) {
    await sendAdminPlainTextMessage(part);
  }
}

async function availableCountsByPlan(): Promise<Map<string, number>> {
  const rows = await prisma.account.groupBy({
    by: ["planId"],
    where: { status: AccountStatus.available },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.planId, row._count._all);
  }
  return map;
}

export async function startStockAddWizard(actorTelegramId: string) {
  await clearAllTelegramWizards(actorTelegramId);
  await prisma.telegramInventoryWizardState.upsert({
    where: { actorTelegramId },
    create: {
      actorTelegramId,
      phase: "pick_plan",
      planId: null,
      buffer: "",
    },
    update: {
      phase: "pick_plan",
      planId: null,
      buffer: "",
    },
  });
  await sendStockPlanPickerMessage();
}

export async function sendStockPlanPickerMessage() {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "asc" },
  });
  const counts = await availableCountsByPlan();

  if (plans.length === 0) {
    await sendAdminPlainTextMessage(
      ["📥 افزودن موجودی", TG_RULE, "پلنی برای انتخاب وجود ندارد. اول /plannew را بزنید."].join("\n"),
    );
    return;
  }

  const nf = new Intl.NumberFormat("fa-IR");
  const lines = plans.map((p, i) => {
    const n = counts.get(p.id) ?? 0;
    return `${nf.format(i + 1)}) ${p.name}\n   موجودی آماده: ${nf.format(n)} · id: ${p.id}`;
  });

  const rows = plans.map((p) => [
    {
      text: `📦 ${p.name.length > 26 ? `${p.name.slice(0, 24)}…` : p.name}`,
      callback_data: inventoryCallbackData("p", p.id),
    },
  ]);

  await sendAdminPlainTextMessage(
    [
      "📥 افزودن موجودی اکانت",
      TG_RULE,
      "پلن را با یکی از دکمه‌ها انتخاب کنید؛ سپس کانفیگ‌ها را بفرستید.",
      "",
      "• هر پیام می‌تواند چند خط باشد (هر خط یک کانفیگ).",
      "• می‌توانید چند پیام پشت‌سر هم بفرستید تا بافر پر شود.",
      `• حداکثر ${nf.format(ADMIN_BULK_ACCOUNT_MAX_LINES)} خط و ${nf.format(ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE)} نویسه به‌ازای هر خط.`,
      "• ثبت نهایی: /stockdone",
      "• لغو: /stockcancel",
      "",
      ...lines,
    ].join("\n\n"),
    { reply_markup: { inline_keyboard: rows } },
  );
}

function parseInventoryCallback(data: string): { op: string; planId: string } | null {
  const parts = data.split("|");
  if (parts[0] !== "I" || parts.length !== 3) {
    return null;
  }
  return { op: parts[1], planId: parts[2] };
}

async function enterPastePhase(actorTelegramId: string, planId: string) {
  await clearAllTelegramWizards(actorTelegramId);

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, name: true },
  });
  if (!plan) {
    await sendAdminPlainTextMessage("پلن پیدا نشد. دوباره /stockadd را بزنید.");
    await clearInventoryWizard(actorTelegramId);
    return;
  }

  const available = await prisma.account.count({
    where: { planId, status: AccountStatus.available },
  });
  const nf = new Intl.NumberFormat("fa-IR");

  await prisma.telegramInventoryWizardState.upsert({
    where: { actorTelegramId },
    create: {
      actorTelegramId,
      phase: "paste_configs",
      planId,
      buffer: "",
    },
    update: {
      phase: "paste_configs",
      planId,
      buffer: "",
    },
  });

  await sendAdminPlainTextMessage(
    [
      "✅ پلن انتخاب شد",
      TG_RULE,
      `نام: ${plan.name}`,
      `شناسه: ${plan.id}`,
      `موجودی آمادهٔ فعلی: ${nf.format(available)}`,
      "",
      "حالا کانفیگ‌ها را بفرستید (هر خط یک اکانت). می‌توانید چند پیام بفرستید.",
      "",
      "ثبت در دیتابیس: /stockdone",
      "لغو: /stockcancel",
    ].join("\n"),
  );
}

export async function tryHandleTelegramInventoryCallback(params: {
  callbackQueryId: string;
  data: string;
  actorTelegramId: string;
}): Promise<boolean> {
  const parsed = parseInventoryCallback(params.data);
  if (!parsed) {
    return false;
  }

  const { op, planId } = parsed;
  if (op !== "p" && op !== "open") {
    await answerTelegramCallbackSafe(params.callbackQueryId, "دکمه نامعتبر.", { showAlert: true });
    return true;
  }

  if (!planId) {
    await answerTelegramCallbackSafe(params.callbackQueryId, "شناسه نامعتبر.", { showAlert: true });
    return true;
  }

  await answerTelegramCallbackSafe(params.callbackQueryId, "پلن انتخاب شد.");
  await enterPastePhase(params.actorTelegramId, planId);
  return true;
}

export async function handleTelegramInventoryWizardText(params: {
  actorTelegramId: string;
  text: string;
}): Promise<boolean> {
  const { actorTelegramId, text } = params;
  const state = await prisma.telegramInventoryWizardState.findUnique({
    where: { actorTelegramId },
  });

  if (!state || state.phase === "idle") {
    return false;
  }

  try {
    assertWizardFresh(state);
  } catch {
    await clearInventoryWizard(actorTelegramId);
    await sendAdminPlainTextMessage("جلسهٔ افزودن موجودی منقضی شد. دوباره /stockadd را بزنید.");
    return true;
  }

  if (state.phase === "pick_plan") {
    await sendAdminPlainTextMessage("لطفاً پلن را با دکمهٔ زیر پیام قبلی انتخاب کنید (یا /stockcancel).");
    return true;
  }

  if (state.phase !== "paste_configs" || !state.planId) {
    return false;
  }

  const addition = text.trim();
  if (!addition) {
    await sendAdminPlainTextMessage("متن خالی بود؛ یک کانفیگ یا چند خط بفرستید.");
    return true;
  }

  const nextBuffer = state.buffer ? `${state.buffer}\n${addition}` : addition;
  if (nextBuffer.length > MAX_BUFFER_CHARS) {
    await sendAdminPlainTextMessage(
      "بافر از حد مجاز طولانی شد. با /stockdone همین را ثبت کنید یا /stockcancel لغو کنید.",
    );
    return true;
  }

  const lineCount = nextBuffer
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
  if (lineCount > ADMIN_BULK_ACCOUNT_MAX_LINES) {
    await sendAdminPlainTextMessage(
      `بیش از ${new Intl.NumberFormat("fa-IR").format(ADMIN_BULK_ACCOUNT_MAX_LINES)} خط غیرخالی دارید. با /stockdone ثبت کنید یا /stockcancel.`,
    );
    return true;
  }

  await prisma.telegramInventoryWizardState.update({
    where: { actorTelegramId },
    data: { buffer: nextBuffer },
  });

  const nf = new Intl.NumberFormat("fa-IR");
  await sendAdminPlainTextMessage(
    [
      "📎 اضافه شد",
      TG_RULE,
      `جمع خطوط غیرخالی در بافر: ${nf.format(lineCount)}`,
      `حجم تقریبی: ${nf.format(nextBuffer.length)} نویسه`,
      "",
      "ادامه بدهید یا /stockdone برای ثبت نهایی.",
    ].join("\n"),
  );
  return true;
}

export async function commitTelegramStockWizard(actorTelegramId: string): Promise<boolean> {
  const state = await prisma.telegramInventoryWizardState.findUnique({
    where: { actorTelegramId },
  });

  if (!state || state.phase !== "paste_configs" || !state.planId) {
    await sendAdminPlainTextMessage("ابتدا با /stockadd شروع کنید و پلن را انتخاب کنید.");
    return true;
  }

  try {
    assertWizardFresh(state);
  } catch {
    await clearInventoryWizard(actorTelegramId);
    await sendAdminPlainTextMessage("جلسه منقضی شد. دوباره /stockadd را بزنید.");
    return true;
  }

  const raw = state.buffer.trim();
  if (!raw) {
    await sendAdminPlainTextMessage("بافر خالی است. چند خط کانفیگ بفرستید بعد /stockdone را بزنید.");
    return true;
  }

  const result = await bulkIngestAccountsForPlan(state.planId, raw);
  await clearInventoryWizard(actorTelegramId);

  if (!result.ok) {
    await sendLongAdminText(`❌ ${result.message}`);
    return true;
  }

  const msg = ["✅ ثبت موجودی", TG_RULE, formatBulkIngestSuccess(result)].join("\n");
  await sendLongAdminText(msg);
  return true;
}

export async function handleTelegramStockSlashCommands(params: {
  cmd: string;
  actorTelegramId: string | null;
}): Promise<boolean> {
  const { cmd, actorTelegramId } = params;
  if (!actorTelegramId) {
    return false;
  }

  if (cmd === "/stockadd") {
    await startStockAddWizard(actorTelegramId);
    return true;
  }

  if (cmd === "/stockcancel") {
    await clearInventoryWizard(actorTelegramId);
    await sendAdminPlainTextMessage("افزودن موجودی لغو شد.");
    return true;
  }

  if (cmd === "/stockdone") {
    await commitTelegramStockWizard(actorTelegramId);
    return true;
  }

  return false;
}
