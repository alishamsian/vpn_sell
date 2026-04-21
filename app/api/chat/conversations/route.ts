import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getAdminChatConversations, getUserChatConversations } from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "نیاز به ورود به حساب دارید." }, { status: 401 });
  }

  const conversations =
    user.role === "ADMIN"
      ? await getAdminChatConversations()
      : await getUserChatConversations(user.id);

  return NextResponse.json({
    conversations,
  });
}
