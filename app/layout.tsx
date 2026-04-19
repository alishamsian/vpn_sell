import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { ToastProvider } from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "فروش VPN",
  description: "فروش امن اکانت‌های آماده VPN با داشبورد ساده و فارسی.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ToastProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
              <div className="flex items-center justify-between py-4">
                <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
                  فروش VPN
                </Link>

                <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
                  <Link
                    href="/"
                    className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    خانه
                  </Link>
                  <Link
                    href="/admin"
                    className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    ادمین
                  </Link>
                </nav>
              </div>
            </header>

            <main className="flex-1 py-10">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
