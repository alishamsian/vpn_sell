import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAdminChatConversationsForUser } from "@/lib/queries";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ message: "دسترسی غیرمجاز است." }, { status: 401 });
  }

  const { userId } = await context.params;
  const conversations = await getAdminChatConversationsForUser(userId);
  return NextResponse.json({ conversations });
}

