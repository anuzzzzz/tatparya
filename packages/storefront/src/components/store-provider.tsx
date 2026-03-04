'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StoreRow, DesignTokens, StoreConfig } from '@tatparya/shared';
import { getCartId } from '@/lib/utils';

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
  trpc: any;
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
  const [trpc, setTrpc] = useState<any>(null);
  const trpcInitRef = useRef(false);

  const config = store.storeConfig as unknown as StoreConfig;
  const rawDesign = config?.design || {};

  const design: DesignTokens = {
    layout: rawDesign.layout || 'minimal',
    palette: rawDesign.palette || {
      mode: 'generated' as const,
      seed: '#D4356A',
      primary: '#D4356A',
      secondary: '#F8E8EE',
      accent: '#8B1A3A',
      background: '#FFFAF5',
      surface: '#FFF5EE',
      text: '#1A1A2E',
      textMuted: '#6B6B80',
    },
    fonts: rawDesign.fonts || { display: 'Playfair Display', body: 'DM Sans', scale: 1.0 },
    hero: rawDesign.hero || { style: 'full_bleed', height: 'half', overlayOpacity: 0.3 },
    productCard: rawDesign.productCard || { style: 'hover_reveal', showPrice: true, showRating: false, imageRatio: '3:4' },
    nav: rawDesign.nav || { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: false },
    collection: rawDesign.collection || { style: 'uniform_grid', columns: { mobile: 2, desktop: 4 }, pagination: 'infinite_scroll' },
    checkout: rawDesign.checkout || { style: 'single_page', showTrustBadges: true, whatsappCheckout: false },
    spacing: rawDesign.spacing || 'balanced',
    radius: rawDesign.radius || 'rounded',
    imageStyle: rawDesign.imageStyle || 'subtle_shadow',
    animation: rawDesign.animation || 'fade',
    heroTokens: rawDesign.heroTokens || { overlayGradient: 'cinematic-bottom', textPlacement: 'bottom-left', showScrollHint: true, slideTransition: 'crossfade' },
    cardTokens: rawDesign.cardTokens || { hoverEffect: 'zoom', showSecondImage: true, showQuickAdd: true, badgeStyle: 'pill', priceDisplay: 'stacked' },
    decorativeTokens: rawDesign.decorativeTokens || { dividerStyle: 'gradient-fade', sectionBgVariation: true, useGlassmorphism: true, textureOverlay: 'none' },
    bespokeStyles: rawDesign.bespokeStyles || { hero: {}, card: {}, signatureEffect: 'none' },
  } as DesignTokens;

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }), []);

  // Lazy-load tRPC client on the client side only (superjson SSR issue)
  useEffect(() => {
    if (trpcInitRef.current) return;
    trpcInitRef.current = true;
    Promise.all([
      import('@trpc/client'),
      import('superjson'),
    ]).then(([trpcClient, superjsonMod]) => {
      const client = trpcClient.createTRPCProxyClient({
        links: [
          trpcClient.httpBatchLink({
            url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trpc`,
            transformer: superjsonMod.default,
          }),
        ],
      });
      setTrpc(client);
    });
  }, []);

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
