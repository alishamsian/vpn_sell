import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { markConversationAsRead } from "@/lib/chat";

type RouteContext = {
  params: Promise<{ userId: string; conversationId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  }

  try {
    const { conversationId } = await context.params;
    await markConversationAsRead({
      conversationId,
      actorId: user.id,
      actorRole: user.role,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ثبت خواندن پیام با خطا مواجه شد." },
      { status: 400 },
    );
  }
}

