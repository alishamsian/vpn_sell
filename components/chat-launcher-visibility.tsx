"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function ChatLauncherVisibility({
  session,
  children,
}: {
  session: { role: "USER" | "ADMIN" } | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (!session) {
    return null;
  }

  // برای ادمین‌ها، ویجت شناور چت فقط از داخل app/admin/layout.tsx رندر می‌شود
  // تا دقیقاً بالای نوبار پایین موبایل قرار بگیرد.
  if (session.role === "ADMIN") {
    if (pathname.startsWith("/admin")) {
      return null;
    }
  }

  return children;
}
