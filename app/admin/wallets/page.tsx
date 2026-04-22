import Link from "next/link";

import { AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-ui";
import { AdminWalletAdjuster } from "@/components/admin/admin-wallets-manager";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminWalletsPageProps = {
  searchParams?: Promise<{
    q?: string;
    u?: string;
  }>;
};

export default async function AdminWalletsPage({ searchParams }: AdminWalletsPageProps) {
  await requireAdmin();
  const resolved = searchParams ? await searchParams : undefined;
  const q = (resolved?.q ?? "").trim();
  const selectedUserId = (resolved?.u ?? "").trim();

  const users =
    q.length >= 3
      ? await prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, phone: true },
        })
      : [];

  const selectedUser = selectedUserId
    ? await prisma.user.findUnique({
        where: { id: selectedUserId },
        select: { id: true, name: true, email: true, phone: true },
      })
    : null;

  const wallet = selectedUserId
    ? await prisma.wallet.findUnique({
        where: { userId: selectedUserId },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 30,
          },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="کیف‌پول"
        title="اعتبار کاربران"
        description="کاربر را جستجو کنید، موجودی کیف‌پول و تراکنش‌ها را ببینید و تنظیم دستی (adjust) انجام دهید."
      />

      <AdminSectionCard title="جستجو">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <div className="text-xs font-medium text-faint">ایمیل / موبایل / نام</div>
            <input
              name="q"
              defaultValue={q}
              placeholder="مثلاً ali@example.com"
              className="w-full rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            />
          </label>
          <button type="submit" className="btn-brand">
            جستجو
          </button>
        </form>

        {users.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/admin/wallets?q=${encodeURIComponent(q)}&u=${encodeURIComponent(user.id)}`}
                className="rounded-2xl border border-stroke bg-panel px-4 py-3 text-sm text-prose transition hover:bg-elevated hover:text-ink"
              >
                <div className="font-medium text-ink">{user.name}</div>
                <div className="mt-1 text-xs text-faint">
                  {user.email ?? "-"} · {user.phone ?? "-"}
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </AdminSectionCard>

      {selectedUser ? (
        <AdminSectionCard
          title={`کیف‌پول: ${selectedUser.name}`}
          description={selectedUser.email ?? selectedUser.phone ?? undefined}
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-stroke bg-panel p-4">
              <div className="text-xs font-medium text-faint">موجودی فعلی</div>
              <div className="mt-2 text-2xl font-semibold text-ink">
                {new Intl.NumberFormat("fa-IR").format(Number(wallet?.balance ?? 0))}
              </div>
            </div>

            <AdminWalletAdjuster userId={selectedUser.id} />

            <div className="overflow-hidden rounded-2xl border border-stroke">
              <table className="w-full text-sm">
                <thead className="bg-inset text-faint">
                  <tr className="text-right">
                    <th className="px-4 py-3 font-medium">نوع</th>
                    <th className="px-4 py-3 font-medium">مبلغ</th>
                    <th className="px-4 py-3 font-medium">دلیل</th>
                    <th className="px-4 py-3 font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke/70 bg-panel">
                  {(wallet?.transactions ?? []).map((tx) => (
                    <tr key={tx.id} className="text-prose">
                      <td className="px-4 py-3">{tx.type}</td>
                      <td className="px-4 py-3">{tx.amount.toString()}</td>
                      <td className="px-4 py-3">{tx.reason}</td>
                      <td className="px-4 py-3">{tx.createdAt.toLocaleString("fa-IR")}</td>
                    </tr>
                  ))}
                  {(wallet?.transactions ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-faint">
                        تراکنشی ثبت نشده است.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSectionCard>
      ) : null}
    </div>
  );
}

