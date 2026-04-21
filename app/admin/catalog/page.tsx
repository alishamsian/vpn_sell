import { AccountsTable } from "@/components/admin/accounts-table";
import { AdminPlansManager } from "@/components/admin/admin-plans-manager";
import { AdminForms } from "@/components/admin-forms";
import { AdminPageHeader, AdminPill, AdminSectionCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth";
import { getAdminAccounts, getAdminPlansDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  await requireAdmin();
  const plans = await getAdminPlansDashboard();
  const accounts = await getAdminAccounts();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="کاتالوگ فروش"
        title="مدیریت پلن‌ها و موجودی"
        description="پلن جدید بسازید، وضعیت موجودی هر پلن را ببینید و اکانت‌های آماده را به‌صورت گروهی وارد کنید."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(accounts.length)} اکانت`} />}
      />

      <AdminSectionCard
        title="مدیریت کامل پلن‌ها"
        description="برای هر پلن، آمار سفارش و پرداخت، درآمد تخمینی، ویرایش سریع، کپی و حذف امن (در صورت نبود سفارش) را یکجا دارید."
      >
        <AdminPlansManager plans={plans} />
      </AdminSectionCard>

      <AdminForms plans={plans} />

      <AdminSectionCard
        title="فهرست اکانت‌ها"
        description="تمام اکانت‌های واردشده را با وضعیت فعلی فروش و زمان ورود مشاهده کنید."
      >
        <AccountsTable accounts={accounts} />
      </AdminSectionCard>
    </div>
  );
}
