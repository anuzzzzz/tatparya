import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { getSupabase, getServiceClient } from '../lib/db.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// tRPC Context
// Created for every request. Contains:
// - user: authenticated user (or null for public routes)
// - db: Supabase client (RLS-aware)
// - serviceDb: Service-role client (bypasses RLS)
// - storeId: current store context (set by middleware)
// ============================================================

export interface User {
  id: string;
  phone?: string;
  email?: string;
}

export interface Context {
  user: User | null;
  db: SupabaseClient;
  serviceDb: SupabaseClient;
  storeId?: string;
}

export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  const db = getSupabase();
  const serviceDb = getServiceClient();
  let user: User | null = null;

  // Extract JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data: { user: supabaseUser }, error } = await db.auth.getUser(token);
      if (supabaseUser && !error) {
        user = {
          id: supabaseUser.id,
          phone: supabaseUser.phone ?? undefined,
          email: supabaseUser.email ?? undefined,
        };
      }
    } catch {
      // Invalid token — user stays null
    }
  }

  return { user, db, serviceDb };
}
