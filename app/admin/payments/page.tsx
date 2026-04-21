import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { PaymentReviewList } from "@/components/admin/payment-review-list";
import { requireAdmin } from "@/lib/auth";
import { getAdminPayments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const payments = await getAdminPayments();
  const pendingCount = payments.filter((payment) => payment.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مدیریت مالی"
        title="بررسی و مدیریت پرداخت‌ها"
        description="همه رسیدهای ثبت‌شده، وضعیت تلگرام و تاریخچه بررسی هر پرداخت را از این بخش مدیریت کنید."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(pendingCount)} مورد در انتظار`} />}
      />

      <AdminSectionCard
        title="لیست کامل پرداخت‌ها"
        description="رسیدها را بررسی کنید، یادداشت ثبت کنید و پرداخت را از همین صفحه تایید یا رد کنید."
      >
        <PaymentReviewList
          payments={[
            ...payments.filter((payment) => payment.status === "PENDING"),
            ...payments.filter((payment) => payment.status !== "PENDING"),
          ]}
        />
      </AdminSectionCard>
    </div>
  );
}
