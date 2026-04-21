"use client";

import type { ReactNode } from "react";

export function ChatLauncherVisibility({
  session,
  children,
}: {
  session: { role: "USER" | "ADMIN" } | null;
  children: ReactNode;
}) {
  if (!session) {
    return null;
  }

  // برای ادمین‌ها، ویجت شناور چت فقط از داخل app/admin/layout.tsx رندر می‌شود
  // تا دقیقاً بالای نوبار پایین موبایل قرار بگیرد.
  if (session.role === "ADMIN") {
    return null;
  }

  return children;
}
