'use client';

import React from 'react';
import type { ChatMessage } from '@/lib/chat/types';
import { formatDistanceToNow } from 'date-fns';

// ============================================================
// Chat Thread
//
// Renders the scrollable message list. Each message type gets
// its own bubble style. Phase A supports: text, image, typing, system.
// Phase D adds: product_card, order_card, stats, action_buttons.
// ============================================================

interface ChatThreadProps {
  messages: ChatMessage[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatThread({ messages, isTyping, messagesEndRef }: ChatThreadProps) {
  return (
    <div className="chat-thread">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ============================================================
// Message Bubble Router
// ============================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  switch (message.type) {
    case 'text':
      return <TextBubble role={message.role} text={message.text} timestamp={message.timestamp} />;
    case 'image':
      return <ImageBubble imageUrls={message.imageUrls} caption={message.caption} timestamp={message.timestamp} />;
    case 'system':
      return <SystemBubble text={message.text} />;
    case 'product_card':
    case 'order_card':
    case 'stats':
    case 'action_buttons':
      // Phase D — for now render as text
      return <TextBubble role="ai" text={`[${message.type}] Coming in Phase D`} timestamp={message.timestamp} />;
    case 'typing':
      return <TypingIndicator />;
    default:
      return null;
  }
}

// ============================================================
// Text Bubble
// ============================================================

function TextBubble({ role, text, timestamp }: { role: 'seller' | 'ai'; text: string; timestamp: Date }) {
  const isAi = role === 'ai';

  return (
    <div className={`chat-bubble-row ${isAi ? 'chat-bubble-ai' : 'chat-bubble-seller'}`}>
      {isAi && (
        <div className="chat-avatar">
          <span>त</span>
        </div>
      )}
      <div className="chat-bubble-content">
        <div className={`chat-bubble ${isAi ? 'bubble-ai' : 'bubble-seller'}`}>
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </div>
        <span className="chat-timestamp">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Image Bubble
// ============================================================

function ImageBubble({ imageUrls, caption, timestamp }: { imageUrls: string[]; caption?: string; timestamp: Date }) {
  return (
    <div className="chat-bubble-row chat-bubble-seller">
      <div className="chat-bubble-content">
        <div className="chat-image-grid" data-count={Math.min(imageUrls.length, 4)}>
          {imageUrls.slice(0, 4).map((url, i) => (
            <div key={i} className="chat-image-item">
              <img src={url} alt={caption || `Upload ${i + 1}`} />
              {i === 3 && imageUrls.length > 4 && (
                <div className="chat-image-more">+{imageUrls.length - 4}</div>
              )}
            </div>
          ))}
        </div>
        {caption && <span className="chat-image-caption">{caption}</span>}
        <span className="chat-timestamp">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// System Bubble (centered, muted)
// ============================================================

function SystemBubble({ text }: { text: string }) {
  return (
    <div className="chat-system">
      <span>{text}</span>
    </div>
  );
}

// ============================================================
// Typing Indicator
// ============================================================

function TypingIndicator() {
  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar">
        <span>त</span>
      </div>
      <div className="chat-bubble-content">
        <div className="chat-bubble bubble-ai chat-typing">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
