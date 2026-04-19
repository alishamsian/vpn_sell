import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createOrderForUser, OrderFlowError } from "@/lib/orders";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "برای ثبت سفارش باید وارد حساب شوید." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { planId?: unknown };
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";

    if (!planId) {
      return NextResponse.json(
        { success: false, error: "شناسه پلن الزامی است." },
        { status: 400 },
      );
    }

    const order = await createOrderForUser({
      userId: user.id,
      planId,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
    });
  } catch (error) {
    if (error instanceof OrderFlowError) {
      const status = error.code === "OUT_OF_STOCK" ? 409 : 400;

      return NextResponse.json({ success: false, error: error.message }, { status });
    }

    return NextResponse.json(
      { success: false, error: "ثبت سفارش با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
