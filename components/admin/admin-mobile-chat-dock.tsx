"use client";

import { FloatingChatEntry } from "@/components/chat/floating-chat-entry";

export function AdminMobileChatDock({
  session,
}: {
  session: {
    sub: string;
    role: "ADMIN";
  };
}) {
  return (
    <div className="lg:hidden">
      <FloatingChatEntry
        session={session}
        launcherClassName="fixed bottom-[6.75rem] inset-inline-start-4 z-[100] inline-flex h-14 items-center gap-3 rounded-full border border-stroke bg-panel px-5 text-sm font-semibold text-ink shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-stroke hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)] dark:shadow-black/40"
        panelClassName="fixed bottom-[11.25rem] inset-inline-start-4 z-[100] w-[min(23rem,calc(100vw-2rem))]"
      />
    </div>
  );
}
