export interface ConversationObj {
    id: number;
    sessionId: string;
    chatbotId: string;
    userId: string;
    visitorId: string;
    createdAt: string;
  }

  export interface Message {
    id: number,
    conversationId: number,
    role: string,
    content: string
    timestamp: string
  }

  export interface BotSelection {
    id?: number;
    botId?: string;
    name: string;
    role?: string;
    language?: string;
    tone?: string;
    status?: string;
    description?: string;
    createdAt?: string;
  }