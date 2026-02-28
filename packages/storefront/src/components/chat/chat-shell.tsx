'use client';

import React from 'react';
import { useChat } from '@/lib/chat/use-chat';
import { useSellerAuth } from '@/lib/chat/auth-provider';
import { ChatThread } from './chat-thread';
import { ChatInput } from './chat-input';
import { QuickChips } from './quick-chips';
import { LogOut } from 'lucide-react';

// ============================================================
// Chat Shell
//
// The entire seller dashboard is this one component.
// Full-screen chat interface. No nav, no sidebar, no pages.
// Header + message thread + chips + input bar.
// ============================================================

export function ChatShell() {
  const { user, signOut, storeId } = useSellerAuth();
  const { messages, isTyping, sendMessage, sendImages, messagesEndRef } = useChat();

  return (
    <div className="chat-shell">
      {/* Header */}
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

      {/* Message Thread */}
      <ChatThread
        messages={messages}
        isTyping={isTyping}
        messagesEndRef={messagesEndRef}
      />

      {/* Quick Chips */}
      <QuickChips onSelect={sendMessage} />

      {/* Input Bar */}
      <ChatInput
        onSendMessage={sendMessage}
        onSendImages={sendImages}
      />
    </div>
  );
}
