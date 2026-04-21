import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Home, LayoutDashboard, LogIn, LogOut, Shield, UserPlus } from "lucide-react";
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
import { BrandLogo } from "@/components/brand-logo";

const brandWordmark = Outfit({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VPN Alish",
    template: "%s | VPN Alish",
  },
  description: "وی‌پی‌ان آلیش — خرید امن اکانت آماده با داشبورد فارسی و پشتیبانی.",
  applicationName: "VPN Alish",
  icons: {
    icon: [{ url: "/vpn-alish-logo.png", type: "image/png" }],
    shortcut: "/vpn-alish-logo.png",
    apple: [{ url: "/vpn-alish-logo.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "VPN Alish",
    title: "VPN Alish",
    description: "خرید امن اکانت آماده با داشبورد فارسی و پشتیبانی.",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "VPN Alish",
    description: "خرید امن اکانت آماده با داشبورد فارسی و پشتیبانی.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#050a18" },
  ],
  colorScheme: "light",
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
              <div className="rounded-shell border border-slate-200/80 bg-white/90 px-4 py-4 shadow-soft backdrop-blur-sm sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center justify-between gap-4 lg:justify-start">
                    <Link href="/" className="flex min-w-0 items-center gap-3">
                      <div className="relative shrink-0 rounded-2xl bg-brand-ink p-2 shadow-lg shadow-cyan-500/10 ring-1 ring-white/10 sm:p-2.5">
                        <BrandLogo
                          width={200}
                          height={72}
                          priority
                          className="max-h-9 w-auto max-w-[min(9.5rem,42vw)] sm:max-h-10 sm:max-w-[11rem]"
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          dir="ltr"
                          className={`${brandWordmark.className} truncate bg-gradient-to-r from-slate-900 via-cyan-800 to-slate-900 bg-clip-text text-lg font-semibold leading-none tracking-[-0.04em] text-transparent sm:text-2xl sm:font-bold sm:tracking-[-0.05em]`}
                        >
                          VPN Alish
                        </div>
                      </div>
                    </Link>

                    <div className="hidden items-center gap-2 rounded-full border border-cyan-500/25 bg-gradient-to-l from-cyan-500/10 to-amber-500/10 px-3 py-1.5 text-xs font-medium text-cyan-900 lg:flex">
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-center transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 sm:w-auto"
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
              <div className="rounded-shell border border-white/10 bg-brand-ink px-6 py-8 text-white shadow-soft shadow-cyan-950/20">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))]">
                  <div className="space-y-4">
                    <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-xl bg-black/25 p-2 ring-1 ring-white/10">
                        <BrandLogo width={200} height={72} className="max-h-10 w-auto max-w-[12rem]" />
                      </div>
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
                  <div>
                    © {currentYear}{" "}
                    <span dir="ltr" className="font-medium tracking-tight text-slate-200">
                      VPN Alish
                    </span>
                    . همه حقوق محفوظ است.
                  </div>
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-center transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/30 focus-visible:ring-offset-2 sm:w-auto"
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
      className="btn-brand-sm w-full sm:w-auto"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
