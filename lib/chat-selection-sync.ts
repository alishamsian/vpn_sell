export const CHAT_SELECTION_CHANGED_EVENT = "chat-selection-changed";

export function getChatSelectionStorageKey(role: "USER" | "ADMIN", userId: string) {
  return `chat-selection:${role}:${userId}`;
}

export function getStoredChatSelection(role: "USER" | "ADMIN", userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getChatSelectionStorageKey(role, userId));
}

export function setStoredChatSelection(
  role: "USER" | "ADMIN",
  userId: string,
  conversationId: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const key = getChatSelectionStorageKey(role, userId);
  window.localStorage.setItem(key, conversationId);
  window.dispatchEvent(
    new CustomEvent(CHAT_SELECTION_CHANGED_EVENT, {
      detail: {
        key,
        conversationId,
      },
    }),
  );
}
