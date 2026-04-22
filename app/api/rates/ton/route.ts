import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let cachedRate: { priceIrr: number; priceToman: number; updatedAt: string } | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

type CoinGeckoSimplePrice = {
  "the-open-network"?: {
    irr?: number;
    usd?: number;
  };
};

type ExchangeRateApiResponse =
  | {
      result: "success";
      base_code: "USD";
      rates: Record<string, number>;
    }
  | {
      result: "error";
      "error-type"?: string;
    };

type CoinPaprikaTicker = {
  quotes?: {
    USD?: {
      price?: number;
    };
  };
};

export async function GET() {
  try {
    const nowMs = Date.now();
    if (cachedRate && nowMs - cachedAtMs < CACHE_TTL_MS) {
      return NextResponse.json(
        { ok: true, ...cachedRate, cached: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const fxResponse = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!fxResponse.ok) {
      if (cachedRate) {
        return NextResponse.json(
          { ok: true, ...cachedRate, cached: true, warning: "نرخ از کش استفاده شد." },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json({ ok: false, message: "دریافت نرخ TON ناموفق بود." }, { status: 502 });
    }

    const fxData = (await fxResponse.json()) as ExchangeRateApiResponse;
    if (fxData.result !== "success") {
      if (cachedRate) {
        return NextResponse.json(
          { ok: true, ...cachedRate, cached: true, warning: "نرخ از کش استفاده شد." },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json({ ok: false, message: "دریافت نرخ TON ناموفق بود." }, { status: 502 });
    }

    const usdToIrr = fxData.rates["IRR"];
    if (!usdToIrr || !Number.isFinite(usdToIrr) || usdToIrr <= 0) {
      if (cachedRate) {
        return NextResponse.json(
          { ok: true, ...cachedRate, cached: true, warning: "نرخ از کش استفاده شد." },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json({ ok: false, message: "دریافت نرخ TON ناموفق بود." }, { status: 502 });
    }

    // 1) Primary: CoinPaprika (پایدارتر از CoinGecko برای نرخ عمومی)
    const paprikaResponse = await fetch("https://api.coinpaprika.com/v1/tickers/ton-toncoin", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "alishop7/1.0 (+nextjs)",
      },
    });

    if (paprikaResponse.ok) {
      const paprikaData = (await paprikaResponse.json()) as CoinPaprikaTicker;
      const usd = paprikaData.quotes?.USD?.price;
      if (usd && Number.isFinite(usd) && usd > 0) {
        const irr = usd * usdToIrr;
        const toman = irr / 10;
        cachedRate = { priceIrr: irr, priceToman: toman, updatedAt: new Date().toISOString() };
        cachedAtMs = nowMs;
        return NextResponse.json(
          { ok: true, ...cachedRate, cached: false },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=irr",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": "alishop7/1.0 (+nextjs)",
        },
      },
    );

    if (!response.ok) {
      if (cachedRate) {
        return NextResponse.json(
          { ok: true, ...cachedRate, cached: true, warning: "نرخ از کش استفاده شد." },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return NextResponse.json({ ok: false, message: "دریافت نرخ TON ناموفق بود." }, { status: 502 });
    }

    const data = (await response.json()) as CoinGeckoSimplePrice;

    const irrDirect = data["the-open-network"]?.irr;
    let irr: number | null =
      irrDirect && Number.isFinite(irrDirect) && irrDirect > 0 ? irrDirect : null;

    // CoinGecko در بعضی regionها/لحظات نرخ IRR را خالی برمی‌گرداند. در این حالت از USD + نرخ تبدیل USD→IRR استفاده می‌کنیم.
    if (irr == null) {
      const usdResponse = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",
        {
          cache: "no-store",
          headers: {
            accept: "application/json",
            "user-agent": "alishop7/1.0 (+nextjs)",
          },
        },
      );

      if (!usdResponse.ok) {
        if (cachedRate) {
          return NextResponse.json(
            { ok: true, ...cachedRate, cached: true, warning: "نرخ از کش استفاده شد." },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        return NextResponse.json({ ok: false, message: "دریافت نرخ TON ناموفق بود." }, { status: 502 });
      }

      const usdData = (await usdResponse.json()) as CoinGeckoSimplePrice;
      const usd = usdData["the-open-network"]?.usd;
      if (!usd || !Number.isFinite(usd) || usd <= 0) {
        if (cachedRate) {
          return NextResponse.json(
            { ok: true, ...cachedRate, cached: true, warning: "نرخ جدید نامعتبر بود؛ از کش استفاده شد." },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
        return NextResponse.json({ ok: false, message: "نرخ TON معتبر نیست." }, { status: 502 });
      }

      irr = usd * usdToIrr;
    }

    const toman = irr / 10;
    cachedRate = { priceIrr: irr, priceToman: toman, updatedAt: new Date().toISOString() };
    cachedAtMs = nowMs;

    return NextResponse.json(
      {
        ok: true,
        ...cachedRate,
        cached: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (cachedRate) {
      return NextResponse.json(
        { ok: true, ...cachedRate, cached: true, warning: "خطا در دریافت نرخ؛ از کش استفاده شد." },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "خطا در دریافت نرخ TON" },
      { status: 500 },
    );
  }
}

