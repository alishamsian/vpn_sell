import type { Metadata } from "next";
import {
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { logoutAction } from "@/app/(auth)/actions";
import { FloatingChatEntry } from "@/components/chat/floating-chat-entry";
import { FloatingChatGuestWidget } from "@/components/chat/floating-chat-guest-widget";
import { ChatLauncherVisibility } from "@/components/chat-launcher-visibility";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ToastProvider } from "@/components/toast-provider";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "فروش VPN",
    template: "%s | فروش VPN",
  },
  description: "فروش امن اکانت‌های آماده VPN با داشبورد ساده و فارسی.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getSession();
  const currentYear = new Date().getFullYear();

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-24 sm:px-6 sm:pb-0 lg:px-8">
            <header className="sticky top-0 z-20 pt-4">
              <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 px-4 py-4 shadow-soft backdrop-blur sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center justify-between gap-4 lg:justify-start">
                    <Link href="/" className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-slate-950">
                          فروش VPN
                        </div>
                        <div className="text-xs text-slate-500">
                          خرید امن، تحویل شفاف، پنل فارسی
                        </div>
                      </div>
                    </Link>

                    <div className="hidden items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 lg:flex">
                      پشتیبانی و بررسی سفارش فعال
                    </div>
                  </div>

                  <nav className="hidden flex-wrap items-center justify-start gap-2 text-sm font-medium text-slate-600 sm:flex lg:justify-end">
                    <HeaderNavLink href="/" label="خانه" icon={Home} />

                    {session ? (
                      <>
                        <HeaderNavLink href="/dashboard" label="داشبورد" icon={LayoutDashboard} />
                        {session.role === "ADMIN" ? (
                          <HeaderNavLink href="/admin" label="ادمین" icon={Shield} />
                        ) : null}
                        <form action={logoutAction}>
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-center transition hover:border-slate-300 hover:text-slate-950 sm:w-auto"
                          >
                            <LogOut className="h-4 w-4" />
                            خروج
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <HeaderNavLink href="/login" label="ورود" icon={LogIn} />
                        <HeaderPrimaryLink href="/register" label="ثبت‌نام" icon={UserPlus} />
                      </>
                    )}
                  </nav>
                </div>
              </div>
            </header>

            <main className="flex-1 py-10">{children}</main>

            <footer className="pb-6 pt-2">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-soft">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))]">
                  <div className="space-y-4">
                    <div>
                    <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                      <ShieldCheck className="h-5 w-5 text-sky-300" />
                      فروش VPN
                    </div>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                        سفارش را ثبت کن، رسید را ارسال کن و بعد از تایید، کانفیگ را امن و مستقیم
                        داخل پنل کاربری تحویل بگیر.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        موجودی واقعی
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        تحویل امن
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        داشبورد حرفه‌ای
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">دسترسی سریع</div>
                    <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                      <Link href="/" className="transition hover:text-white">
                        صفحه اصلی
                      </Link>
                      <Link href="/dashboard" className="transition hover:text-white">
                        داشبورد کاربری
                      </Link>
                      {session?.role === "ADMIN" ? (
                        <Link href="/admin" className="transition hover:text-white">
                          پنل ادمین
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">شروع سریع</div>
                    <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
                      <Link href={session ? "/" : "/register"} className="transition hover:text-white">
                        {session ? "ثبت سفارش جدید" : "ساخت حساب کاربری"}
                      </Link>
                      <Link href={session ? "/dashboard" : "/login"} className="transition hover:text-white">
                        {session ? "پیگیری سفارش‌ها" : "ورود به حساب"}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-400">
                  <div>© {currentYear} فروش VPN. همه حقوق محفوظ است.</div>
                  <div>طراحی شده برای خرید ساده، امن و فارسی</div>
                </div>
              </div>
            </footer>
          </div>
          <MobileBottomNav
            session={session ? { role: session.role } : null}
            logoutSlot={
              session ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <LogOut className="h-4 w-4" />
                    خروج
                  </button>
                </form>
              ) : null
            }
          />
          {session ? (
            <ChatLauncherVisibility session={{ role: session.role }}>
              <FloatingChatEntry session={session} />
            </ChatLauncherVisibility>
          ) : (
            <FloatingChatGuestWidget />
          )}
        </ToastProvider>
      </body>
    </html>
  );
}

function HeaderNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-center transition hover:border-slate-300 hover:text-slate-950 sm:w-auto"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function HeaderPrimaryLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Home;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-center text-white transition hover:bg-slate-800 sm:w-auto"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
