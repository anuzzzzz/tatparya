'use client';

import React from 'react';
import type { ChatMessage, ChatAction, ProductCardMessage, OrderCardMessage, StatsMessage, ActionButtonsMessage } from '@/lib/chat/types';
import { formatDistanceToNow } from 'date-fns';
import { Package, ShoppingBag, TrendingUp } from 'lucide-react';

// ============================================================
// Chat Thread — Phase C
//
// Renders all message types including rich cards.
// ============================================================

interface ChatThreadProps {
  messages: ChatMessage[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

export function ChatThread({ messages, isTyping, messagesEndRef, onAction }: ChatThreadProps) {
  return (
    <div className="chat-thread">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onAction={onAction} />
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

// ============================================================
// Message Router
// ============================================================

function MessageBubble({ message, onAction }: { message: ChatMessage; onAction?: (action: string, params?: Record<string, unknown>) => void }) {
  switch (message.type) {
    case 'text':
      return <TextBubble role={message.role} text={message.text} timestamp={message.timestamp} />;
    case 'image':
      return <ImageBubble imageUrls={message.imageUrls} caption={message.caption} timestamp={message.timestamp} />;
    case 'product_card':
      return <ProductCard message={message} onAction={onAction} />;
    case 'order_card':
      return <OrderCard message={message} onAction={onAction} />;
    case 'stats':
      return <StatsCard message={message} />;
    case 'action_buttons':
      return <ActionButtons message={message} onAction={onAction} />;
    case 'system':
      return <SystemBubble text={message.text} />;
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
      {isAi && <div className="chat-avatar"><span>त</span></div>}
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
// Product Card
// ============================================================

function ProductCard({ message, onAction }: { message: ProductCardMessage; onAction?: (action: string, params?: Record<string, unknown>) => void }) {
  const { product, actions } = message;
  const price = product.price?.toLocaleString('en-IN');
  const compareAt = product.compareAtPrice?.toLocaleString('en-IN');

  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar"><span>त</span></div>
      <div className="chat-bubble-content">
        <div className="chat-card">
          {product.imageUrl && (
            <div className="chat-card-image">
              <img src={product.imageUrl} alt={product.name} />
            </div>
          )}
          <div className="chat-card-body">
            <div className="chat-card-header">
              <ShoppingBag size={14} />
              <span className={`chat-card-badge ${product.status === 'active' ? 'badge-active' : 'badge-draft'}`}>
                {product.status || 'draft'}
              </span>
            </div>
            <h4 className="chat-card-title">{product.name}</h4>
            {product.description && (
              <p className="chat-card-desc">
                {product.description.length > 120
                  ? product.description.slice(0, 120) + '...'
                  : product.description}
              </p>
            )}
            <div className="chat-card-price">
              <span className="chat-card-price-main">₹{price}</span>
              {compareAt && <span className="chat-card-price-compare">₹{compareAt}</span>}
            </div>
            {product.tags && product.tags.length > 0 && (
              <div className="chat-card-tags">
                {product.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="chat-card-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
          {actions && actions.length > 0 && (
            <div className="chat-card-actions">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={`chat-card-btn ${action.variant === 'primary' ? 'btn-primary-sm' : 'btn-secondary-sm'}`}
                  onClick={() => onAction?.(action.action, action.params)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="chat-timestamp">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Order Card
// ============================================================

function OrderCard({ message, onAction }: { message: OrderCardMessage; onAction?: (action: string, params?: Record<string, unknown>) => void }) {
  const { order, actions } = message;
  const total = order.total?.toLocaleString('en-IN');

  const statusColors: Record<string, string> = {
    created: 'badge-draft',
    paid: 'badge-active',
    processing: 'badge-active',
    shipped: 'badge-shipped',
    delivered: 'badge-delivered',
    cancelled: 'badge-cancelled',
  };

  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar"><span>त</span></div>
      <div className="chat-bubble-content">
        <div className="chat-card">
          <div className="chat-card-body">
            <div className="chat-card-header">
              <Package size={14} />
              <span className={`chat-card-badge ${statusColors[order.status] || 'badge-draft'}`}>
                {order.status}
              </span>
            </div>
            <h4 className="chat-card-title">{order.orderNumber}</h4>
            <p className="chat-card-desc">
              {order.buyerName} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
            </p>
            <div className="chat-card-price">
              <span className="chat-card-price-main">₹{total}</span>
            </div>
          </div>
          {actions && actions.length > 0 && (
            <div className="chat-card-actions">
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={`chat-card-btn ${action.variant === 'primary' ? 'btn-primary-sm' : 'btn-secondary-sm'}`}
                  onClick={() => onAction?.(action.action, action.params)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="chat-timestamp">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Stats Card
// ============================================================

function StatsCard({ message }: { message: StatsMessage }) {
  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar"><span>त</span></div>
      <div className="chat-bubble-content">
        <div className="chat-card">
          <div className="chat-card-body">
            <div className="chat-card-header">
              <TrendingUp size={14} />
              {message.period && (
                <span className="chat-card-period">{message.period}</span>
              )}
            </div>
            <div className="chat-stats-grid">
              {message.stats.map((stat, i) => (
                <div key={i} className="chat-stat-item">
                  <span className="chat-stat-label">{stat.label}</span>
                  <span className="chat-stat-value">{stat.value}</span>
                  {stat.change && (
                    <span className="chat-stat-change">{stat.change}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <span className="chat-timestamp">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Action Buttons
// ============================================================

function ActionButtons({ message, onAction }: { message: ActionButtonsMessage; onAction?: (action: string, params?: Record<string, unknown>) => void }) {
  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar"><span>त</span></div>
      <div className="chat-bubble-content">
        <div className="chat-bubble bubble-ai">
          {message.text}
        </div>
        <div className="chat-inline-actions">
          {message.actions.map((action, i) => (
            <button
              key={i}
              className={`chat-card-btn ${action.variant === 'primary' ? 'btn-primary-sm' : 'btn-secondary-sm'}`}
              onClick={() => onAction?.(action.action, action.params)}
            >
              {action.label}
            </button>
          ))}
        </div>
        <span className="chat-timestamp">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// System + Typing
// ============================================================

function SystemBubble({ text }: { text: string }) {
  return (
    <div className="chat-system"><span>{text}</span></div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-row chat-bubble-ai">
      <div className="chat-avatar"><span>त</span></div>
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
