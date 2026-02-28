'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { StoreRow, DesignTokens, StoreConfig } from '@tatparya/shared';
import { getCartId } from '@/lib/utils';
import type { AppRouter } from '@/lib/trpc';

// ============================================================
// Store Context
// ============================================================

interface StoreContextValue {
  store: StoreRow;
  design: DesignTokens;
  config: StoreConfig;
  cartId: string;
  cartCount: number;
  setCartCount: (n: number) => void;
  trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

// ============================================================
// Provider
// ============================================================

interface StoreProviderProps {
  store: StoreRow;
  children: React.ReactNode;
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  const [cartCount, setCartCount] = useState(0);

  const config = store.storeConfig as unknown as StoreConfig;
  const design = config.design;

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  const trpc = useMemo(() => createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trpc`,
        transformer: superjson,
      }),
    ],
  }), []);

  const cartId = typeof window !== 'undefined' ? getCartId() : '';

  const value = useMemo<StoreContextValue>(() => ({
    store,
    design,
    config,
    cartId,
    cartCount,
    setCartCount,
    trpc,
  }), [store, design, config, cartId, cartCount, trpc]);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreContext.Provider value={value}>
        {children}
      </StoreContext.Provider>
    </QueryClientProvider>
  );
}
