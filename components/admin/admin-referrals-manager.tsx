"use client";

import { useActionState, useEffect } from "react";

import { createReferralCampaignAction, createReferralCodeAction } from "@/app/admin/actions";
import { useToast } from "@/components/toast-provider";

type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: AdminActionState = { status: "idle", message: "" };

export function AdminReferralsManager({
  campaigns,
  codes,
}: {
  campaigns: Array<{ id: string; name: string; rewardValue: string; isActive: boolean; createdAt: string }>;
  codes: Array<{
    id: string;
    code: string;
    campaignName: string;
    ownerUserId: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
}) {
  const { showToast } = useToast();
  const [campaignState, campaignAction] = useActionState(createReferralCampaignAction, initialState);
  const [codeState, codeAction] = useActionState(createReferralCodeAction, initialState);

  useEffect(() => {
    if (campaignState.message && campaignState.status !== "idle") {
      showToast(campaignState.message, campaignState.status === "success" ? "success" : "error");
    }
  }, [campaignState.message, campaignState.status, showToast]);

  useEffect(() => {
    if (codeState.message && codeState.status !== "idle") {
      showToast(codeState.message, codeState.status === "success" ? "success" : "error");
    }
  }, [codeState.message, codeState.status, showToast]);

  return (
    <div className="space-y-10">
      <form action={campaignAction} className="grid gap-4 rounded-2xl border border-stroke bg-panel p-4 md:grid-cols-6">
        <label className="space-y-1 md:col-span-4">
          <div className="text-xs font-medium text-faint">نام کمپین</div>
          <input
            name="name"
            placeholder="Affiliate Spring"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1 md:col-span-1">
          <div className="text-xs font-medium text-faint">پاداش (اعتبار)</div>
          <input
            name="rewardValue"
            inputMode="numeric"
            placeholder="50000"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <div className="flex items-end md:col-span-1">
          <button type="submit" className="btn-brand w-full">
            ساخت کمپین
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-stroke">
        <table className="w-full text-sm">
          <thead className="bg-inset text-faint">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">کمپین</th>
              <th className="px-4 py-3 font-medium">پاداش</th>
              <th className="px-4 py-3 font-medium">فعال</th>
              <th className="px-4 py-3 font-medium">ساخته‌شده</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke/70 bg-panel">
            {campaigns.map((c) => (
              <tr key={c.id} className="text-prose">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">{c.rewardValue}</td>
                <td className="px-4 py-3">{c.isActive ? "بله" : "خیر"}</td>
                <td className="px-4 py-3">{c.createdAt}</td>
              </tr>
            ))}
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-faint">
                  هنوز هیچ کمپینی ساخته نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form action={codeAction} className="grid gap-4 rounded-2xl border border-stroke bg-panel p-4 md:grid-cols-6">
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium text-faint">کد</div>
          <input
            name="code"
            placeholder="ALI-REF"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium text-faint">کمپین</div>
          <select
            name="campaignId"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
            defaultValue={campaigns[0]?.id ?? ""}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium text-faint">شناسه صاحب کد (اختیاری)</div>
          <input
            name="ownerUserId"
            placeholder="userId"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <label className="space-y-1 md:col-span-5">
          <div className="text-xs font-medium text-faint">یادداشت (اختیاری)</div>
          <input
            name="note"
            placeholder="همکار / منبع"
            className="w-full rounded-2xl border border-stroke bg-inset px-4 py-2 text-sm text-ink outline-none transition focus:border-faint/60 focus:ring-2 focus:ring-brand-cyan/20"
          />
        </label>
        <div className="flex items-end md:col-span-1">
          <button type="submit" className="btn-brand w-full" disabled={campaigns.length === 0}>
            ساخت کد
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-stroke">
        <table className="w-full text-sm">
          <thead className="bg-inset text-faint">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">کد</th>
              <th className="px-4 py-3 font-medium">کمپین</th>
              <th className="px-4 py-3 font-medium">صاحب</th>
              <th className="px-4 py-3 font-medium">فعال</th>
              <th className="px-4 py-3 font-medium">ساخته‌شده</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke/70 bg-panel">
            {codes.map((c) => (
              <tr key={c.id} className="text-prose">
                <td className="px-4 py-3 font-medium text-ink">{c.code}</td>
                <td className="px-4 py-3">{c.campaignName}</td>
                <td className="px-4 py-3">{c.ownerUserId ?? "-"}</td>
                <td className="px-4 py-3">{c.isActive ? "بله" : "خیر"}</td>
                <td className="px-4 py-3">{c.createdAt}</td>
              </tr>
            ))}
            {codes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-faint">
                  هنوز هیچ کدی ساخته نشده است.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

