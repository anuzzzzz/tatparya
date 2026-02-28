// ============================================================
// Chat Message Types
//
// Every message in the thread is one of these types.
// The ChatThread component switches on `type` to render
// the correct bubble/card.
// ============================================================

export type ChatMessage =
  | TextMessage
  | ImageMessage
  | ProductCardMessage
  | OrderCardMessage
  | StatsMessage
  | ActionButtonsMessage
  | TypingMessage
  | SystemMessage;

export interface TextMessage {
  type: 'text';
  id: string;
  role: 'seller' | 'ai';
  text: string;
  timestamp: Date;
}

export interface ImageMessage {
  type: 'image';
  id: string;
  role: 'seller';
  imageUrls: string[];       // One or more uploaded images
  caption?: string;
  timestamp: Date;
}

export interface ProductCardMessage {
  type: 'product_card';
  id: string;
  role: 'ai';
  product: {
    id?: string;              // Set after product is created in DB
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    imageUrl?: string;
    tags?: string[];
    status?: 'draft' | 'active';
    category?: string;
  };
  actions?: ChatAction[];
  timestamp: Date;
}

export interface OrderCardMessage {
  type: 'order_card';
  id: string;
  role: 'ai';
  order: {
    id: string;
    orderNumber: string;
    buyerName: string;
    total: number;
    status: string;
    itemCount: number;
    createdAt: string;
  };
  actions?: ChatAction[];
  timestamp: Date;
}

export interface StatsMessage {
  type: 'stats';
  id: string;
  role: 'ai';
  stats: {
    label: string;
    value: string | number;
    change?: string;          // e.g. "+12%"
  }[];
  period?: string;
  timestamp: Date;
}

export interface ActionButtonsMessage {
  type: 'action_buttons';
  id: string;
  role: 'ai';
  text: string;               // Message text above buttons
  actions: ChatAction[];
  timestamp: Date;
}

export interface TypingMessage {
  type: 'typing';
  id: string;
  role: 'ai';
  timestamp: Date;
}

export interface SystemMessage {
  type: 'system';
  id: string;
  role: 'ai';
  text: string;
  timestamp: Date;
}

// ============================================================
// Action Buttons (inside cards or standalone)
// ============================================================

export interface ChatAction {
  label: string;
  action: string;             // Intent string, e.g. 'product.publish'
  params?: Record<string, unknown>;
  variant?: 'primary' | 'secondary' | 'danger';
}

// ============================================================
// Helpers
// ============================================================

let messageCounter = 0;

export function createMessageId(): string {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

export function aiTextMessage(text: string): TextMessage {
  return {
    type: 'text',
    id: createMessageId(),
    role: 'ai',
    text,
    timestamp: new Date(),
  };
}

export function sellerTextMessage(text: string): TextMessage {
  return {
    type: 'text',
    id: createMessageId(),
    role: 'seller',
    text,
    timestamp: new Date(),
  };
}

export function sellerImageMessage(imageUrls: string[], caption?: string): ImageMessage {
  return {
    type: 'image',
    id: createMessageId(),
    role: 'seller',
    imageUrls,
    caption,
    timestamp: new Date(),
  };
}

export function typingMessage(): TypingMessage {
  return {
    type: 'typing',
    id: createMessageId(),
    role: 'ai',
    timestamp: new Date(),
  };
}

export function systemMessage(text: string): SystemMessage {
  return {
    type: 'system',
    id: createMessageId(),
    role: 'ai',
    text,
    timestamp: new Date(),
  };
}
