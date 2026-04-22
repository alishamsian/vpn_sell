import { PrismaClient } from "@prisma/client";

/**
 * اگر در URL تنظیم نشده باشد، pool_timeout / connect_timeout را اضافه می‌کند
 * تا خطای «Timed out fetching a new connection from the connection pool» کمتر شود.
 */
function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const url = new URL(raw);
    const poolTimeout = process.env.DATABASE_POOL_TIMEOUT ?? "30";
    const connectTimeout = process.env.DATABASE_CONNECT_TIMEOUT ?? "20";

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", poolTimeout);
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", connectTimeout);
    }

    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const cached = globalForPrisma.prisma;
// در dev ممکن است بعد از prisma generate، instance قبلی هنوز در global cache بماند
// و مدل‌های جدید (delegateها) را نداشته باشد. در این حالت، یک بار بازسازی می‌کنیم.
const requiredDelegates = [
  "wallet",
  "walletTransaction",
  "coupon",
  "couponRedemption",
  "giftCard",
  "giftCardRedemption",
  "referralCampaign",
  "referralCode",
  "referralAttribution",
] as const;

const needsRefresh =
  Boolean(cached) &&
  requiredDelegates.some((delegate) => !(delegate in (cached as unknown as Record<string, unknown>)));

export const prisma = needsRefresh ? createPrismaClient() : cached ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
