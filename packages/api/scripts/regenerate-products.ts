/**
 * Regenerate product names, descriptions, prices, and tags using catalog AI.
 *
 * Finds a store by name/slug, iterates all its products,
 * calls generateProductFromImages() for each, and updates the DB.
 *
 * Usage:
 *   npx tsx scripts/regenerate-products.ts
 *   STORE_NAME="My Store" npx tsx scripts/regenerate-products.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateProductFromImages } from '../src/services/catalog-ai.service.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const storefrontPublic = resolve(__dirname, '../../storefront/public');

function toBase64DataUri(localUrl: string): string | null {
  if (!localUrl.startsWith('/uploads/')) return null;
  try {
    const buffer = readFileSync(resolve(storefrontPublic, localUrl.slice(1)));
    const mime = localUrl.endsWith('.webp') ? 'image/webp'
      : localUrl.endsWith('.png') ? 'image/png'
      : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function main() {
  const storeName = process.env.STORE_NAME || 'Saskia';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Regenerating products for: ${storeName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ── Find store ──
  const { data: stores, error: storeErr } = await db
    .from('stores')
    .select('id, name, slug, vertical')
    .or(`name.ilike.%${storeName}%,slug.ilike.%${storeName.toLowerCase()}%`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (storeErr || !stores?.length) {
    console.error(`Store not found matching "${storeName}"`);
    process.exit(1);
  }

  const store = stores[0]!;
  const storeId = store.id as string;
  console.log(`Found: ${store.name} (${store.slug}) — ${store.vertical}`);

  // ── Get products ──
  const { data: products, error: prodErr } = await db
    .from('products')
    .select('id, name, slug, price, images')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (prodErr) {
    console.error('Failed to fetch products:', prodErr.message);
    process.exit(1);
  }

  if (!products?.length) {
    console.error('No products found for this store.');
    process.exit(1);
  }

  console.log(`Products: ${products.length}\n`);

  let enriched = 0;
  const totalStart = Date.now();

  for (const product of products) {
    const imgs = (product.images as any[]) || [];
    const imgUrls = imgs
      .map((img: any) => img.originalUrl || img.cardUrl || img.heroUrl)
      .filter(Boolean)
      .slice(0, 3);

    if (imgUrls.length === 0) {
      console.log(`  [skip] ${product.name} — no images`);
      continue;
    }

    // Convert local paths to base64
    const aiImages: string[] = [];
    for (const url of imgUrls) {
      if (url.startsWith('/uploads/')) {
        const b64 = toBase64DataUri(url);
        if (b64) aiImages.push(b64);
      } else if (url.startsWith('http') || url.startsWith('data:')) {
        aiImages.push(url);
      }
    }

    if (aiImages.length === 0) {
      console.log(`  [skip] ${product.name} — images not found on disk`);
      continue;
    }

    try {
      console.log(`  Analyzing: ${product.name} (${aiImages.length} images)...`);
      const { suggestion, processingTimeMs } = await generateProductFromImages({
        imageUrls: aiImages,
        vertical: store.vertical,
        hints: { name: product.name },
      });

      const priceMin = suggestion.suggestedPrice?.min || 0;
      const priceMax = suggestion.suggestedPrice?.max || null;

      await db
        .from('products')
        .update({
          name: suggestion.name || product.name,
          description: suggestion.description || null,
          price: priceMin,
          compare_at_price: priceMax,
          tags: suggestion.tags || [],
          vertical_data: suggestion.verticalAttributes || {},
        })
        .eq('id', product.id);

      enriched++;
      console.log(`  ✓ "${suggestion.name}" — ₹${priceMin}${priceMax ? `-${priceMax}` : ''} (${processingTimeMs}ms)`);
      if (suggestion.tags?.length) {
        console.log(`    tags: ${suggestion.tags.join(', ')}`);
      }
    } catch (err) {
      console.error(`  ✗ Failed for ${product.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const totalMs = Date.now() - totalStart;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${enriched}/${products.length} products enriched in ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
