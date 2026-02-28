'use client';

import React, { useState, useEffect } from 'react';
import { SellerAuthProvider, useSellerAuth } from '@/lib/chat/auth-provider';
import { LoginScreen } from '@/components/chat/login-screen';
import { ChatShell } from '@/components/chat/chat-shell';

// ============================================================
// Dashboard Page
//
// If not logged in → LoginScreen (phone OTP)
// If logged in → ChatShell (the entire seller experience)
// ============================================================

function DashboardContent() {
  const { user, loading } = useSellerAuth();

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="chat-loading-logo">त</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={() => window.location.reload()} />;
  }

  return <ChatShell />;
}

export default function DashboardPage() {
  return (
    <SellerAuthProvider>
      <DashboardContent />
    </SellerAuthProvider>
  );
}
