'use client';

import React from 'react';
import { useSellerAuth } from '@/lib/chat/auth-provider';
import { ChatShell } from '@/components/chat/chat-shell';

export default function DashboardPage() {
  const { storeId } = useSellerAuth();

  if (!storeId) {
    return (
      <div className="db-empty">
        <p>No store found. Start chatting to create your first store.</p>
      </div>
    );
  }

  return <ChatShell />;
}
