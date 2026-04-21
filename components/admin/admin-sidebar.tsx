"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  Package2,
  Users,
  X,
} from "lucide-react";

import { BrandMark } from "@/components/brand-logo";

type AdminSidebarProps = {
  adminName: string;
  adminEmail: string | null;
  stats: {
    pendingPayments: number;
    unreadAdminChats: number;
    usersCount: number;
  };
};

type AdminSidebarStatKey = keyof AdminSidebarProps["stats"];

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: AdminSidebarStatKey;
  match: (pathname: string) => boolean;
};

const navigationItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "نمای کلی",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/admin",
  },
  {
    href: "/admin/payments",
    label: "پرداخت‌ها",
    icon: CreditCard,
    badgeKey: "pendingPayments",
    match: (pathname: string) => pathname.startsWith("/admin/payments"),
  },
  {
    href: "/admin/catalog",
    label: "پلن و موجودی",
    icon: Package2,
    match: (pathname: string) => pathname.startsWith("/admin/catalog"),
  },
  {
    href: "/admin/chat",
    label: "گفت‌وگوها",
    icon: MessageSquareText,
    badgeKey: "unreadAdminChats",
    match: (pathname: string) => pathname.startsWith("/admin/chat"),
  },
  {
    href: "/admin/users",
    label: "کاربران",
    icon: Users,
    badgeKey: "usersCount",
    match: (pathname: string) => pathname.startsWith("/admin/users"),
  },
  {
    href: "/admin/reports",
    label: "گزارش‌ها",
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith("/admin/reports"),
  },
];

export function AdminSidebar({ adminName, adminEmail, stats }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-soft">
        <div className="border-b border-slate-200/80 p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <BrandMark className="h-3.5 w-auto max-w-[3.25rem] opacity-90" />
            دسترسی ادمین فعال
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-950">{adminName}</div>
          <div className="mt-1 text-sm text-slate-500">{adminEmail ?? "ادمین سایت"}</div>
        </div>

        <nav className="p-3">
          <div className="space-y-1.5">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;
              const badgeValue = item.badgeKey ? stats[item.badgeKey] : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                        isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </span>

                  {typeof badgeValue === "number" && badgeValue > 0 ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        isActive ? "bg-white/10 text-white" : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {new Intl.NumberFormat("fa-IR").format(badgeValue)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="text-xs font-medium text-slate-500">خلاصه سریع</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <QuickStat label="نیازمند بررسی" value={stats.pendingPayments} />
          <QuickStat label="پیام خوانده‌نشده" value={stats.unreadAdminChats} />
          <QuickStat label="کاربران" value={stats.usersCount} />
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileBottomBar({ adminName, adminEmail, stats }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const shortItems: AdminNavItem[] = [
    navigationItems[0], // /admin
    navigationItems[1], // /admin/payments
    navigationItems[2], // /admin/catalog
    navigationItems[3], // /admin/chat
  ].filter(Boolean) as AdminNavItem[];

  return (
    <>
      <div className="fixed inset-x-4 bottom-4 z-[95] sm:hidden" dir="rtl">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <LayoutDashboard className="h-4 w-4" />
              منو
            </button>

            {shortItems.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;
              const badgeValue = item.badgeKey ? stats[item.badgeKey] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition ${
                    isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {typeof badgeValue === "number" && badgeValue > 0 ? (
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${
                        isActive ? "bg-white/15 text-white" : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {new Intl.NumberFormat("fa-IR").format(badgeValue)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <AdminNavDrawer
        open={open}
        onClose={() => setOpen(false)}
        adminName={adminName}
        adminEmail={adminEmail}
        stats={stats}
        pathname={pathname}
      />
    </>
  );
}

function AdminNavDrawer({
  open,
  onClose,
  adminName,
  adminEmail,
  stats,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  adminName: string;
  adminEmail: string | null;
  stats: AdminSidebarProps["stats"];
  pathname: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4" dir="rtl">
      <button
        type="button"
        aria-label="بستن منو"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <BrandMark className="h-3.5 w-auto max-w-[3.25rem] opacity-90" />
              دسترسی ادمین فعال
            </div>
            <div className="mt-3 truncate text-base font-semibold text-slate-950">{adminName}</div>
            <div className="mt-1 truncate text-xs text-slate-500">{adminEmail ?? "ادمین سایت"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(80dvh,40rem)] overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const isActive = item.match(pathname);
              const Icon = item.icon;
              const badgeValue = item.badgeKey ? stats[item.badgeKey] : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                        isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </span>

                  {typeof badgeValue === "number" && badgeValue > 0 ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        isActive ? "bg-white/10 text-white" : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {new Intl.NumberFormat("fa-IR").format(badgeValue)}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium text-slate-500">خلاصه سریع</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <QuickStat label="نیازمند بررسی" value={stats.pendingPayments} />
              <QuickStat label="پیام خوانده‌نشده" value={stats.unreadAdminChats} />
              <QuickStat label="کاربران" value={stats.usersCount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">
        {new Intl.NumberFormat("fa-IR").format(value)}
      </div>
    </div>
  );
}
