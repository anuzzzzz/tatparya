'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from './client';
import { createAuthenticatedTrpc } from './trpc-auth';
import type { AppRouter } from '../trpc';

// ============================================================
// Auth Context Types
// ============================================================

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  storeId: string | null;
  setStoreId: (id: string) => void;
  signOut: () => Promise<void>;
  trpc: ReturnType<typeof createAuthenticatedTrpc>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// ============================================================
// Auth Provider
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const trpc = useMemo(() => createAuthenticatedTrpc(getToken), [getToken]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Persist storeId in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('tatparya_active_store');
    if (saved) setStoreId(saved);
  }, []);

  const handleSetStoreId = useCallback((id: string) => {
    setStoreId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatparya_active_store', id);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatparya_active_store');
    }
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    storeId,
    setStoreId: handleSetStoreId,
    signOut,
    trpc,
  }), [user, session, loading, storeId, handleSetStoreId, signOut, trpc]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
