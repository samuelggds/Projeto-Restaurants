import api from "./api";

type AskPayload = {
  question: string;
  role: string;
  pathname: string;
  history: string[];
};

const CONVERSATION_STORAGE_KEY = "@PecaJaFood:aiSupportConversationId";

function createConversationId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `conv_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getConversationId() {
  if (typeof window === "undefined") {
    return createConversationId();
  }

  const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const created = createConversationId();
  localStorage.setItem(CONVERSATION_STORAGE_KEY, created);
  return created;
}

function setConversationId(conversationId: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof conversationId !== "string" || !conversationId.trim()) {
    return;
  }

  localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId.trim());
}

class AiSupportService {
  async ask(payload: AskPayload) {
    const response = await api.post("/ai-support/chat", {
      ...payload,
      conversationId: getConversationId(),
    });

    setConversationId(response?.data?.conversationId);
    return response.data;
  }
}

export default new AiSupportService();
