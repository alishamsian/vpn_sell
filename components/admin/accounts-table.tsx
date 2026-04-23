"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { truncateConfig } from "@/lib/format";
import { getAdminAccounts } from "@/lib/queries";
import { AdminTableEmptyState } from "@/components/admin/admin-ui";

type AccountsTableProps = {
  accounts: Awaited<ReturnType<typeof getAdminAccounts>>;
  limit?: number;
};

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function AccountsTable({ accounts, limit }: AccountsTableProps) {
  const [query, setQuery] = useState("");
  const baseList = typeof limit === "number" ? accounts.slice(0, limit) : accounts;

  const filtered = useMemo(() => {
    const q = normalizeDigits(query.trim().toLowerCase());
    if (!q) {
      return baseList;
    }
    return baseList.filter((account) => {
      const haystack = normalizeDigits(
        [
          account.plan.name,
          account.id,
          account.config,
          account.status,
          account.order?.userId ?? "",
          account.order?.id ?? "",
        ]
          .join(" ")
          .toLowerCase(),
      );
      return haystack.includes(q);
    });
  }, [baseList, query]);

  if (accounts.length === 0) {
    return <AdminTableEmptyState label="هنوز هیچ اکانتی وارد نشده است." />;
  }

  return (
    <div className="space-y-4">
      <div className="admin-glass-panel p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-faint">
            جستجو روی پلن، شناسه اکانت، بخشی از کانفیگ، وضعیت و شناسهٔ خریدار.
          </p>
          <div className="text-xs tabular-nums text-faint">
            {new Intl.NumberFormat("fa-IR").format(filtered.length)} از{" "}
            {new Intl.NumberFormat("fa-IR").format(baseList.length)} ردیف
          </div>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در اکانت‌ها…"
            className="w-full rounded-2xl border border-stroke/80 bg-white/70 py-3 ps-10 pe-10 text-sm outline-none backdrop-blur-sm transition placeholder:text-faint focus:border-sky-400/50 focus:ring-2 focus:ring-brand-cyan/20 dark:border-slate-600/40 dark:bg-slate-950/40"
            aria-label="جستجوی اکانت"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-faint transition hover:bg-inset hover:text-ink"
              aria-label="پاک کردن جستجو"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-glass-panel border-dashed px-4 py-10 text-center text-sm text-faint">
          اکانتی با این عبارت پیدا نشد.
        </div>
      ) : (
        <div className="admin-glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stroke/60 text-right text-sm">
              <thead>
                <tr className="bg-white/40 text-faint backdrop-blur-sm dark:bg-slate-950/30">
                  <th className="px-4 py-3 font-medium">پلن</th>
                  <th className="px-4 py-3 font-medium">کانفیگ</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">خریدار</th>
                  <th className="px-4 py-3 font-medium">تاریخ ورود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke/50">
                {filtered.map((account) => (
                  <tr key={account.id} className="align-top text-prose transition hover:bg-white/35 dark:hover:bg-slate-800/25">
                    <td className="px-4 py-4 font-medium text-ink">{account.plan.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-prose">
                      {truncateConfig(account.config, 100)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${
                          account.status === "available"
                            ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-400/35 dark:text-emerald-200"
                            : "bg-amber-500/15 text-amber-900 ring-1 ring-amber-400/35 dark:text-amber-100"
                        }`}
                      >
                        {account.status === "available" ? "موجود" : "فروخته‌شده"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-faint">{account.order?.userId ?? "—"}</td>
                    <td className="px-4 py-4 text-faint">{formatTableDateTime(account.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTableDateTime(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
