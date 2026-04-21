import crypto from "node:crypto";

import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getMailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function isPasswordResetMailConfigured() {
  const config = getMailConfig();

  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function buildResetUrl(token: string) {
  const { appUrl } = getMailConfig();
  const normalizedBase = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;

  return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const config = getMailConfig();

  if (!isPasswordResetMailConfigured() || !config.host || !config.user || !config.pass || !config.from) {
    throw new Error("تنظیمات ایمیل بازیابی رمز کامل نیست.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: params.email,
    subject: "بازیابی رمز عبور",
    text: [
      `${params.name} عزیز`,
      "",
      "برای بازنشانی رمز عبور روی لینک زیر کلیک کنید:",
      params.resetUrl,
      "",
      "این لینک تا ۳۰ دقیقه معتبر است.",
      "اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; line-height: 1.9; direction: rtl; text-align: right;">
        <p>${params.name} عزیز</p>
        <p>برای بازنشانی رمز عبور روی دکمه زیر کلیک کنید.</p>
        <p>
          <a href="${params.resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#0f172a;color:#ffffff;text-decoration:none;">
            بازنشانی رمز عبور
          </a>
        </p>
        <p>این لینک تا ۳۰ دقیقه معتبر است.</p>
        <p>اگر این درخواست را شما ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</p>
      </div>
    `,
  });
}

export async function createPasswordResetRequest(identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return {
      status: "not_found" as const,
      debugUrl: null,
    };
  }

  if (!user.email) {
    return {
      status: "missing_email" as const,
      debugUrl: null,
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const resetUrl = buildResetUrl(rawToken);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  if (isPasswordResetMailConfigured()) {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl,
    });

    return {
      status: "sent" as const,
      debugUrl: null,
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      status: "dev_link" as const,
      debugUrl: resetUrl,
    };
  }

  throw new Error("ارسال ایمیل بازیابی هنوز برای این پروژه تنظیم نشده است.");
}

export async function getPasswordResetTokenRecord(token: string) {
  if (!token) {
    return null;
  }

  return prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function validatePasswordResetToken(token: string) {
  const record = await getPasswordResetTokenRecord(token);

  if (!record) {
    return {
      valid: false,
      reason: "not_found" as const,
      userName: null,
    };
  }

  if (record.usedAt) {
    return {
      valid: false,
      reason: "used" as const,
      userName: record.user.name,
    };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return {
      valid: false,
      reason: "expired" as const,
      userName: record.user.name,
    };
  }

  return {
    valid: true,
    reason: null,
    userName: record.user.name,
  };
}

export async function consumePasswordResetToken(params: { token: string; passwordHash: string }) {
  const record = await getPasswordResetTokenRecord(params.token);

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new Error("لینک بازنشانی رمز معتبر نیست یا منقضی شده است.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: record.userId,
      },
      data: {
        passwordHash: params.passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: {
        id: record.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: record.userId,
        NOT: {
          id: record.id,
        },
      },
    }),
  ]);

  return record.user;
}
