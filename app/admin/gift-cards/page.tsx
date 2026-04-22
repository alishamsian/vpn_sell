import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { AdminGiftCardsManager } from "@/components/admin/admin-gift-cards-manager";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminGiftCardsPage() {
  await requireAdmin();
  const giftCards = await prisma.giftCard.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      initialAmount: true,
      balance: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مارکتینگ"
        title="بن خرید"
        description="بن‌های خرید را بسازید و وضعیت آن‌ها را مدیریت کنید. موجودی هر بن تا اتمام قابل استفاده است."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(giftCards.length)} بن`} />}
      />

      <AdminSectionCard title="ساخت و مدیریت بن خرید">
        <AdminGiftCardsManager
          giftCards={giftCards.map((card) => ({
            ...card,
            initialAmount: card.initialAmount.toString(),
            balance: card.balance.toString(),
            createdAt: card.createdAt.toLocaleDateString("fa-IR"),
          }))}
        />
      </AdminSectionCard>
    </div>
  );
}

