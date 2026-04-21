"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { AttachmentPicker } from "@/components/chat/attachment-picker";
import { useToast } from "@/components/toast-provider";
import {
  initialChatMutationState,
  type ChatMutationState,
} from "@/lib/chat-types";

type MessageComposerProps = {
  action: (state: ChatMutationState, formData: FormData) => Promise<ChatMutationState>;
  conversationId?: string;
  conversationScope?: "GENERAL_SUPPORT" | "ORDER_SUPPORT";
  orderId?: string;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  compact?: boolean;
  onOptimisticSend?: (payload: { message: string }) => void;
  onSuccess?: (state: ChatMutationState) => void;
  onComplete?: (state: ChatMutationState) => void;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      {pending ? "در حال ارسال..." : "ارسال پیام"}
    </button>
  );
}

export function MessageComposer({
  action,
  conversationId,
  conversationScope = "GENERAL_SUPPORT",
  orderId,
  disabled = false,
  placeholder = "پیام خود را بنویسید...",
  rows = 4,
  compact = false,
  onOptimisticSend,
  onSuccess,
  onComplete,
}: MessageComposerProps) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { showToast } = useToast();
  const wrappedAction = async (
    previousState: ChatMutationState,
    formData: FormData,
  ): Promise<ChatMutationState> => {
    const message = String(formData.get("message") ?? "").trim();

    if (message) {
      onOptimisticSend?.({ message });
    }

    const result = await action(previousState, formData);

    if (result.status === "success") {
      formRef.current?.reset();
      setSelectedFileName("");
      onSuccess?.(result);
    }

    onComplete?.(result);

    return result;
  };
  const [state, formAction] = useActionState(wrappedAction, initialChatMutationState);

  useEffect(() => {
    if (!state.message || state.status === "idle") {
      return;
    }

    showToast(state.message, state.status === "success" ? "success" : "error");
  }, [showToast, state.message, state.status]);

  return (
    <form ref={formRef} action={formAction} className={compact ? "space-y-3" : "space-y-4"}>
      <input type="hidden" name="conversationScope" value={conversationScope} />
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <input type="hidden" name="orderId" value={orderId ?? ""} />

      <textarea
        name="message"
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-slate-200 bg-white text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          compact
            ? "rounded-2xl px-3 py-2.5 leading-6"
            : "rounded-3xl px-4 py-3 leading-7"
        }`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AttachmentPicker
          inputId={`chat-attachment-${conversationId ?? orderId ?? conversationScope}`}
          selectedFileName={selectedFileName}
          onChange={setSelectedFileName}
        />
        <SubmitButton disabled={disabled} />
      </div>
    </form>
  );
}
