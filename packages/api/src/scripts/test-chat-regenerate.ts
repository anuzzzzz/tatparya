import { createClient } from '@supabase/supabase-js';
import { executeActions } from '../services/action-executor.js';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: store } = await db.from('stores').select('id, name, vertical').limit(1).single();
  if (!store) { console.error('No stores found'); process.exit(1); }

  console.log(`Testing regenerate_design on: ${store.name} (${store.vertical})`);
  console.log('This will take 10-30 seconds...\n');

  const results = await executeActions(
    [{ type: 'store.regenerate_design', payload: { sellerHints: 'modern minimal look', brandVibe: 'clean and elegant' } }],
    store.id,
    db,
  );

  for (const r of results) {
    console.log(`Action: ${r.action.type}`);
    console.log(`Success: ${r.success}`);
    if (r.error) console.log(`Error: ${r.error}`);
    if (r.data) console.log(`Data:`, JSON.stringify(r.data, null, 2));
  }

  const { data: updated } = await db.from('stores').select('store_config').eq('id', store.id).single();
  const config = updated?.store_config as any;
  console.log('\n--- Verification ---');
  console.log('Has design:', !!config?.design);
  console.log('Has palette:', !!config?.design?.palette);
  console.log('Hero tagline:', config?.heroTagline);
  console.log('Hero subtext:', config?.heroSubtext);
  console.log('Store bio:', config?.storeBio ? config.storeBio.substring(0, 80) + '...' : 'none');
  console.log('Sections:', config?.sections?.homepage?.length || 0, 'homepage sections');
  console.log('Custom CSS:', config?.customCSS ? `${config.customCSS.length} chars` : 'none');
}

main().catch(console.error);
