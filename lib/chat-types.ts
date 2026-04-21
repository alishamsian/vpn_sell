export type ChatMutationState = {
  status: "idle" | "success" | "error";
  message: string;
  conversationId?: string;
};

export const initialChatMutationState: ChatMutationState = {
  status: "idle",
  message: "",
};
