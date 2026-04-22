"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { startTransition, useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-flex aspect-square w-10 shrink-0 items-center justify-center rounded-full border border-stroke bg-panel opacity-0 sm:aspect-auto sm:min-h-[2.5rem] sm:min-w-[5.5rem] dark:border-stroke dark:bg-slate-800"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn-outline-sm aspect-square w-10 max-w-none justify-center gap-0 px-0 sm:aspect-auto sm:min-w-[5.5rem] sm:gap-2 sm:px-4"
      aria-label={isDark ? "فعال‌سازی حالت روشن" : "فعال‌سازی حالت تاریک"}
      title={isDark ? "حالت روشن" : "حالت تاریک"}
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" aria-hidden /> : <Moon className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="hidden sm:inline">{isDark ? "روشن" : "تاریک"}</span>
    </button>
  );
}
