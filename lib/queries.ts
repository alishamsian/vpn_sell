import { AccountStatus } from "@prisma/client";

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
