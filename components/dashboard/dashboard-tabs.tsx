"use client";

import type { ReactElement, ReactNode } from "react";
import { Children, isValidElement, useMemo, useState } from "react";

export type DashboardTabId = "action" | "review" | "waiting" | "fulfilled" | "all";

export type DashboardTabItem = {
  id: DashboardTabId;
  label: string;
  count: number;
  tone: "neutral" | "warning" | "success";
};

export function DashboardTabPanel({
  tabId,
  children,
}: {
  tabId: DashboardTabId;
  children: ReactNode;
}) {
  return <div data-dashboard-tab-panel={tabId}>{children}</div>;
}

export function DashboardTabs({
  tabs,
  initialTabId,
  children,
}: {
  tabs: DashboardTabItem[];
  initialTabId: DashboardTabId;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>(initialTabId);

  const panels = useMemo(() => {
    return Children.toArray(children).filter((child): child is ReactElement => isValidElement(child));
  }, [children]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = item.id === activeTab;
          const tone =
            item.tone === "success"
              ? "border-emerald-200/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100"
              : item.tone === "warning"
                ? "border-amber-200/70 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
                : "border-stroke bg-panel text-prose";

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                active ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950" : tone
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  active
                    ? "bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900"
                    : "bg-elevated text-faint"
                }`}
              >
                {new Intl.NumberFormat("fa-IR").format(item.count)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {panels.map((panel) => {
          const tabId = (panel.props as { tabId?: DashboardTabId }).tabId;
          const visible = tabId === activeTab;
          return (
            <div key={tabId ?? String(panel.key)} className={visible ? "block" : "hidden"}>
              {panel}
            </div>
          );
        })}
      </div>
    </div>
  );
}

