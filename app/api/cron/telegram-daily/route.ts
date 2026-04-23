import { NextResponse } from "next/server";

import { buildTelegramDailyReportText } from "@/lib/telegram-daily-report";
import { isTelegramConfigured, sendAdminPlainTextMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

async function runDailyReport() {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false, error: "telegram_not_configured" }, { status: 503 });
  }
  const text = await buildTelegramDailyReportText();
  await sendAdminPlainTextMessage(text);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    return await runDailyReport();
  } catch (error) {
    console.error("[cron telegram-daily]", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    return await runDailyReport();
  } catch (error) {
    console.error("[cron telegram-daily]", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
