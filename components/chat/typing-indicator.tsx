"use client";

type TypingIndicatorProps = {
  active: boolean;
  label?: string;
};

export function TypingIndicator({
  active,
  label = "به‌روزرسانی زنده گفتگو فعال است",
}: TypingIndicatorProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-500" />
      </span>
      {label}
    </div>
  );
}
