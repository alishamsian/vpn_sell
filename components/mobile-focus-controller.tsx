"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MOBILE_FOCUS_DATASET_KEY = "mobileFocus";
const PAYMENT_OPEN_DATASET_KEY = "paymentOpen";

function isFocusRoute(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/forgot-password")) return true;
  if (pathname.startsWith("/reset-password")) return true;
  if (pathname.startsWith("/dashboard")) return true;
  return false;
}

export function MobileFocusController() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const enabled = isFocusRoute(pathname);

    if (enabled) {
      html.dataset[MOBILE_FOCUS_DATASET_KEY] = "1";
    } else {
      delete html.dataset[MOBILE_FOCUS_DATASET_KEY];
    }

    // اگر مودال پرداخت از قبل باز بوده و route عوض شده، فلگ را پاک کنیم
    if (!enabled) {
      delete html.dataset[PAYMENT_OPEN_DATASET_KEY];
    }
  }, [pathname]);

  return null;
}

