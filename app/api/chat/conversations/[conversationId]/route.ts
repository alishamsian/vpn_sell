import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAdminConversationDetails, getUserConversationDetails } from "@/lib/queries";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "نیاز به ورود به حساب دارید." }, { status: 401 });
  }

  const { conversationId } = await context.params;
  const conversation =
    user.role === "ADMIN"
      ? await getAdminConversationDetails(conversationId)
      : await getUserConversationDetails(conversationId, user.id);

  if (!conversation) {
    return NextResponse.json({ message: "گفت‌وگو پیدا نشد." }, { status: 404 });
  }

  return NextResponse.json({
    conversation,
  });
}
