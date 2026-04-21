import type { ReactNode } from "react";

import { AdminMobileChatDock } from "@/components/admin/admin-mobile-chat-dock";
import { AdminMobileBottomBar, AdminSidebar } from "@/components/admin/admin-sidebar";
import { getSession, requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const overview = await getAdminOverview();
  const session = await getSession();

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {session ? <AdminMobileChatDock session={{ sub: session.sub, role: "ADMIN" }} /> : null}
      <AdminMobileBottomBar
        adminName={admin.name}
        adminEmail={admin.email}
        stats={{
          pendingPayments: overview.pendingPayments,
          unreadAdminChats: overview.unreadAdminChats,
          usersCount: overview.usersCount,
        }}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <AdminSidebar
            adminName={admin.name}
            adminEmail={admin.email}
            stats={{
              pendingPayments: overview.pendingPayments,
              unreadAdminChats: overview.unreadAdminChats,
              usersCount: overview.usersCount,
            }}
          />
        </div>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
