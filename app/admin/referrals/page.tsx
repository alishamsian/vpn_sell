import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { AdminReferralsManager } from "@/components/admin/admin-referrals-manager";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  await requireAdmin();

  const campaigns = await prisma.referralCampaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      rewardValue: true,
      isActive: true,
      createdAt: true,
    },
  });

  const codes = await prisma.referralCode.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      ownerUserId: true,
      isActive: true,
      createdAt: true,
      campaign: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="افیلیت / Referral"
        title="کمپین‌ها و کدهای معرفی"
        description="کمپین‌های رفرال را بسازید و برای همکاران/کانال‌ها کد اختصاصی صادر کنید. پاداش به‌صورت اعتبار کیف‌پول پس از تایید پرداخت اعمال می‌شود."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(codes.length)} کد`} />}
      />

      <AdminSectionCard title="مدیریت رفرال">
        <AdminReferralsManager
          campaigns={campaigns.map((c) => ({
            ...c,
            rewardValue: c.rewardValue.toString(),
            createdAt: c.createdAt.toLocaleDateString("fa-IR"),
          }))}
          codes={codes.map((c) => ({
            id: c.id,
            code: c.code,
            campaignName: c.campaign.name,
            ownerUserId: c.ownerUserId,
            isActive: c.isActive,
            createdAt: c.createdAt.toLocaleDateString("fa-IR"),
          }))}
        />
      </AdminSectionCard>
    </div>
  );
}

