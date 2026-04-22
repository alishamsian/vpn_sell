import { AccountStatus, PaymentStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getReceiptAccessUrl } from "@/lib/storage";

export type PlanInventory = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  maxUsers: number | null;
  createdAt: string;
  remainingCount: number;
  soldCount: number;
  totalCount: number;
};

export type AdminPlanDashboard = PlanInventory & {
  orderCounts: {
    total: number;
    pendingPayment: number;
    paymentSubmitted: number;
    waitingForAccount: number;
    fulfilled: number;
  };
  pendingPaymentReviews: number;
  revenueToman: number;
  canDelete: boolean;
};

export type ChatConversationSummary = {
  id: string;
  type: "GENERAL_SUPPORT" | "ORDER_SUPPORT";
  status: "OPEN" | "CLOSED";
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  unreadCount: number;
  unreadByUser: number;
  unreadByAdmin: number;
  messageCount: number;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  order: {
    id: string;
    status: string;
    planName: string;
  } | null;
};

export type ChatMessageItem = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "USER" | "ADMIN";
  type: "TEXT" | "IMAGE" | "FILE";
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  editedAt: string | null;
};

export type ChatConversationDetails = ChatConversationSummary & {
  messages: ChatMessageItem[];
};

function mapConversationSummary(
  conversation: {
    id: string;
    type: "GENERAL_SUPPORT" | "ORDER_SUPPORT";
    status: "OPEN" | "CLOSED";
    title: string | null;
    lastMessagePreview: string | null;
    lastMessageAt: Date | null;
    updatedAt: Date;
    unreadByUser: number;
    unreadByAdmin: number;
    _count: {
      messages: number;
    };
    user: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    };
    order: {
      id: string;
      status: string;
      plan: {
        name: string;
      };
    } | null;
  },
  viewerRole: UserRole,
): ChatConversationSummary {
  return {
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    title:
      conversation.title ??
      (conversation.type === "ORDER_SUPPORT"
        ? `پشتیبانی سفارش ${conversation.order?.plan.name ?? conversation.order?.id ?? ""}`.trim()
        : "پشتیبانی عمومی"),
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount: viewerRole === "ADMIN" ? conversation.unreadByAdmin : conversation.unreadByUser,
    unreadByUser: conversation.unreadByUser,
    unreadByAdmin: conversation.unreadByAdmin,
    messageCount: conversation._count.messages,
    user: conversation.user,
    order: conversation.order
      ? {
          id: conversation.order.id,
          status: conversation.order.status,
          planName: conversation.order.plan.name,
        }
      : null,
  };
}

function mapConversationDetails(
  conversation: {
    id: string;
    type: "GENERAL_SUPPORT" | "ORDER_SUPPORT";
    status: "OPEN" | "CLOSED";
    title: string | null;
    lastMessagePreview: string | null;
    lastMessageAt: Date | null;
    updatedAt: Date;
    unreadByUser: number;
    unreadByAdmin: number;
    _count: {
      messages: number;
    };
    user: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    };
    order: {
      id: string;
      status: string;
      plan: {
        name: string;
      };
    } | null;
    messages: Array<{
      id: string;
      senderId: string;
      senderRole: "USER" | "ADMIN";
      type: "TEXT" | "IMAGE" | "FILE";
      body: string;
      attachmentUrl: string | null;
      attachmentName: string | null;
      attachmentMimeType: string | null;
      attachmentSize: number | null;
      createdAt: Date;
      updatedAt: Date;
      readAt: Date | null;
      editedAt: Date | null;
      sender: {
        name: string;
      };
    }>;
  },
  viewerRole: UserRole,
): ChatConversationDetails {
  return {
    ...mapConversationSummary(conversation, viewerRole),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderRole: message.senderRole,
      type: message.type,
      body: message.body,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentMimeType: message.attachmentMimeType,
      attachmentSize: message.attachmentSize,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
      editedAt: message.editedAt?.toISOString() ?? null,
    })),
  };
}

