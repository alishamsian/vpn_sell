"use client";

import {
  AlignLeft,
  Check,
  ChevronDown,
  Layers,
  PackagePlus,
  Rows3,
  Search,
  Trash2,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useFormStatus } from "react-dom";

import { addAccountsAction } from "@/app/admin/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";
import { AppLoadingButtonLabel } from "@/components/ui/app-loading";
import {
  ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE,
  ADMIN_BULK_ACCOUNT_MAX_LINES,
} from "@/lib/admin-inventory-limits";
import type { AdminPlanDashboard } from "@/lib/queries";

type AdminInventoryPanelProps = {
  plans: AdminPlanDashboard[];
};

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function nf(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function SubmitButton({
  idleLabel,
  pendingLabel,
  disabled,
}: {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-brand inline-flex min-w-[12rem] items-center justify-center disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 disabled:hover:bg-slate-950 dark:disabled:hover:bg-slate-100"
    >
      <AppLoadingButtonLabel
        pending={pending}
        idleLabel={idleLabel}
        pendingLabel={pendingLabel}
        spinnerClassName="h-4 w-4 text-white dark:text-slate-950"
      />
    </button>
  );
}

function FormMessage({ status, message }: { status: AdminActionState["status"]; message: string }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm ${
        status === "success"
          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : status === "error"
            ? "bg-rose-500/10 text-rose-800 dark:text-rose-200"
            : "text-faint"
      }`}
    >
      {message}
    </p>
  );
}

type ConfigLine = { id: string; value: string };

function createLine(value = ""): ConfigLine {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    value,
  };
}

function ConfigRowsEditor({
  editorKey,
  seedText,
  onJoinedChange,
}: {
  editorKey: number;
  seedText: string;
  onJoinedChange: (joined: string) => void;
}) {
  const baseId = useId();
  const [lines, setLines] = useState<ConfigLine[]>(() => [createLine()]);
  const pendingFocusLineId = useRef<string | null>(null);

  useEffect(() => {
    const parts = seedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    setLines(parts.length > 0 ? parts.map((value) => createLine(value)) : [createLine()]);
  }, [editorKey, seedText]);

  useEffect(() => {
    const targetId = pendingFocusLineId.current;
    if (!targetId) {
      return;
    }
    pendingFocusLineId.current = null;
    window.requestAnimationFrame(() => {
      document.getElementById(`${baseId}-${targetId}`)?.focus();
    });
  }, [baseId, lines]);

  const joinedConfigs = useMemo(
    () =>
      lines
        .map((line) => line.value.trim())
        .filter(Boolean)
        .join("\n"),
    [lines],
  );

  useEffect(() => {
    onJoinedChange(joinedConfigs);
  }, [joinedConfigs, onJoinedChange]);

  const setLineValue = (id: string, value: string) => {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, value } : line)));
  };

  const addLine = () => {
    setLines((current) => {
      const nextLine = createLine();
      pendingFocusLineId.current = nextLine.id;
      return [...current, nextLine];
    });
  };

  const removeLine = (id: string) => {
    setLines((current) => {
      if (current.length <= 1) {
        return [createLine()];
      }
      return current.filter((line) => line.id !== id);
    });
  };

  const handlePaste = (id: string, pastedText: string) => {
    const parts = pastedText
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      return;
    }

    setLines((current) => {
      const index = current.findIndex((line) => line.id === id);
      if (index === -1) {
        return current;
      }
      const next = [...current];
      next[index] = { ...next[index], value: parts[0] ?? "" };
      const tail = parts.slice(1).map((value) => createLine(value));
      next.splice(index + 1, 0, ...tail);
      return next;
    });
  };

  const handleLineKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (index === lines.length - 1) {
      addLine();
      return;
    }
    const nextId = lines[index + 1]?.id;
    if (nextId) {
      pendingFocusLineId.current = nextId;
    }
  };

  const nonEmptyCount = lines.reduce((count, line) => (line.value.trim() ? count + 1 : count), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink">کانفیگ‌ها (هر باکس یک اکانت)</div>
        <button
          type="button"
          onClick={addLine}
          className="admin-glass-tile inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-prose transition hover:text-ink"
        >
          <Layers className="h-4 w-4" />
          باکس جدید
        </button>
      </div>
      <p className="text-xs leading-relaxed text-faint">
        Paste چندخطی در یک باکس، خودکار به چند ردیف تبدیل می‌شود. Enter روی آخرین باکس، ردیف جدید می‌سازد.
      </p>
      <div className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto overscroll-contain pe-1">
        {lines.map((line, index) => (
          <div key={line.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`${baseId}-${line.id}`}>
                کانفیگ {index + 1}
              </label>
              <input
                id={`${baseId}-${line.id}`}
                value={line.value}
                onChange={(event) => setLineValue(line.id, event.target.value)}
                onPaste={(event) => {
                  const text = event.clipboardData.getData("text/plain");
                  if (!text.includes("\n")) {
                    return;
                  }
                  event.preventDefault();
                  handlePaste(line.id, text);
                }}
                onKeyDown={(event) => handleLineKeyDown(event, index)}
                placeholder="vmess://… / vless://… / trojan://…"
                dir="ltr"
                className="w-full rounded-2xl border border-stroke/80 bg-white/60 px-4 py-3 font-mono text-xs outline-none backdrop-blur-sm transition focus:border-sky-400/50 focus:ring-2 focus:ring-brand-cyan/20 dark:border-slate-600/40 dark:bg-slate-950/40 sm:text-sm"
              />
            </div>
            <div className="flex justify-end sm:w-[3.25rem] sm:shrink-0 sm:justify-start">
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-stroke/80 bg-white/50 text-prose backdrop-blur-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-950/40 dark:hover:bg-rose-950/30"
                aria-label="حذف ردیف"
                title="حذف ردیف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-faint">
        خطوط غیرخالی: <span className="font-semibold text-ink">{nf(nonEmptyCount)}</span>
      </div>
    </div>
  );
}

type EntryMode = "quick" | "advanced";

export function AdminInventoryPanel({ plans }: AdminInventoryPanelProps) {
  const [state, formAction] = useActionState(addAccountsAction, initialState);
  const { showToast } = useToast();

  const [planQuery, setPlanQuery] = useState("");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>("quick");
  const [bulkText, setBulkText] = useState("");
  const [advancedJoined, setAdvancedJoined] = useState("");
  const [advancedEditorKey, setAdvancedEditorKey] = useState(0);
  const [advancedSeed, setAdvancedSeed] = useState("");
  const planPickerRef = useRef<HTMLDivElement>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const filteredPlans = useMemo(() => {
    const q = normalizeDigits(planQuery.trim().toLowerCase());
    if (!q) {
      return plans;
    }
    return plans.filter((p) => {
      const hay = normalizeDigits(`${p.name} ${p.id} ${p.remainingCount}`.toLowerCase());
      return hay.includes(q);
    });
  }, [planQuery, plans]);

  const configsPayload = entryMode === "quick" ? bulkText : advancedJoined;

  const quickStats = useMemo(() => {
    const rawLines = bulkText.split(/\r?\n/);
    const nonEmpty = rawLines.map((l) => l.trim()).filter(Boolean);
    const uniq = new Set(nonEmpty);
    const dupInFile = nonEmpty.length - uniq.size;
    const tooLongCount = nonEmpty.filter((l) => l.length > ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE).length;
    return {
      rawLineCount: rawLines.length,
      nonEmpty: nonEmpty.length,
      unique: uniq.size,
      dupInFile,
      tooLongCount,
      overMaxLines: nonEmpty.length > ADMIN_BULK_ACCOUNT_MAX_LINES,
    };
  }, [bulkText]);

  const advancedLines = useMemo(() => {
    return advancedJoined
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [advancedJoined]);

  const advancedNonEmpty = advancedLines.length;

  const advancedTooLongCount = useMemo(
    () => advancedLines.filter((l) => l.length > ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE).length,
    [advancedLines],
  );

  const advancedOverMaxLines = advancedLines.length > ADMIN_BULK_ACCOUNT_MAX_LINES;

  const canSubmit = useMemo(() => {
    if (!selectedPlanId) {
      return false;
    }
    if (entryMode === "quick") {
      const lines = bulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        return false;
      }
      if (lines.length > ADMIN_BULK_ACCOUNT_MAX_LINES) {
        return false;
      }
      if (lines.some((l) => l.length > ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE)) {
        return false;
      }
      return true;
    }
    if (advancedLines.length === 0) {
      return false;
    }
    if (advancedOverMaxLines || advancedTooLongCount > 0) {
      return false;
    }
    return true;
  }, [
    advancedLines.length,
    advancedOverMaxLines,
    advancedTooLongCount,
    bulkText,
    entryMode,
    selectedPlanId,
  ]);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      showToast(state.message, "success");
      setBulkText("");
      setSelectedPlanId("");
      setPlanQuery("");
      setPlanMenuOpen(false);
      setEntryMode("quick");
      setAdvancedJoined("");
      setAdvancedSeed("");
      setAdvancedEditorKey((k) => k + 1);
    }
  }, [showToast, state.message, state.status]);

  useEffect(() => {
    if (!planMenuOpen) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (planPickerRef.current?.contains(event.target as Node)) {
        return;
      }
      setPlanMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [planMenuOpen]);

  if (plans.length === 0) {
    return (
      <div className="admin-glass-panel px-5 py-10 text-center text-sm text-faint">
        ابتدا از بخش بالا یک پلن بسازید؛ بعد می‌توانید موجودی اکانت اضافه کنید.
      </div>
    );
  }

  return (
    <section className="admin-glass-panel overflow-hidden">
      <div className="relative border-b border-white/50 px-5 py-5 dark:border-white/10 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-cyan-500/8 via-transparent to-amber-500/6" />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-sky-600/10 ring-1 ring-cyan-500/25 dark:from-cyan-400/15 dark:to-slate-800/80">
            <PackagePlus className="h-6 w-6 text-sky-800 dark:text-sky-200" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-bold text-ink sm:text-xl">افزودن موجودی اکانت</h2>
            <p className="text-sm leading-relaxed text-prose">
              پلن را انتخاب کنید، کانفیگ‌ها را یکجا paste کنید یا در حالت پیشرفته خط‌به‌خط وارد کنید. تکراری‌ها در
              همان متن و موارد تکراری در دیتابیسِ همان پلن خودکار حذف می‌شوند.
            </p>
            <p className="text-xs text-faint">
              حداکثر {nf(ADMIN_BULK_ACCOUNT_MAX_LINES)} خط و تا {nf(ADMIN_BULK_ACCOUNT_MAX_CHARS_PER_LINE)} نویسه برای
              هر کانفیگ.
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6 px-5 py-6 sm:px-6">
        <input type="hidden" name="planId" value={selectedPlanId} />
        <input type="hidden" name="configs" value={configsPayload} readOnly />

        <div className="space-y-2">
          <label className="text-sm font-semibold text-ink">پلن مقصد</label>
          <div className="relative" ref={planPickerRef}>
            <button
              type="button"
              onClick={() => setPlanMenuOpen((o) => !o)}
              className="admin-glass-tile flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-right transition hover:border-stroke"
            >
              <span className="min-w-0 flex-1 text-sm">
                {selectedPlan ? (
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-ink">{selectedPlan.name}</span>
                    <span className="font-mono text-xs text-faint" dir="ltr">
                      {selectedPlan.id}
                    </span>
                    <span className="text-xs text-prose">
                      موجودی فعلی:{" "}
                      <span className="font-semibold text-ink">{nf(selectedPlan.remainingCount)}</span> اکانت آماده
                    </span>
                  </span>
                ) : (
                  <span className="text-faint">انتخاب پلن…</span>
                )}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-faint transition ${planMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {planMenuOpen ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-stroke/80 bg-white/95 shadow-xl backdrop-blur-xl dark:border-slate-600/50 dark:bg-slate-900/95">
                <div className="border-b border-stroke/60 p-2 dark:border-slate-700/80">
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    <input
                      value={planQuery}
                      onChange={(e) => setPlanQuery(e.target.value)}
                      placeholder="جستجو نام یا شناسه…"
                      className="w-full rounded-xl border border-stroke/60 bg-white/80 py-2.5 ps-9 pe-3 text-sm outline-none focus:border-sky-400/50 dark:border-slate-600/50 dark:bg-slate-950/50"
                    />
                  </div>
                </div>
                <ul className="max-h-56 overflow-y-auto py-1 text-sm">
                  {filteredPlans.length === 0 ? (
                    <li className="px-4 py-6 text-center text-faint">پلنی پیدا نشد.</li>
                  ) : (
                    filteredPlans.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlanId(p.id);
                            setPlanMenuOpen(false);
                            setPlanQuery("");
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-right transition hover:bg-sky-500/10 dark:hover:bg-sky-500/15"
                        >
                          <span className="flex w-full items-center justify-between gap-2">
                            <span className="font-medium text-ink">{p.name}</span>
                            {p.id === selectedPlanId ? (
                              <Check className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                            ) : null}
                          </span>
                          <span className="font-mono text-[11px] text-faint" dir="ltr">
                            {p.id}
                          </span>
                          <span className="text-xs text-prose">
                            موجودی: <span className="font-semibold tabular-nums">{nf(p.remainingCount)}</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl bg-inset/50 p-1 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              if (entryMode === "advanced") {
                setBulkText(advancedJoined);
              }
              setEntryMode("quick");
            }}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${
              entryMode === "quick"
                ? "bg-white text-ink shadow-sm dark:bg-slate-800"
                : "text-prose hover:text-ink"
            }`}
          >
            <AlignLeft className="h-4 w-4 shrink-0" />
            paste سریع
          </button>
          <button
            type="button"
            onClick={() => {
              setAdvancedSeed(bulkText);
              setAdvancedEditorKey((k) => k + 1);
              setEntryMode("advanced");
            }}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${
              entryMode === "advanced"
                ? "bg-white text-ink shadow-sm dark:bg-slate-800"
                : "text-prose hover:text-ink"
            }`}
          >
            <Rows3 className="h-4 w-4 shrink-0" />
            خط‌به‌خط
          </button>
        </div>

        {entryMode === "quick" ? (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-ink">کانفیگ‌ها (هر خط یک اکانت)</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              spellCheck={false}
              dir="ltr"
              rows={14}
              placeholder={`هر خط یک کانفیگ کامل؛ مثال:\nvmess://...\nvless://...\n\nخطوط خالی نادیده گرفته می‌شوند.`}
              className="w-full resize-y rounded-2xl border border-stroke/80 bg-white/65 px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none backdrop-blur-sm transition placeholder:text-faint focus:border-sky-400/50 focus:ring-2 focus:ring-brand-cyan/20 dark:border-slate-600/40 dark:bg-slate-950/50 sm:text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatMini label="خطوط در متن" value={nf(quickStats.rawLineCount)} />
              <StatMini label="غیرخالی" value={nf(quickStats.nonEmpty)} />
              <StatMini label="یکتا در متن" value={nf(quickStats.unique)} tone="sky" />
              <StatMini
                label="تکراری در همان متن"
                value={nf(quickStats.dupInFile)}
                tone={quickStats.dupInFile > 0 ? "amber" : "muted"}
              />
            </div>
            {quickStats.tooLongCount > 0 ? (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                {nf(quickStats.tooLongCount)} خط از حد مجاز طول کانفیگ طولانی‌تر است.
              </p>
            ) : null}
            {quickStats.overMaxLines ? (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                تعداد خطوط از سقف {nf(ADMIN_BULK_ACCOUNT_MAX_LINES)} بیشتر است.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <ConfigRowsEditor
              editorKey={advancedEditorKey}
              seedText={advancedSeed}
              onJoinedChange={setAdvancedJoined}
            />
            {advancedTooLongCount > 0 ? (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                {nf(advancedTooLongCount)} کانفیگ از حد مجاز طول بیشتر است.
              </p>
            ) : null}
            {advancedOverMaxLines ? (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                بیش از {nf(ADMIN_BULK_ACCOUNT_MAX_LINES)} خط غیرخالی دارید.
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-stroke/50 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <SubmitButton
            idleLabel="ثبت در موجودی"
            pendingLabel="در حال ذخیره…"
            disabled={!canSubmit}
          />
          <p className="text-xs text-faint">
            پس از ذخیره، در صورت وجود سفارش «منتظر اکانت» برای همین پلن، تا حد موجودی به‌صورت خودکار پر می‌شود.
          </p>
        </div>

        <FormMessage status={state.status} message={state.message} />
      </form>
    </section>
  );
}

function StatMini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "sky" | "amber" | "muted";
}) {
  const ring =
    tone === "sky"
      ? "border-sky-200/80 bg-sky-50/50 dark:border-sky-800/40 dark:bg-sky-950/30"
      : tone === "amber"
        ? "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/25"
        : tone === "muted"
          ? "opacity-80"
          : "";
  return (
    <div className={`admin-glass-tile px-3 py-2.5 ${ring}`}>
      <div className="text-[11px] font-medium text-faint">{label}</div>
      <div className="mt-0.5 text-base font-bold tabular-nums text-ink" dir="ltr">
        {value}
      </div>
    </div>
  );
}
