import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { AdminCouponsManager } from "@/components/admin/admin-coupons-manager";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      kind: true,
      value: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مارکتینگ"
        title="کدهای تخفیف"
        description="کوپن‌ها را بسازید، محدودیت‌ها را تنظیم کنید و وضعیت فعال/غیرفعال را مدیریت کنید."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(coupons.length)} کوپن`} />}
      />

      <AdminSectionCard title="ساخت و مدیریت کوپن‌ها">
        <AdminCouponsManager
          coupons={coupons.map((coupon) => ({
            ...coupon,
            value: coupon.value.toString(),
            createdAt: coupon.createdAt.toLocaleDateString("fa-IR"),
          }))}
        />
      </AdminSectionCard>
    </div>
  );
}

