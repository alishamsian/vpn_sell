import {
  ConversationStatus,
  ConversationType,
  Prisma,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { uploadChatAttachmentFile } from "@/lib/storage";

const MAX_CHAT_MESSAGE_LENGTH = 4000;
const MAX_CHAT_ATTACHMENT_SIZE = 8 * 1024 * 1024;
const ALLOWED_CHAT_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

function buildGeneralConversationKey(userId: string) {
  return `general:${userId}`;
}

function buildOrderConversationKey(orderId: string) {
  return `order:${orderId}`;
}

function buildMessagePreview(params: { text: string; attachmentName?: string | null }) {
  const text = params.text.trim();

  if (text) {
    return text.slice(0, 160);
  }

  if (params.attachmentName) {
    return `فایل: ${params.attachmentName}`;
  }

  return "پیام جدید";
}

async function assertConversationAccess(params: {
  tx: Prisma.TransactionClient;
  conversationId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  const conversation = await params.tx.conversation.findUnique({
    where: {
      id: params.conversationId,
    },
    include: {
      order: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new Error("گفت‌وگوی موردنظر پیدا نشد.");
  }

  if (params.actorRole !== "ADMIN" && conversation.userId !== params.actorId) {
    throw new Error("شما به این گفت‌وگو دسترسی ندارید.");
  }

  return conversation;
}

function getConversationTitle(params: {
  type: ConversationType;
  orderPlanName?: string | null;
  orderId?: string | null;
}) {
  if (params.type === "ORDER_SUPPORT") {
    return params.orderPlanName
      ? `پشتیبانی سفارش ${params.orderPlanName}`
      : `پشتیبانی سفارش ${params.orderId ?? ""}`.trim();
  }

  return "پشتیبانی عمومی";
}

export async function ensureGeneralConversation(userId: string) {
  return prisma.conversation.upsert({
    where: {
      conversationKey: buildGeneralConversationKey(userId),
    },
    create: {
      conversationKey: buildGeneralConversationKey(userId),
      type: "GENERAL_SUPPORT",
      userId,
      title: "پشتیبانی عمومی",
    },
    update: {
      title: "پشتیبانی عمومی",
    },
    include: {
      user: true,
      order: {
        include: {
          plan: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: true,
        },
      },
    },
  });
}

export async function ensureOrderConversation(params: { orderId: string; userId: string }) {
  const order = await prisma.order.findFirst({
    where: {
      id: params.orderId,
      userId: params.userId,
    },
    include: {
      plan: true,
    },
  });

  if (!order) {
    throw new Error("سفارش موردنظر برای شروع گفتگو پیدا نشد.");
  }

  const title = getConversationTitle({
    type: "ORDER_SUPPORT",
    orderPlanName: order.plan.name,
    orderId: order.id,
  });

  return prisma.conversation.upsert({
    where: {
      conversationKey: buildOrderConversationKey(order.id),
    },
    create: {
      conversationKey: buildOrderConversationKey(order.id),
      type: "ORDER_SUPPORT",
      userId: order.userId,
      orderId: order.id,
      title,
    },
    update: {
      title,
    },
    include: {
      user: true,
      order: {
        include: {
          plan: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: true,
        },
      },
    },
  });
}

export async function sendConversationMessage(params: {
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  attachment?: File | null;
}) {
  const trimmedText = params.text.trim();
  const attachment =
    params.attachment instanceof File && params.attachment.size > 0 ? params.attachment : null;

  if (!trimmedText && !attachment) {
    throw new Error("حداقل متن یا فایل پیام باید وارد شود.");
  }

  if (trimmedText.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new Error("متن پیام بیش از حد طولانی است.");
  }

  return prisma.$transaction(async (tx) => {
    const conversation = await assertConversationAccess({
      tx,
      conversationId: params.conversationId,
      actorId: params.senderId,
      actorRole: params.senderRole,
    });

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMimeType: string | null = null;
    let attachmentSize: number | null = null;

    if (attachment) {
      if (attachment.size <= 0) {
        throw new Error("فایل انتخاب‌شده معتبر نیست.");
      }

      if (attachment.size > MAX_CHAT_ATTACHMENT_SIZE) {
        throw new Error("حجم فایل گفتگو نباید بیشتر از ۸ مگابایت باشد.");
      }

      if (attachment.type && !ALLOWED_CHAT_ATTACHMENT_TYPES.has(attachment.type)) {
        throw new Error("نوع فایل گفتگو پشتیبانی نمی‌شود.");
      }

      const uploaded = await uploadChatAttachmentFile({
        conversationId: conversation.id,
        file: attachment,
        userId: conversation.userId,
      });

      attachmentUrl = uploaded.url;
      attachmentName = attachment.name || "attachment";
      attachmentMimeType = attachment.type || "application/octet-stream";
      attachmentSize = attachment.size;
    }

    const messageType =
      attachmentUrl && attachmentMimeType?.startsWith("image/")
        ? "IMAGE"
        : attachmentUrl
          ? "FILE"
          : "TEXT";

    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: params.senderId,
        senderRole: params.senderRole,
        type: messageType,
        body: trimmedText,
        attachmentUrl,
        attachmentName,
        attachmentMimeType,
        attachmentSize,
      },
      include: {
        sender: true,
      },
    });

    const preview = buildMessagePreview({
      text: trimmedText,
      attachmentName,
    });

    await tx.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderRole:
          params.senderRole === "ADMIN"
            ? "USER"
            : "ADMIN",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        status: "OPEN",
        closedAt: null,
        title:
          conversation.type === "ORDER_SUPPORT"
            ? getConversationTitle({
                type: conversation.type,
                orderPlanName: conversation.order?.plan.name,
                orderId: conversation.orderId,
              })
            : "پشتیبانی عمومی",
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
        unreadByUser: params.senderRole === "ADMIN" ? { increment: 1 } : 0,
        unreadByAdmin: params.senderRole === "ADMIN" ? 0 : { increment: 1 },
      },
    });

    return message;
  });
}

export async function markConversationAsRead(params: {
  conversationId: string;
  actorId: string;
  actorRole: UserRole;
}) {
  return prisma.$transaction(async (tx) => {
    const conversation = await assertConversationAccess({
      tx,
      conversationId: params.conversationId,
      actorId: params.actorId,
      actorRole: params.actorRole,
    });

    await tx.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderRole: params.actorRole === "ADMIN" ? "USER" : "ADMIN",
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    await tx.conversation.update({
      where: {
        id: conversation.id,
      },
      data: params.actorRole === "ADMIN" ? { unreadByAdmin: 0 } : { unreadByUser: 0 },
    });
  });
}

export async function setConversationStatus(params: {
  conversationId: string;
  actorId: string;
  actorRole: UserRole;
  status: ConversationStatus;
}) {
  return prisma.$transaction(async (tx) => {
    await assertConversationAccess({
      tx,
      conversationId: params.conversationId,
      actorId: params.actorId,
      actorRole: params.actorRole,
    });

    return tx.conversation.update({
      where: {
        id: params.conversationId,
      },
      data: {
        status: params.status,
        closedAt: params.status === "CLOSED" ? new Date() : null,
      },
    });
  });
}

export async function getOrCreateConversationForUser(params: {
  userId: string;
  conversationType: ConversationType;
  orderId?: string;
}) {
  if (params.conversationType === "ORDER_SUPPORT") {
    if (!params.orderId) {
      throw new Error("شناسه سفارش برای این گفتگو الزامی است.");
    }

    return ensureOrderConversation({
      orderId: params.orderId,
      userId: params.userId,
    });
  }

  return ensureGeneralConversation(params.userId);
}
