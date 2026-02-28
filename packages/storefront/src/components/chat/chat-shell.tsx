'use client';

import React, { useCallback } from 'react';
import { useChat } from '@/lib/chat/use-chat';
import { useSellerAuth } from '@/lib/chat/auth-provider';
import { ChatThread } from './chat-thread';
import { ChatInput } from './chat-input';
import { QuickChips } from './quick-chips';
import { LogOut } from 'lucide-react';

export function ChatShell() {
  const { user, signOut } = useSellerAuth();
  const { messages, isTyping, sendMessage, sendImages, messagesEndRef } = useChat();

  // Handle action buttons from cards and flow steps
  const handleAction = useCallback((action: string, params?: Record<string, unknown>) => {
    // Flow action buttons (vertical selection, etc.)
    // These are simple strings like "fashion", "jewellery"
    // that get fed directly to the flow manager via sendMessage
    switch (action) {
      case 'product.publish': {
        sendMessage(`publish product ${params?.productId || ''}`);
        break;
      }
      case 'product.update_price': {
        sendMessage('change the price');
        break;
      }
      case 'product.unpublish': {
        sendMessage('unpublish the product');
        break;
      }
      case 'order.ship': {
        sendMessage(`ship order ${params?.orderId || ''}`);
        break;
      }
      default:
        // For flow buttons (e.g. vertical selection: "fashion", "jewellery")
        // just send the action as text — the flow manager picks it up
        sendMessage(action);
    }
  }, [sendMessage]);

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="chat-header-logo">त</div>
          <div>
            <h1 className="chat-header-title">Tatparya</h1>
            <div className="chat-header-status">
              <span className="chat-status-dot" />
              Online
            </div>
          </div>
        </div>
        <div className="chat-header-right">
          {user?.phone && (
            <span className="chat-header-phone">{user.phone}</span>
          )}
          <button onClick={signOut} className="chat-header-logout" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <ChatThread
        messages={messages}
        isTyping={isTyping}
        messagesEndRef={messagesEndRef}
        onAction={handleAction}
      />

      <QuickChips onSelect={sendMessage} />

      <ChatInput
        onSendMessage={sendMessage}
        onSendImages={sendImages}
      />
    </div>
  );
}
