import type { SupabaseClient } from '@supabase/supabase-js';

const DEV_EMAIL = 'dev@tatparya.local';
const DEV_PASSWORD = 'dev-tatparya-2024';

let cachedDevUser: { id: string; email: string } | null = null;

export async function getOrCreateDevUser(
  serviceDb: SupabaseClient,
): Promise<{ id: string; email: string }> {
  if (cachedDevUser) return cachedDevUser;

  // Try to create the dev user (idempotent — ignore "already exists")
  const { data: created, error: createErr } = await serviceDb.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });

  if (created?.user) {
    cachedDevUser = { id: created.user.id, email: DEV_EMAIL };
    console.log('[dev-auth] Created dev user:', cachedDevUser.id);
    return cachedDevUser;
  }

  // User already exists — sign in to get their ID
  if (createErr) {
    console.log('[dev-auth] createUser returned:', createErr.message, '— trying sign-in');
    const { data: signIn, error: signInErr } = await serviceDb.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });

    if (signIn?.user) {
      cachedDevUser = { id: signIn.user.id, email: DEV_EMAIL };
      console.log('[dev-auth] Signed in as dev user:', cachedDevUser.id);
      return cachedDevUser;
    }

    // Last resort: try admin.listUsers (may work on some Supabase versions)
    try {
      const { data: list } = await serviceDb.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === DEV_EMAIL);
      if (existing) {
        cachedDevUser = { id: existing.id, email: DEV_EMAIL };
        console.log('[dev-auth] Found dev user via listUsers:', cachedDevUser.id);
        return cachedDevUser;
      }
    } catch {}

    throw new Error(`[dev-auth] Cannot create or find dev user: ${createErr.message}${signInErr ? ', sign-in: ' + signInErr.message : ''}`);
  }

  throw new Error('[dev-auth] Unexpected state — no user created and no error');
}
