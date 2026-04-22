"use client";

import { useActionState, useEffect } from "react";

import { createCouponAction, toggleCouponActiveAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminCouponsManager({
  coupons,
}: {
  coupons: Array<{
    id: string;
    code: string;
    kind: "PERCENT" | "FIXED";
    value: string;
    isActive: boolean;
    createdAt: string;
  }>;
}) {
  const { showToast } = useToast();
  const [createState, createAction] = useActionState(createCouponAction, initialState);
  const [toggleState, toggleAction] = useActionState(toggleCouponActiveAction, initialState);

  useEffect(() => {
    if (createState.message && createState.status !== "idle") {
      showToast(createState.message, createState.status === "success" ? "success" : "error");
    }
  }, [createState.message, createState.status, showToast]);

  useEffect(() => {
    if (toggleState.message && toggleState.status !== "idle") {
      showToast(toggleState.message, toggleState.status === "success" ? "success" : "error");
    }
  }, [showToast, toggleState.message, toggleState.status]);

  return (
    <div className="space-y-8">
      <form action={createAction} className="grid gap-4 rounded-2xl border border-stroke bg-panel p-4 md:grid-cols-6">
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium text-faint">کد</div>
          <input
            name="code"
            placeholder="SPRING1405"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs font-medium text-faint">نوع</div>
          <select
            name="kind"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            defaultValue="PERCENT"
          >
            <option value="PERCENT">درصدی</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-xs font-medium text-faint">مقدار</div>
          <input
            name="value"
            inputMode="numeric"
            placeholder="10"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs font-medium text-faint">حداقل سفارش</div>
          <input
            name="minOrderAmount"
            inputMode="numeric"
            placeholder="100000"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs font-medium text-faint">سقف تخفیف</div>
          <input
            name="maxDiscountAmount"
            inputMode="numeric"
            placeholder="50000"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <div className="md:col-span-6 grid gap-4 md:grid-cols-6">
          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-faint">سقف مصرف کل</div>
            <input
              name="usageLimitTotal"
              inputMode="numeric"
              placeholder="100"
              className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-faint">سقف هر کاربر</div>
            <input
              name="usageLimitPerUser"
              inputMode="numeric"
              placeholder="1"
              className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            />
          </label>
          <div className="flex items-end md:col-span-2">
            <button type="submit" className="btn-brand w-full">
              ساخت کوپن
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-stroke">
        <table className="w-full text-sm">
          <thead className="bg-inset text-faint">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">کد</th>
              <th className="px-4 py-3 font-medium">نوع</th>
              <th className="px-4 py-3 font-medium">مقدار</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">ساخته‌شده</th>
              <th className="px-4 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke/70 bg-panel">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="text-prose">
                <td className="px-4 py-3 font-medium text-ink">{coupon.code}</td>
                <td className="px-4 py-3">{coupon.kind === "PERCENT" ? "درصدی" : "ثابت"}</td>
                <td className="px-4 py-3">{coupon.value}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      coupon.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                    }`}
                  >
                    {coupon.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="px-4 py-3">{coupon.createdAt}</td>
                <td className="px-4 py-3">
                  <form action={toggleAction}>
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <input type="hidden" name="isActive" value={coupon.isActive ? "false" : "true"} />
                    <button
                      type="submit"
                      className="rounded-full border border-stroke bg-inset px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-elevated"
                    >
                      {coupon.isActive ? "غیرفعال" : "فعال"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-faint">
                  هنوز هیچ کوپنی ساخته نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

