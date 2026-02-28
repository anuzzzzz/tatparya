'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../trpc';

// ============================================================
// Auth Context — provides user, session, store, and
// an authenticated tRPC client to all chat components.
// ============================================================

interface SellerAuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  storeId: string | null;
  setStoreId: (id: string) => void;
  signOut: () => Promise<void>;
  trpc: ReturnType<typeof createAuthTrpc>;
}

const AuthCtx = createContext<SellerAuthContext | null>(null);

export function useSellerAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useSellerAuth must be inside SellerAuthProvider');
  return ctx;
}

// Authenticated tRPC client — attaches JWT to every request
function createAuthTrpc(getToken: () => Promise<string | null>) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        transformer: superjson,
        async headers() {
          const token = await getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

export function SellerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const trpc = useMemo(() => createAuthTrpc(getToken), [getToken]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Persist active store in localStorage
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
    setStoreId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatparya_active_store');
    }
  }, [supabase]);

  const value = useMemo<SellerAuthContext>(() => ({
    user, session, loading, storeId, setStoreId: handleSetStoreId, signOut, trpc,
  }), [user, session, loading, storeId, handleSetStoreId, signOut, trpc]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
