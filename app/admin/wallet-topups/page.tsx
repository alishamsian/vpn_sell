import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { AdminWalletTopUpsList } from "@/components/admin/admin-wallet-topups-list";
import { requireAdmin } from "@/lib/auth";
import { getAdminWalletTopUps } from "@/lib/wallet-topups";

export const dynamic = "force-dynamic";

export default async function AdminWalletTopUpsPage() {
  await requireAdmin();
  const topUps = await getAdminWalletTopUps();
  const pendingCount = topUps.filter((t) => t.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="کیف‌پول"
        title="شارژهای کیف‌پول"
        description="رسیدهای شارژ کیف‌پول را بررسی و تایید/رد کنید."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(pendingCount)} مورد در انتظار`} />}
      />

      <AdminSectionCard title="لیست شارژها">
        <AdminWalletTopUpsList
          topUps={topUps.map((t) => ({
            id: t.id,
            amountFormatted: t.amountFormatted,
            trackingCode: t.trackingCode,
            cardLast4: t.cardLast4,
            status: t.status,
            reviewNote: t.reviewNote ?? null,
            createdAt: t.createdAt.toLocaleString("fa-IR"),
            userLabel: `${t.user.name} · ${t.user.phone ?? t.user.email ?? "-"}`,
            previewReceiptUrl: t.previewReceiptUrl,
          }))}
        />
      </AdminSectionCard>
    </div>
  );
}

