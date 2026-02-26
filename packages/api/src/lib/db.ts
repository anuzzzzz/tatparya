import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

// ============================================================
// Supabase Client
// Used for: Auth, RLS-aware queries (buyer-facing)
// ============================================================

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }
  return supabase;
}

// ============================================================
// Service-Role Client
// Used for: Backend operations that bypass RLS
// (e.g., event handlers, background workers, cross-store queries)
// ============================================================

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}

// ============================================================
// Database Query Helper
// Every query helper takes store_id as the first parameter.
// This is the PRIMARY isolation mechanism. RLS is the safety net.
// ============================================================

export type DbClient = SupabaseClient;

export interface QueryOptions {
  client?: DbClient;
}

/**
 * Execute a query with mandatory store_id filtering.
 * This is the standard pattern for ALL repository functions.
 */
export function storeQuery(client: DbClient, table: string, storeId: string) {
  return client.from(table).select().eq('store_id', storeId);
}
