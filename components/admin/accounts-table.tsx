import { truncateConfig } from "@/lib/format";
import { getAdminAccounts } from "@/lib/queries";
import { AdminTableEmptyState } from "@/components/admin/admin-ui";

type AccountsTableProps = {
  accounts: Awaited<ReturnType<typeof getAdminAccounts>>;
  limit?: number;
};

export function AccountsTable({ accounts, limit }: AccountsTableProps) {
  const visibleAccounts = typeof limit === "number" ? accounts.slice(0, limit) : accounts;

  if (visibleAccounts.length === 0) {
    return <AdminTableEmptyState label="هنوز هیچ اکانتی وارد نشده است." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-stroke text-right text-sm">
        <thead>
          <tr className="text-faint">
            <th className="px-4 py-3 font-medium">پلن</th>
            <th className="px-4 py-3 font-medium">کانفیگ</th>
            <th className="px-4 py-3 font-medium">وضعیت</th>
            <th className="px-4 py-3 font-medium">خریدار</th>
            <th className="px-4 py-3 font-medium">تاریخ ورود</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stroke/70">
          {visibleAccounts.map((account) => (
            <tr key={account.id} className="align-top text-prose">
              <td className="px-4 py-4">{account.plan.name}</td>
              <td className="px-4 py-4 font-mono text-xs text-prose">
                {truncateConfig(account.config, 100)}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    account.status === "available"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                  }`}
                >
                  {account.status === "available" ? "موجود" : "فروخته‌شده"}
                </span>
              </td>
              <td className="px-4 py-4 text-faint">{account.order?.userId ?? "-"}</td>
              <td className="px-4 py-4 text-faint">{formatTableDateTime(account.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTableDateTime(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
