import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    {
      success: false,
      error: "این endpoint منسوخ شده است. از /api/orders برای ثبت سفارش استفاده کنید.",
    },
    {
      status: 410,
    },
  );
}
