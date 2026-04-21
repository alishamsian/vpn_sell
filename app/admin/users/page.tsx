import { AdminPageHeader, AdminPill, AdminSectionCard, AdminTableEmptyState } from "@/components/admin/admin-ui";
import { formatDate, formatPrice } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { getAdminUsers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="مدیریت کاربران"
        title="کاربران و فعالیت سفارش‌ها"
        description="لیست کاربران، نقش، اطلاعات تماس و خلاصه فعالیت سفارش هر کاربر را از این بخش ببینید."
        action={<AdminPill label={`${new Intl.NumberFormat("fa-IR").format(users.length)} کاربر`} />}
      />

      <AdminSectionCard
        title="لیست کاربران"
        description="برای مشاهده جزئیات سفارش هر کاربر، از لینک سفارش اخیر استفاده کنید."
      >
        {users.length === 0 ? (
          <AdminTableEmptyState label="هنوز کاربری ثبت نشده است." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-4 py-3 font-medium">کاربر</th>
                  <th className="px-4 py-3 font-medium">نقش</th>
                  <th className="px-4 py-3 font-medium">تماس</th>
                  <th className="px-4 py-3 font-medium">سفارش‌ها</th>
                  <th className="px-4 py-3 font-medium">مجموع خرید</th>
                  <th className="px-4 py-3 font-medium">آخرین سفارش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="align-top text-slate-700">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{user.name}</div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{user.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.role === "ADMIN" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.role === "ADMIN" ? "ادمین" : "کاربر"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div dir="ltr" className="text-left">
                        {user.email ?? "-"}
                      </div>
                      <div dir="ltr" className="mt-1 text-left text-xs text-slate-500">
                        {user.phone ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>کل: {new Intl.NumberFormat("fa-IR").format(user.orders.length)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        تحویل‌شده: {new Intl.NumberFormat("fa-IR").format(user.fulfilledOrders)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        گفتگوها: {new Intl.NumberFormat("fa-IR").format(user._count.conversations)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatPrice(user.totalSpent)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {user.lastOrder ? (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-500">{formatDate(user.lastOrder.createdAt)}</div>
                          <div className="text-sm font-medium text-slate-900">{user.lastOrder.plan.name}</div>
                          <div className="font-mono text-xs text-slate-500" dir="ltr">
                            {user.lastOrder.id}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
