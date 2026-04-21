"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { openUserOrderConversation } from "@/app/dashboard/chat/actions";
import { useToast } from "@/components/toast-provider";
import type { ChatConversationDetails, ChatConversationSummary } from "@/lib/queries";

export type UserChatOrderOption = {
  id: string;
  planName: string;
  statusLabel: string;
};

type UserChatOrderContextPickerProps = {
  orders: UserChatOrderOption[];
  conversations: ChatConversationSummary[];
  selectedConversation: ChatConversationDetails | null;
  generalConversationId: string;
  onSwitchConversation: (conversationId: string) => void;
  refreshConversations: () => Promise<void>;
};

export function UserChatOrderContextPicker({
  orders,
  conversations,
  selectedConversation,
  generalConversationId,
  onSwitchConversation,
  refreshConversations,
}: UserChatOrderContextPickerProps) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const syncedValueRef = useRef("");

  const selectValue = useMemo(() => {
    if (!selectedConversation?.order?.id) {
      return "";
    }

    return selectedConversation.order.id;
  }, [selectedConversation?.order?.id]);

  const [pickerValue, setPickerValue] = useState(selectValue);

  useEffect(() => {
    syncedValueRef.current = selectValue;
    setPickerValue(selectValue);
  }, [selectValue]);

  const handleChange = (orderId: string) => {
    if (!orderId) {
      setPickerValue("");
      onSwitchConversation(generalConversationId);
      return;
    }

    const existing = conversations.find((c) => c.order?.id === orderId);

    if (existing) {
      setPickerValue(orderId);
      onSwitchConversation(existing.id);
      return;
    }

    setPickerValue(orderId);

    startTransition(async () => {
      const result = await openUserOrderConversation(orderId);

      if (result.status !== "success" || !result.conversationId) {
        showToast(result.message || "خطا در باز کردن گفتگو", "error");
        setPickerValue(syncedValueRef.current);
        return;
      }

      await refreshConversations();
      onSwitchConversation(result.conversationId);
    });
  };

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 space-y-1.5">
      <label htmlFor="chat-order-context" className="text-xs font-medium text-slate-600">
        سفارش مرتبط با این گفتگو
      </label>
      <select
        id="chat-order-context"
        value={pickerValue}
        disabled={pending}
        onChange={(event) => {
          handleChange(event.target.value);
        }}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">پشتیبانی عمومی</option>
        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            {order.planName} — {order.statusLabel}
          </option>
        ))}
      </select>
      <p className="text-[11px] leading-5 text-slate-500">
        با انتخاب سفارش، همان گفتگوی اختصاصی سفارش باز می‌شود و پیام‌ها در همان رشته می‌مانند.
      </p>
    </div>
  );
}
