import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { markConversationAsRead } from "@/lib/chat";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "نیاز به ورود به حساب دارید." }, { status: 401 });
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
