import { AccountStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PlanInventory = {
  id: string;
  name: string;
  price: number;
  createdAt: string;
  remainingCount: number;
  soldCount: number;
  totalCount: number;
};

export async function getPlansWithInventory(): Promise<PlanInventory[]> {
  const [plans, inventory] = await Promise.all([
    prisma.plan.findMany({
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.account.groupBy({
      by: ["planId", "status"],
      _count: {
        _all: true,
      },
    }),
  ]);

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
      createdAt: plan.createdAt.toISOString(),
      remainingCount: stats.remainingCount,
      soldCount: stats.soldCount,
      totalCount: stats.remainingCount + stats.soldCount,
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
  return prisma.payment.findMany({
    include: {
      order: {
        include: {
          plan: true,
          user: true,
          account: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
}

export async function getAdminOverview() {
  const [pendingPayments, approvedPayments, rejectedPayments, usersCount] = await Promise.all([
    prisma.payment.count({
      where: {
        status: PaymentStatus.PENDING,
      },
    }),
    prisma.payment.count({
      where: {
        status: PaymentStatus.APPROVED,
      },
    }),
    prisma.payment.count({
      where: {
        status: PaymentStatus.REJECTED,
      },
    }),
    prisma.user.count(),
  ]);

  return {
    pendingPayments,
    approvedPayments,
    rejectedPayments,
    usersCount,
  };
}
