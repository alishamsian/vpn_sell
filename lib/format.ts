export function formatPrice(price: number) {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
  }).format(price)} تومان`;
}

export function formatDuration(days: number) {
  return `${new Intl.NumberFormat("fa-IR").format(days)} روز`;
}

export function formatUserLimit(limit: number | null | undefined) {
  if (limit == null) {
    return "بدون محدودیت";
  }

  return `${new Intl.NumberFormat("fa-IR").format(limit)} کاربر`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function getExpiryStatus(date: Date | string | null | undefined) {
  if (!date) {
    return "unknown" as const;
  }

  const expiresAt = typeof date === "string" ? new Date(date) : date;
  const remainingMs = expiresAt.getTime() - Date.now();

  if (remainingMs <= 0) {
    return "expired" as const;
  }

  if (remainingMs <= 1000 * 60 * 60 * 24 * 7) {
    return "expiringSoon" as const;
  }

  return "active" as const;
}

export function formatRemainingDays(date: Date | string | null | undefined) {
  if (!date) {
    return null;
  }

  const expiresAt = typeof date === "string" ? new Date(date) : date;
  const remainingMs = expiresAt.getTime() - Date.now();

  if (remainingMs <= 0) {
    return "منقضی شده";
  }

  const days = Math.max(Math.ceil(remainingMs / (1000 * 60 * 60 * 24)), 1);
  return `${new Intl.NumberFormat("fa-IR").format(days)} روز مانده`;
}

export function truncateConfig(config: string, maxLength = 80) {
  if (config.length <= maxLength) {
    return config;
  }

  return `${config.slice(0, maxLength)}...`;
}
