import type { ReactNode } from "react";

type SeriesPoint = {
  day: string; // YYYY-MM-DD
  value: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDayLabel(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(date);
}

export function MiniLegend({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; tone?: "slate" | "emerald" | "amber" | "rose" | "sky" }>;
}) {
  const toneClass = (tone?: string) =>
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "rose"
          ? "bg-rose-500"
          : tone === "sky"
            ? "bg-sky-500"
            : "bg-slate-500";

  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${toneClass(item.tone)}`} />
          <span className="text-slate-500">{item.label}</span>
          <span className="font-semibold text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SparkLine({
  data,
  tone = "sky",
}: {
  data: SeriesPoint[];
  tone?: "sky" | "emerald" | "amber" | "rose" | "slate";
}) {
  const width = 640;
  const height = 140;
  const paddingX = 8;
  const paddingY = 10;

  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = Math.max(1, max - min);

  const xFor = (idx: number) =>
    paddingX + (idx * (width - paddingX * 2)) / Math.max(1, data.length - 1);
  const yFor = (value: number) =>
    paddingY + ((max - value) * (height - paddingY * 2)) / range;

  const points = data.map((d, idx) => `${xFor(idx)},${yFor(d.value)}`).join(" ");
  const areaPoints = `${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`;

  const toneStroke =
    tone === "emerald"
      ? "stroke-emerald-600"
      : tone === "amber"
        ? "stroke-amber-600"
        : tone === "rose"
          ? "stroke-rose-600"
          : tone === "slate"
            ? "stroke-slate-700"
            : "stroke-sky-600";

  const toneFill =
    tone === "emerald"
      ? "fill-emerald-500/12"
      : tone === "amber"
        ? "fill-amber-500/12"
        : tone === "rose"
          ? "fill-rose-500/12"
          : tone === "slate"
            ? "fill-slate-500/10"
            : "fill-sky-500/12";

  const labelEvery = Math.max(1, Math.round(data.length / 6));
  const xLabels = data
    .map((d, idx) => ({ d, idx }))
    .filter(({ idx }) => idx % labelEvery === 0 || idx === data.length - 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[9rem] w-full" preserveAspectRatio="none">
        <polygon points={areaPoints} className={`${toneFill}`} />
        <polyline points={points} className={`fill-none ${toneStroke}`} strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-500">
        {xLabels.map(({ d, idx }) => (
          <div key={`${d.day}-${idx}`} className="tabular-nums">
            {formatDayLabel(d.day)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  items,
}: {
  items: Array<{ label: string; value: number; tone: "emerald" | "amber" | "rose" | "slate" | "sky" }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const strokeFor = (tone: string) =>
    tone === "emerald"
      ? "#10b981"
      : tone === "amber"
        ? "#f59e0b"
        : tone === "rose"
          ? "#f43f5e"
          : tone === "slate"
            ? "#64748b"
            : "#0ea5e9";

  return (
    <div className="grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="relative h-[110px] w-[110px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {items.map((item) => {
            const fraction = item.value / total;
            const dash = fraction * circumference;
            const dashOffset = circumference - offset;
            offset += dash;
            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={strokeFor(item.tone)}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="text-xs text-slate-500">جمع</div>
          <div className="text-lg font-semibold text-slate-950">{new Intl.NumberFormat("fa-IR").format(total)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const percent = clamp(Math.round((item.value / total) * 100), 0, 100);
          return (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: strokeFor(item.tone) }}
                />
                <span className="text-slate-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{new Intl.NumberFormat("fa-IR").format(item.value)}</span>
                <span>({percent}٪)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BarsList({
  items,
  valueLabel,
}: {
  items: Array<{ label: string; value: number; tone?: "sky" | "emerald" | "amber" | "rose" | "slate" }>;
  valueLabel: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const toneClass = (tone?: string) =>
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : tone === "rose"
          ? "bg-rose-500"
          : tone === "slate"
            ? "bg-slate-600"
            : "bg-sky-500";

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = clamp((item.value / max) * 100, 0, 100);
        return (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-sm font-medium text-slate-950">{item.label}</div>
              <div className="shrink-0 text-xs font-semibold text-slate-700">{valueLabel(item.value)}</div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${toneClass(item.tone)}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

