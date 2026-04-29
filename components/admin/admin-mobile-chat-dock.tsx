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
        launcherClassName="fixed bottom-[6.75rem] right-6 left-auto z-[100] inline-flex h-12 items-center gap-2 rounded-full border border-stroke/80 bg-panel/92 px-4 text-xs font-semibold text-ink shadow-[0_18px_40px_rgba(2,6,23,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-stroke hover:bg-panel hover:shadow-[0_22px_48px_rgba(2,6,23,0.2)] dark:shadow-black/45"
        panelClassName="fixed bottom-[11.25rem] inset-x-4 z-[100] w-auto max-w-[22rem]"
      />
    </div>
  );
}
