import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

// Type-only import of the API router — no runtime dependency on the API package
// @ts-ignore — cross-package type import resolved by bundler
import type { AppRouter } from '../../api/src/trpc/router';

export type { AppRouter };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Vanilla tRPC client for server components and server-side data fetching.
 * Used in RSC where we can't use React Query hooks.
 */
export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/trpc`,
      transformer: superjson,
    }),
  ],
});

/**
 * Client-side tRPC for mutations (cart operations, order creation).
 * Uses the same config but runs in the browser.
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return API_URL;
}

export function getTrpcUrl() {
  return `${API_URL}/trpc`;
}