export async function getPlansWithInventory(): Promise<PlanInventory[]> {
  const plans = await prisma.plan.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
  const inventory = await prisma.account.groupBy({
    by: ["planId", "status"],
    _count: {
      _all: true,
    },
  });

  const inventoryMap = new Map<
    string,
    {
      remainingCount: number;
      soldCount: number;
    }
  >();

  for (const row of inventory) {
    const current = inventoryMap.get(row.planId) ?? {
      remainingCount: 0,
      soldCount: 0,
    };

    if (row.status === AccountStatus.available) {
      current.remainingCount = row._count._all;
    }

    if (row.status === AccountStatus.sold) {
      current.soldCount = row._count._all;
    }

    inventoryMap.set(row.planId, current);
  }

  return plans.map((plan) => {
    const stats = inventoryMap.get(plan.id) ?? {
      remainingCount: 0,
      soldCount: 0,
    };

    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price),
      durationDays: plan.durationDays,
      maxUsers: plan.maxUsers,
      createdAt: plan.createdAt.toISOString(),
      remainingCount: stats.remainingCount,
      soldCount: stats.soldCount,
      totalCount: stats.remainingCount + stats.soldCount,
    };
  });
}

export async function getAdminPlansDashboard(): Promise<AdminPlanDashboard[]> {
  const plans = await getPlansWithInventory();

  if (plans.length === 0) {
    return [];
  }

  const planIds = plans.map((plan) => plan.id);

  const [orderStatusGroups, pendingReviewGroups, revenueGroups] = await Promise.all([
    prisma.order.groupBy({
      by: ["planId", "status"],
      where: {
        planId: {
          in: planIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        planId: {
          in: planIds,
        },
        payment: {
          status: PaymentStatus.PENDING,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        planId: {
          in: planIds,
        },
        status: {
          in: ["FULFILLED", "WAITING_FOR_ACCOUNT"],
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const orderCountMap = new Map<
    string,
    {
      total: number;
      pendingPayment: number;
      paymentSubmitted: number;
      waitingForAccount: number;
      fulfilled: number;
    }
  >();

  for (const planId of planIds) {
    orderCountMap.set(planId, {
      total: 0,
      pendingPayment: 0,
      paymentSubmitted: 0,
      waitingForAccount: 0,
      fulfilled: 0,
    });
  }

  for (const row of orderStatusGroups) {
    const current = orderCountMap.get(row.planId);
    if (!current) {
      continue;
    }

    current.total += row._count._all;

    if (row.status === "PENDING_PAYMENT") {
      current.pendingPayment += row._count._all;
    }

    if (row.status === "PAYMENT_SUBMITTED") {
      current.paymentSubmitted += row._count._all;
    }

    if (row.status === "WAITING_FOR_ACCOUNT") {
      current.waitingForAccount += row._count._all;
    }

    if (row.status === "FULFILLED") {
      current.fulfilled += row._count._all;
    }
  }

  const pendingReviewMap = new Map<string, number>();
  for (const row of pendingReviewGroups) {
    pendingReviewMap.set(row.planId, row._count._all);
  }

  const revenueMap = new Map<string, number>();
  for (const row of revenueGroups) {
    revenueMap.set(row.planId, Number(row._sum.amount ?? 0));
  }

  return plans.map((plan) => {
    const counts = orderCountMap.get(plan.id) ?? {
      total: 0,
      pendingPayment: 0,
      paymentSubmitted: 0,
      waitingForAccount: 0,
      fulfilled: 0,
    };

    return {
      ...plan,
      orderCounts: counts,
      pendingPaymentReviews: pendingReviewMap.get(plan.id) ?? 0,
      revenueToman: revenueMap.get(plan.id) ?? 0,
      canDelete: counts.total === 0,
    };
  });
}

export async function getAdminAccounts() {
  return prisma.account.findMany({
    include: {
      plan: {
        select: {
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getDashboardOrders(userId: string) {
  return prisma.order.findMany({
    where: {
      userId,
    },
    include: {
      plan: true,
      payment: true,
      account: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getDashboardNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });
}

export async function getUserChatConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [
      {
        lastMessageAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return conversations.map((conversation) => mapConversationSummary(conversation, "USER"));
}

export async function getAdminChatConversations() {
  const conversations = await prisma.conversation.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [
      {
        unreadByAdmin: "desc",
      },
      {
        lastMessageAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return conversations.map((conversation) => mapConversationSummary(conversation, "ADMIN"));
}

export async function getAdminChatConversationsForUser(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [
      { unreadByAdmin: "desc" },
      { lastMessageAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return conversations.map((conversation) => mapConversationSummary(conversation, "ADMIN"));
}

export async function getUserConversationDetails(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return conversation ? mapConversationDetails(conversation, "USER") : null;
}

export async function getAdminConversationDetails(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return conversation ? mapConversationDetails(conversation, "ADMIN") : null;
}

export async function getOrderConversationDetails(orderId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      orderId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return conversation ? mapConversationDetails(conversation, "USER") : null;
}

export async function getChatUnreadCount(params: { userId: string; role: UserRole }) {
  if (params.role === "ADMIN") {
    const aggregate = await prisma.conversation.aggregate({
      _sum: {
        unreadByAdmin: true,
      },
    });

    return aggregate._sum.unreadByAdmin ?? 0;
  }

  const aggregate = await prisma.conversation.aggregate({
    where: {
      userId: params.userId,
    },
    _sum: {
      unreadByUser: true,
    },
  });

  return aggregate._sum.unreadByUser ?? 0;
}

export async function getOrderDetails(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      user: true,
      plan: true,
      account: true,
      payment: true,
    },
  });
}

export async function getAdminPayments() {
  const payments = await prisma.payment.findMany({
    include: {
      order: {
        include: {
          plan: true,
          user: true,
          account: true,
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 4,
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return Promise.all(
    payments.map(async (payment) => ({
      ...payment,
      previewReceiptUrl: await getReceiptAccessUrl({
        receiptUrl: payment.receiptUrl,
        receiptStoragePath: payment.receiptStoragePath,
      }),
    })),
  );
}

export async function getAdminOverview() {
  const pendingPayments = await prisma.payment.count({
    where: {
      status: PaymentStatus.PENDING,
    },
  });
  const approvedPayments = await prisma.payment.count({
    where: {
      status: PaymentStatus.APPROVED,
    },
  });
  const rejectedPayments = await prisma.payment.count({
    where: {
      status: PaymentStatus.REJECTED,
    },
  });
  const usersCount = await prisma.user.count();
  const waitingForAccountOrders = await prisma.order.count({
    where: {
      status: "WAITING_FOR_ACCOUNT",
    },
  });
  const openConversations = await prisma.conversation.count({
    where: {
      status: "OPEN",
    },
  });
  const unreadAdminChatsAggregate = await prisma.conversation.aggregate({
    _sum: {
      unreadByAdmin: true,
    },
  });
  const totalPlans = await prisma.plan.count();
  const totalAccounts = await prisma.account.count();
  const availableAccounts = await prisma.account.count({
    where: {
      status: AccountStatus.available,
    },
  });

  return {
    pendingPayments,
    approvedPayments,
    rejectedPayments,
    usersCount,
    waitingForAccountOrders,
    openConversations,
    unreadAdminChats: unreadAdminChatsAggregate._sum.unreadByAdmin ?? 0,
    totalPlans,
    totalAccounts,
    availableAccounts,
  };
}

export async function getAdminUsers() {
  const users = await prisma.user.findMany({
    include: {
      orders: {
        include: {
          payment: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          conversations: true,
          messages: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return users.map((user) => {
    const fulfilledOrders = user.orders.filter((order) => order.status === "FULFILLED").length;
    const totalSpent = user.orders
      .filter((order) => order.payment?.status === "APPROVED" || order.status === "FULFILLED")
      .reduce((sum, order) => sum + Number(order.amount), 0);

    return {
      ...user,
      fulfilledOrders,
      totalSpent,
      lastOrder: user.orders[0] ?? null,
    };
  });
}

export async function getAdminReports() {
  const REPORT_TZ = "Asia/Tehran";
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const daysWindow = 30;
  const startWindow = new Date(startOfToday);
  startWindow.setDate(startWindow.getDate() - (daysWindow - 1));

  const [plans, recentAuditLogs, recentNotifications] = await Promise.all([
    getPlansWithInventory(),
    prisma.paymentAuditLog.findMany({
      include: {
        payment: {
          include: {
            order: {
              include: {
                plan: true,
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
    }),
    prisma.notification.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
        order: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  const lowStockPlans = plans
    .filter((plan) => plan.remainingCount <= 3)
    .sort((left, right) => left.remainingCount - right.remainingCount)
    .slice(0, 6);
  const topPlans = [...plans]
    .sort((left, right) => right.totalCount - left.totalCount)
    .slice(0, 6);

  const [
    totalUsers,
    totalPlans,
    totalAccounts,
    availableAccounts,
    soldAccounts,
    paymentsByStatus,
    ordersByStatus,
    ordersToday,
    revenueTodayAgg,
    windowOrdersRows,
    windowRevenueRows,
    windowUsersRows,
    avgFulfillmentSecondsRows,
    topPlansByOrdersGroups,
    topPlansByRevenueGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.plan.count(),
    prisma.account.count(),
    prisma.account.count({ where: { status: AccountStatus.available } }),
    prisma.account.count({ where: { status: AccountStatus.sold } }),
    prisma.payment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        OR: [{ status: "FULFILLED" }, { payment: { status: PaymentStatus.APPROVED } }],
      },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<
      Array<{
        day: Date;
        count: bigint;
      }>
    >`SELECT date_trunc('day', "createdAt" AT TIME ZONE ${REPORT_TZ}) AS day, COUNT(*)::bigint AS count
      FROM "Order"
      WHERE "createdAt" >= ${startWindow}
      GROUP BY 1
      ORDER BY 1`,
    prisma.$queryRaw<
      Array<{
        day: Date;
        amount: string | number | null;
      }>
    >`SELECT date_trunc('day', o."createdAt" AT TIME ZONE ${REPORT_TZ}) AS day, COALESCE(SUM(o.amount), 0) AS amount
      FROM "Order" o
      LEFT JOIN "Payment" p ON p."orderId" = o.id
      WHERE o."createdAt" >= ${startWindow}
        AND (o.status = 'FULFILLED' OR p.status = 'APPROVED')
      GROUP BY 1
      ORDER BY 1`,
    prisma.$queryRaw<
      Array<{
        day: Date;
        count: bigint;
      }>
    >`SELECT date_trunc('day', "createdAt" AT TIME ZONE ${REPORT_TZ}) AS day, COUNT(*)::bigint AS count
      FROM "User"
      WHERE "createdAt" >= ${startWindow}
      GROUP BY 1
      ORDER BY 1`,
    prisma.$queryRaw<
      Array<{
        avg_seconds: number | null;
      }>
    >`SELECT AVG(EXTRACT(EPOCH FROM ("fulfilledAt" - "createdAt"))) AS avg_seconds
      FROM "Order"
      WHERE "fulfilledAt" IS NOT NULL
        AND "createdAt" >= ${startWindow}`,
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        createdAt: {
          gte: startWindow,
        },
      },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["planId"],
      where: {
        createdAt: {
          gte: startWindow,
        },
        OR: [{ status: "FULFILLED" }, { payment: { status: PaymentStatus.APPROVED } }],
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
  ]);

  const paymentStatusCounts: Record<PaymentStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const row of paymentsByStatus) {
    paymentStatusCounts[row.status] = row._count._all;
  }

  const orderStatusCounts: Record<
    "PENDING_PAYMENT" | "PAYMENT_SUBMITTED" | "WAITING_FOR_ACCOUNT" | "FULFILLED",
    number
  > = {
    PENDING_PAYMENT: 0,
    PAYMENT_SUBMITTED: 0,
    WAITING_FOR_ACCOUNT: 0,
    FULFILLED: 0,
  };
  for (const row of ordersByStatus) {
    orderStatusCounts[row.status] = row._count._all;
  }

  const revenueTodayToman = Number(revenueTodayAgg._sum.amount ?? 0);

  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const toDayKey = (value: Date) => dayKeyFormatter.format(value);

  const makeSeries = <TValue extends number>(
    rows: Array<{ day: Date; value: TValue }>,
    fallback: TValue,
  ): Array<{ day: string; value: TValue }> => {
    const map = new Map(rows.map((row) => [toDayKey(row.day), row.value] as const));
    const result: Array<{ day: string; value: TValue }> = [];
    for (let i = 0; i < daysWindow; i += 1) {
      const day = new Date(startWindow);
      day.setDate(startWindow.getDate() + i);
      const key = toDayKey(day);
      result.push({ day: key, value: (map.get(key) ?? fallback) as TValue });
    }
    return result;
  };

  const ordersSeries = makeSeries(
    windowOrdersRows.map((row) => ({ day: row.day, value: Number(row.count) })),
    0,
  );

  const revenueSeries = makeSeries(
    windowRevenueRows.map((row) => ({ day: row.day, value: Number(row.amount ?? 0) })),
    0,
  );

  const usersSeries = makeSeries(
    windowUsersRows.map((row) => ({ day: row.day, value: Number(row.count) })),
    0,
  );

  const avgFulfillmentSeconds = avgFulfillmentSecondsRows[0]?.avg_seconds ?? null;

  const topPlanIds = Array.from(
    new Set([...topPlansByOrdersGroups.map((row) => row.planId), ...topPlansByRevenueGroups.map((row) => row.planId)]),
  );

  const planNameMap = new Map<string, { name: string; price: number }>();
  if (topPlanIds.length > 0) {
    const planRows = await prisma.plan.findMany({
      where: {
        id: {
          in: topPlanIds,
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });
    for (const plan of planRows) {
      planNameMap.set(plan.id, { name: plan.name, price: Number(plan.price) });
    }
  }

  const sortedTopPlansByOrdersGroups = [...topPlansByOrdersGroups]
    .sort((left, right) => right._count._all - left._count._all)
    .slice(0, 8);

  const topPlansByOrders = sortedTopPlansByOrdersGroups.map((row) => ({
    planId: row.planId,
    planName: planNameMap.get(row.planId)?.name ?? row.planId,
    ordersCount: row._count._all,
  }));

  const topPlansByRevenue = topPlansByRevenueGroups.map((row) => ({
    planId: row.planId,
    planName: planNameMap.get(row.planId)?.name ?? row.planId,
    revenueToman: Number(row._sum.amount ?? 0),
  }));

  const totalRevenueWindow = revenueSeries.reduce((sum, row) => sum + row.value, 0);
  const totalOrdersWindow = ordersSeries.reduce((sum, row) => sum + row.value, 0);
  const avgOrderValueWindow = totalOrdersWindow > 0 ? Math.round(totalRevenueWindow / totalOrdersWindow) : 0;

  return {
    kpis: {
      windowDays: daysWindow,
      totalUsers,
      totalPlans,
      totalAccounts,
      availableAccounts,
      soldAccounts,
      paymentStatusCounts,
      orderStatusCounts,
      ordersToday,
      revenueTodayToman,
      totalRevenueWindow,
      totalOrdersWindow,
      avgOrderValueWindow,
      avgFulfillmentSeconds,
    },
    series: {
      orders: ordersSeries,
      revenue: revenueSeries,
      users: usersSeries,
    },
    topPlansWindow: {
      byOrders: topPlansByOrders,
      byRevenue: topPlansByRevenue,
    },
    lowStockPlans,
    topPlans,
    recentAuditLogs,
    recentNotifications,
  };
}
