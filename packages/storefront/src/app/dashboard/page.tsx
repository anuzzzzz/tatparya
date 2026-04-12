'use client';

import React from 'react';
import { ChatShell } from '@/components/chat/chat-shell';

// Chat is ALWAYS visible — it's how sellers create stores (NO_STORE phase),
// manage products, and do everything. Never hide it based on storeId.
export default function DashboardPage() {
  return <ChatShell />;
}
