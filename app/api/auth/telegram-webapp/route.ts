import { NextResponse } from "next/server";

import { setSessionCookie, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTelegramAdminChatIdNormalized } from "@/lib/telegram";
import { getTelegramBotTokenForWebApp, verifyTelegramWebAppInitData } from "@/lib/telegram-webapp-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function maxAgeSeconds(): number {
  const raw = process.env.TELEGRAM_WEBAPP_INIT_MAX_AGE?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 60 && n <= 604800) {
    return n;
  }
  return 86400;
}

export async function POST(request: Request) {
  let body: { initData?: string };
  try {
    body = (await request.json()) as { initData?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه JSON نامعتبر است." }, { status: 400 });
  }

  const initData = typeof body.initData === "string" ? body.initData : "";
  const botToken = getTelegramBotTokenForWebApp();
  if (!botToken) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN تنظیم نشده است." }, { status: 503 });
  }

  const verified = verifyTelegramWebAppInitData(initData, botToken, maxAgeSeconds());
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: 401 });
  }

  const allowedId = getTelegramAdminChatIdNormalized();
  if (!allowedId) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_ADMIN_CHAT_ID تنظیم نشده است." }, { status: 503 });
  }

  if (verified.telegramUserId !== allowedId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "این حساب تلگرام با TELEGRAM_ADMIN_CHAT_ID یکی نیست؛ فقط همان آیدی عددی ادمین مجاز است (معمولاً آیدی شخصی شما، نه گروه).",
      },
      { status: 403 },
    );
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    return NextResponse.json({ ok: false, error: "هیچ کاربری با نقش ADMIN در دیتابیس نیست." }, { status: 503 });
  }

  const payload: SessionPayload = {
    sub: adminUser.id,
    role: "ADMIN",
    name: adminUser.name,
    email: adminUser.email,
    phone: adminUser.phone,
  };

  await setSessionCookie(payload);

  return NextResponse.json({ ok: true });
}
