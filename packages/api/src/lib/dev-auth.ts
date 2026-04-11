import type { SupabaseClient } from '@supabase/supabase-js';

const DEV_EMAIL = 'dev@tatparya.local';
const DEV_PASSWORD = 'dev-tatparya-2024';

/**
 * In development, ensure a dev user exists in Supabase auth and return their ID.
 * Uses the admin API (service role) to create/fetch the user.
 */
export async function getOrCreateDevUser(
  serviceDb: SupabaseClient,
): Promise<{ id: string; email: string }> {
  // Try to find existing dev user by email
  const { data: list, error: listErr } = await serviceDb.auth.admin.listUsers();
  if (listErr) throw new Error(`[dev-auth] Failed to list users: ${listErr.message}`);

  const existing = list.users.find((u) => u.email === DEV_EMAIL);
  if (existing) {
    return { id: existing.id, email: DEV_EMAIL };
  }

  // Create a new dev user
  const { data: created, error: createErr } = await serviceDb.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw new Error(`[dev-auth] Failed to create dev user: ${createErr.message}`);

  return { id: created.user.id, email: DEV_EMAIL };
}
