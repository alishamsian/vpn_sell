import { createHmac, timingSafeEqual } from "node:crypto";

function stripEnvValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

export function getTelegramBotTokenForWebApp(): string | undefined {
  return stripEnvValue(process.env.TELEGRAM_BOT_TOKEN);
}

type VerifyOk = { ok: true; telegramUserId: string; authDate: number };
type VerifyFail = { ok: false; error: string };

/**
 * اعتبارسنجی امضای initData طبق مستندات Telegram Web Apps.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number,
): VerifyOk | VerifyFail {
  const trimmed = initData.trim();
  if (!trimmed) {
    return { ok: false, error: "initData خالی است." };
  }
  if (!botToken) {
    return { ok: false, error: "توکن ربات تنظیم نشده است." };
  }

  try {
    const params = new URLSearchParams(trimmed);
    const hash = params.get("hash");
    if (!hash) {
      return { ok: false, error: "فیلد hash در initData نیست." };
    }

    const pairs = [...params.entries()].filter(([key]) => key !== "hash");
    pairs.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHex = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    const hashNorm = hash.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hashNorm) || !/^[0-9a-f]{64}$/.test(calculatedHex)) {
      return { ok: false, error: "امضای initData نامعتبر است." };
    }
    const a = Buffer.from(calculatedHex, "hex");
    const b = Buffer.from(hashNorm, "hex");
    if (!timingSafeEqual(a, b)) {
      return { ok: false, error: "امضای initData نامعتبر است." };
    }

    const authDateRaw = params.get("auth_date");
    const authDate = Number(authDateRaw);
    if (!Number.isFinite(authDate)) {
      return { ok: false, error: "auth_date نامعتبر است." };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > maxAgeSec) {
      return { ok: false, error: "initData منقضی شده است؛ دوباره از ربات باز کنید." };
    }

    const userJson = params.get("user");
    if (!userJson) {
      return { ok: false, error: "فیلد user در initData نیست." };
    }

    const user = JSON.parse(userJson) as { id?: number };
    if (typeof user.id !== "number") {
      return { ok: false, error: "شناسه کاربر تلگرام نامعتبر است." };
    }

    return { ok: true, telegramUserId: String(user.id), authDate };
  } catch {
    return { ok: false, error: "خواندن initData ناموفق بود." };
  }
}
