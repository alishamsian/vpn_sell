import { NextResponse } from "next/server";

import { PurchaseError, purchasePlan } from "@/lib/purchase";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      planId?: unknown;
      userId?: unknown;
    };

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!planId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: "ارسال planId و userId الزامی است.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await purchasePlan({
      planId,
      userId,
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      config: result.config,
      createdAt: result.createdAt,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      const statusCode =
        error.code === "INVALID_PLAN" ? 404 : error.code === "OUT_OF_STOCK" ? 409 : 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: statusCode,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطای غیرمنتظره در سرور رخ داد.",
      },
      {
        status: 500,
      },
    );
  }
}
