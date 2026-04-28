"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, LayoutDashboard, LogIn, Package2, Shield, ShoppingBag, UserPlus } from "lucide-react";

type SessionLike = {
  role: "USER" | "ADMIN";
} | null;

export function MobileBottomNav({
  session,
  logoutSlot,
}: {
  session: SessionLike;
  logoutSlot: ReactNode;
}) {
  const pathname = usePathname();

  // ادمین نوبار اختصاصی خودش را دارد (داخل app/admin/layout.tsx)
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden" data-mobile-bottom-nav>
      <div className="rounded-shell border border-stroke/80 bg-panel/92 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-stroke/80 dark:bg-slate-900/92 dark:shadow-black/40">
        <div className="grid grid-cols-4 gap-2">
          <MobileNavLink href="/" label="خانه" icon={Home} active={pathname === "/"} />

          {session ? (
            <>
              <MobileNavLink
                href="/dashboard"
                label="داشبورد"
                icon={LayoutDashboard}
                active={pathname.startsWith("/dashboard")}
              />
              {session.role === "ADMIN" ? (
                <MobileNavLink href="/admin" label="ادمین" icon={Shield} active={false} />
              ) : (
                <MobileNavLink href="/" label="سفارش" icon={ShoppingBag} active={false} />
              )}
              {logoutSlot}
            </>
          ) : (
            <>
              <MobileNavLink href="/login" label="ورود" icon={LogIn} active={pathname === "/login"} />
              <MobileNavLink href="/register" label="ثبت‌نام" icon={UserPlus} active={pathname === "/register"} />
              <MobileNavLink href="/" label="پلن‌ها" icon={Package2} active={false} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition ${
        active
          ? "bg-slate-950 text-white dark:bg-elevated dark:text-ink"
          : "text-prose hover:bg-inset hover:text-ink dark:text-faint dark:hover:bg-slate-800 dark:hover:text-slate-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

