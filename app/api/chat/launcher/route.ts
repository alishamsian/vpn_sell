import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getAdminChatConversations,
  getAdminConversationDetails,
  getChatUnreadCount,
  getUserChatConversations,
  getUserConversationDetails,
} from "@/lib/queries";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      unreadCount: 0,
      conversation: null,
    });
  }

  const unreadCount = await getChatUnreadCount({
    userId: user.id,
    role: user.role,
  });

  if (user.role === "ADMIN") {
    const conversations = await getAdminChatConversations();
    const firstConversationId = conversations[0]?.id;
    const conversation = firstConversationId
      ? await getAdminConversationDetails(firstConversationId)
      : null;

    return NextResponse.json({
      authenticated: true,
      unreadCount,
      conversations,
      conversation,
    });
  }

  const conversations = await getUserChatConversations(user.id);
  const firstConversationId = conversations[0]?.id;
  const conversation = firstConversationId
    ? await getUserConversationDetails(firstConversationId, user.id)
    : null;

  return NextResponse.json({
    authenticated: true,
    unreadCount,
    conversations,
    conversation,
  });
}
