import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const { data } = await db
  .from('stores')
  .select('name, slug, vertical')
  .order('created_at', { ascending: false })
  .limit(20);

for (const s of data || []) {
  console.log(`${(s.name || '').padEnd(30)} ${(s.slug || '').padEnd(30)} ${s.vertical}`);
}
