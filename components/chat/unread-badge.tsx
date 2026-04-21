"use client";

type UnreadBadgeProps = {
  count: number;
};

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white">
      {new Intl.NumberFormat("fa-IR").format(count)}
    </span>
  );
}
