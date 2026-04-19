import { AdminForms } from "@/components/admin-forms";
import { formatPrice, truncateConfig } from "@/lib/format";
import { getAdminAccounts, getPlansWithInventory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [plans, accounts] = await Promise.all([getPlansWithInventory(), getAdminAccounts()]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">پنل ادمین</h1>
          <p className="text-sm leading-6 text-slate-600">
            پلن بساز، اکانت‌های آماده را گروهی وارد کن و موجودی باقی‌مانده هر پلن را مدیریت
            کن.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
          >
            <div className="text-sm text-slate-500">{formatPrice(plan.price)}</div>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{plan.name}</h2>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>موجود: {plan.remainingCount}</span>
              <span>فروخته‌شده: {plan.soldCount}</span>
            </div>
          </div>
        ))}
      </section>

      <AdminForms plans={plans} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">اکانت‌ها</h2>
            <p className="text-sm text-slate-600">همه اکانت‌های واردشده با وضعیت فعلی فروش.</p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            {accounts.length} اکانت
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-4 py-3 font-medium">پلن</th>
                <th className="px-4 py-3 font-medium">کانفیگ</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">خریدار</th>
                <th className="px-4 py-3 font-medium">تاریخ ورود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <tr key={account.id} className="align-top text-slate-700">
                  <td className="px-4 py-4">{account.plan.name}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600">
                    {truncateConfig(account.config, 100)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        account.status === "available"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {account.status === "available" ? "موجود" : "فروخته‌شده"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{account.order?.userId ?? "-"}</td>
                  <td className="px-4 py-4 text-slate-500">
                    {account.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              هنوز هیچ اکانتی وارد نشده است.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
