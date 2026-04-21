"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, LayoutDashboard, LogIn, LogOut, Package2, Shield, ShoppingBag, UserPlus } from "lucide-react";

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
    <div className="fixed inset-x-4 bottom-4 z-30 sm:hidden">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur">
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
        active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

