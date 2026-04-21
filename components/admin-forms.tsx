"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";

import { addAccountsAction, createPlanAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";
type AdminFormsProps = {
  plans: Array<{
    id: string;
    name: string;
  }>;
};

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
};

function SubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

function FormMessage({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`text-sm ${
        status === "success"
          ? "text-emerald-700"
          : status === "error"
            ? "text-rose-700"
            : "text-slate-500"
      }`}
    >
      {message}
    </p>
  );
}

type ConfigLine = {
  id: string;
  value: string;
};

function createLine(value = ""): ConfigLine {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    value,
  };
}

function AccountBulkConfigsEditor({ resetKey }: { resetKey: number }) {
  const baseId = useId();
  const [lines, setLines] = useState<ConfigLine[]>(() => [createLine()]);
  const pendingFocusLineId = useRef<string | null>(null);

  useEffect(() => {
    setLines([createLine()]);
  }, [resetKey]);

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

  const joinedConfigs = lines
    .map((line) => line.value.trim())
    .filter(Boolean)
    .join("\n");

  const nonEmptyCount = lines.reduce((count, line) => (line.value.trim() ? count + 1 : count), 0);

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

  return (
    <div className="space-y-3">
      <input type="hidden" name="configs" value={joinedConfigs} readOnly />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-700">کانفیگ‌ها</div>
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          افزودن باکس
        </button>
      </div>

      <div className="text-xs leading-relaxed text-slate-500">
        هر باکس فقط یک کانفیگ. Enter روی آخرین باکس، باکس جدید می‌سازد. اگر چندخطی paste کنید، خودکار به چند باکس تفکیک می‌شود.
      </div>

      <div className="space-y-2">
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
                placeholder="vmess://... / vless://... / trojan://..."
                dir="ltr"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs outline-none transition focus:border-slate-400 sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 sm:w-[7.5rem] sm:justify-end">
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                aria-label="حذف باکس"
                title="حذف باکس"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        تعداد کانفیگ‌های آماده ارسال:{" "}
        <span className="font-semibold text-slate-800">{new Intl.NumberFormat("fa-IR").format(nonEmptyCount)}</span>
      </div>
    </div>
  );
}

export function AdminForms({ plans }: AdminFormsProps) {
  const [planState, planFormAction] = useActionState(createPlanAction, initialAdminActionState);
  const [accountState, accountFormAction] = useActionState(
    addAccountsAction,
    initialAdminActionState,
  );
  const { showToast } = useToast();
  const planFormRef = useRef<HTMLFormElement>(null);
  const accountFormRef = useRef<HTMLFormElement>(null);
  const [desktopUi, setDesktopUi] = useState(false);
  const [accountConfigsResetKey, setAccountConfigsResetKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(min-width: 1024px)");

    const apply = () => {
      setDesktopUi(media.matches);
    };

    apply();

    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (planState.status === "success" && planState.message) {
      showToast(planState.message, "success");
      planFormRef.current?.reset();
    }
  }, [planState.message, planState.status, showToast]);

  useEffect(() => {
    if (accountState.status === "success" && accountState.message) {
      showToast(accountState.message, "success");
      accountFormRef.current?.reset();
      setAccountConfigsResetKey((current) => current + 1);
    }
  }, [accountState.message, accountState.status, showToast]);

  return (
    <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <details
        open={desktopUi}
        className="group rounded-3xl border border-slate-200 bg-white shadow-soft open:bg-white"
      >
        <summary className="cursor-pointer list-none rounded-3xl px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">ساخت پلن</h2>
              <p className="text-sm text-slate-600">قیمت تومانی، مدت اشتراک و محدودیت کاربر (اختیاری).</p>
            </div>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 transition group-open:border-slate-300 group-open:bg-white group-open:text-slate-950">
              {desktopUi ? "باز" : "باز/بسته"}
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-100 px-5 pb-6 pt-2 sm:px-6">
          <form ref={planFormRef} action={planFormAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                نام پلن
              </label>
              <input
                id="name"
                name="name"
                placeholder="مثلا پلن پایه ۲۰ گیگ"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium text-slate-700">
                قیمت (تومان)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="1"
                placeholder="249000"
                dir="ltr"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="durationDays" className="text-sm font-medium text-slate-700">
                مدت اشتراک (روز)
              </label>
              <input
                id="durationDays"
                name="durationDays"
                type="number"
                min="1"
                step="1"
                placeholder="30"
                dir="ltr"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maxUsers" className="text-sm font-medium text-slate-700">
                حداکثر کاربر (اختیاری)
              </label>
              <input
                id="maxUsers"
                name="maxUsers"
                type="number"
                min="1"
                step="1"
                placeholder="خالی یعنی بدون محدودیت"
                dir="ltr"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              />
              <div className="text-xs text-slate-500">اگر خالی بماند، پلن با «بدون محدودیت کاربر» ساخته می‌شود.</div>
            </div>

            <SubmitButton idleLabel="ایجاد پلن" pendingLabel="در حال ایجاد..." />
            <FormMessage status={planState.status} message={planState.message} />
          </form>
        </div>
      </details>

      <details
        open={desktopUi}
        className="group rounded-3xl border border-slate-200 bg-white shadow-soft open:bg-white"
      >
        <summary className="cursor-pointer list-none rounded-3xl px-5 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950 sm:text-xl">افزودن گروهی اکانت‌ها</h2>
              <p className="text-sm text-slate-600">برای پلن انتخاب‌شده، هر کانفیگ را داخل یک باکس جدا وارد کنید.</p>
            </div>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 transition group-open:border-slate-300 group-open:bg-white group-open:text-slate-950">
              {desktopUi ? "باز" : "باز/بسته"}
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-100 px-5 pb-6 pt-2 sm:px-6">
          <form ref={accountFormRef} action={accountFormAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="planId" className="text-sm font-medium text-slate-700">
                پلن
              </label>
              <select
                id="planId"
                name="planId"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                defaultValue=""
              >
                <option value="" disabled>
                  یک پلن انتخاب کنید
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            <AccountBulkConfigsEditor resetKey={accountConfigsResetKey} />

            <SubmitButton idleLabel="افزودن اکانت‌ها" pendingLabel="در حال ذخیره..." />
            <FormMessage status={accountState.status} message={accountState.message} />
          </form>
        </div>
      </details>
    </section>
  );
}
