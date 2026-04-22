import { Globe2, Loader2, Lock, Server } from "lucide-react";
import type { ReactNode } from "react";

type AppLoadingScreenProps = {
  message?: string;
  variant?: "page" | "section";
};

const DEFAULT_PAGE_MESSAGE = "در حال برقراری اتصال امن به شبکه…";
const DEFAULT_INLINE_MESSAGE = "در حال اتصال به سرور…";

/**
 * لودینگ تمام‌عرض — تم VPN / سرور / اتصال.
 */
export function AppLoadingScreen({ message = DEFAULT_PAGE_MESSAGE, variant = "page" }: AppLoadingScreenProps) {
  const heightClass =
    variant === "page"
      ? "min-h-[min(440px,calc(100dvh-11rem))] py-16"
      : "min-h-[170px] py-10 sm:min-h-[210px]";

  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-6 ${heightClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-6 sm:max-w-sm">
        <VpnConnectionVisual size="md" />

        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-cyan-800">
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="font-mono lowercase">vpn_alish</span>
        </div>

        <p className="text-center text-[13px] font-medium leading-relaxed text-prose">{message}</p>

        <AppLoadingDots />
      </div>
    </div>
  );
}

/**
 * لودینگ فشرده — همان مفهوم اتصال، در کارت کوچک‌تر.
 */
export function AppLoadingInline({ message = DEFAULT_INLINE_MESSAGE }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-stroke/90 bg-panel px-5 py-7 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <VpnConnectionVisual size="sm" />
      <p className="text-center text-xs font-medium text-prose">{message}</p>
      <AppLoadingDots />
    </div>
  );
}

/** دستگاه → تونل (بستهٔ داده) → شبکه */
function VpnConnectionVisual({ size }: { size: "sm" | "md" }) {
  const iconClass = size === "sm" ? "h-5 w-5 text-faint" : "h-7 w-7 text-faint";
  const tunnelClass =
    size === "sm"
      ? "relative h-1.5 w-[5.5rem] overflow-hidden rounded-full bg-elevated"
      : "relative h-2 w-[6.75rem] overflow-hidden rounded-full bg-elevated sm:w-36";

  return (
    <div
      dir="ltr"
      className="flex items-center justify-center gap-2.5 sm:gap-3"
      aria-hidden
      title="اتصال امن"
    >
      <Server className={`${iconClass} shrink-0`} strokeWidth={1.75} />
      <div className={tunnelClass}>
        <span className="app-loading-packet absolute top-1/2 block rounded-full shadow-[0_0_10px_rgba(0,168,255,0.55)]" />
      </div>
      <Globe2 className={`${iconClass} shrink-0`} strokeWidth={1.75} />
    </div>
  );
}

/** میله‌های سیگنال — حس «برقراری اتصال» */
export function AppLoadingDots({ className = "" }: { className?: string }) {
  const heights = [6, 9, 12, 8];
  return (
    <div className={`flex h-5 items-end justify-center gap-0.5 ${className}`} aria-hidden>
      {heights.map((px, i) => (
        <span
          key={i}
          className="app-loading-signal w-[3px] rounded-sm bg-faint"
          style={{ height: `${px}px`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function AppLoadingSpinner({ className = "h-4 w-4", label }: { className?: string; label?: string }) {
  return (
    <Loader2
      className={`shrink-0 animate-spin ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label ?? undefined}
    />
  );
}

export function AppLoadingButtonLabel({
  pending,
  idleLabel,
  pendingLabel,
  spinnerClassName = "h-4 w-4",
}: {
  pending: boolean;
  idleLabel: ReactNode;
  pendingLabel: ReactNode;
  spinnerClassName?: string;
}) {
  if (!pending) {
    return idleLabel;
  }

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <AppLoadingSpinner className={spinnerClassName} />
      {pendingLabel}
    </span>
  );
}
