import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAdminConversationDetails } from "@/lib/queries";

type RouteContext = {
  params: Promise<{ userId: string; conversationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  }

  const { userId, conversationId } = await context.params;
  const conversation = await getAdminConversationDetails(conversationId);

  if (!conversation || conversation.user.id !== userId) {
    return NextResponse.json({ message: "گفت‌وگو پیدا نشد." }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

