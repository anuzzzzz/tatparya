import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const { data: store } = await db
    .from('stores')
    .select('id, slug')
    .eq('slug', 'saskia-mmgxy6oa')
    .single();

  console.log('Store:', store);
  if (!store) {
    console.log('Store not found');
    return;
  }

  const { data: products } = await db
    .from('products')
    .select('name, images, slug')
    .eq('store_id', store.id)
    .order('created_at');

  const uploadsBase = join(__dirname, '../../storefront/public');

  for (const p of products || []) {
    const imgs = p.images as any[];
    const imgPath = typeof imgs?.[0] === 'string' ? imgs[0] : typeof imgs?.[0] === 'object' ? imgs[0]?.originalUrl : 'none';
    const diskPath = join(uploadsBase, imgPath || '');
    const exists = imgPath ? existsSync(diskPath) : false;
    console.log(`${p.name}: ${imgPath} → ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  // Also list what's on disk
  console.log('\nFiles on disk:');
  const uploadsDir = join(uploadsBase, 'uploads/saskia');
  if (existsSync(uploadsDir)) {
    const { readdirSync } = await import('fs');
    for (const f of readdirSync(uploadsDir)) {
      console.log(`  ${f}`);
    }
  } else {
    console.log('  uploads/saskia/ does not exist');
  }
}

main().catch(console.error);
