/**
 * Regenerate AI design for an existing store.
 *
 * Finds the store by name/slug, collects product image URLs,
 * runs Director-Stylist pipeline, and updates store_config.
 *
 * Usage:
 *   npx tsx packages/api/scripts/regenerate-design.ts
 *   STORE_NAME="My Store" npx tsx packages/api/scripts/regenerate-design.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from monorepo root (same as env.ts)
config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateStoreDesign } from '../src/services/store-design-ai.service.js';
import { generateStoreContent } from '../src/services/content-generator.service.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const storeName = process.env.STORE_NAME || 'Saskia';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Regenerating design for: ${storeName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ── Find store ──
  const { data: stores, error: storeErr } = await db
    .from('stores')
    .select('*')
    .or(`name.ilike.%${storeName}%,slug.ilike.%${storeName.toLowerCase()}%`)
    .order('created_at', { ascending: false })
    .limit(5);

  if (storeErr || !stores?.length) {
    console.error(`Store not found matching "${storeName}"`);
    process.exit(1);
  }

  // Pick the most recent match
  const store = stores[0]!;
  const storeId = store.id as string;
  console.log(`Found store: ${store.name} (${store.slug})`);
  console.log(`  ID: ${storeId}`);
  console.log(`  Vertical: ${store.vertical}`);

  // ── Get products and collect image URLs ──
  const { data: products, error: prodErr } = await db
    .from('products')
    .select('id, name, images')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (prodErr) {
    console.error('Failed to fetch products:', prodErr.message);
    process.exit(1);
  }

  console.log(`  Products: ${products?.length || 0}`);

  // Collect image URLs from products — prefer original URLs, limit to 5
  const imageUrls: string[] = [];
  for (const product of products || []) {
    const imgs = (product.images as any[]) || [];
    for (const img of imgs) {
      if (imageUrls.length >= 5) break;
      const url = typeof img === 'object'
        ? (img.originalUrl || img.heroUrl || img.cardUrl)
        : typeof img === 'string' ? img : null;
      if (url && !imageUrls.includes(url)) {
        imageUrls.push(url);
      }
    }
    if (imageUrls.length >= 5) break;
  }

  // If no product images, fall back to media_assets
  if (imageUrls.length === 0) {
    console.log('  No product images found, checking media_assets...');
    const { data: media } = await db
      .from('media_assets')
      .select('original_url')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
      .limit(5);

    for (const m of media || []) {
      if (m.original_url) imageUrls.push(m.original_url as string);
    }
  }

  console.log(`  Images for design: ${imageUrls.length}`);
  for (const url of imageUrls) {
    console.log(`    ${url}`);
  }

  if (imageUrls.length === 0) {
    console.error('ERROR: No images found for this store. Cannot generate design.');
    process.exit(1);
  }

  // Convert local /uploads/ paths to base64 data URIs so the AI can see them
  const designImages: string[] = [];
  for (const url of imageUrls) {
    if (url.startsWith('/uploads/')) {
      // Local file — read and convert to base64
      const { readFileSync } = await import('fs');
      const { join } = await import('path');
      const filePath = join(__dirname, '../../storefront/public', url);
      try {
        const buffer = readFileSync(filePath);
        const b64 = buffer.toString('base64');
        const mime = url.endsWith('.webp') ? 'image/webp'
          : url.endsWith('.png') ? 'image/png'
          : 'image/jpeg';
        designImages.push(`data:${mime};base64,${b64}`);
        console.log(`    Encoded ${url} (${(buffer.length / 1024).toFixed(0)}KB)`);
      } catch (err) {
        console.warn(`    Skipping (file not found): ${url}`);
      }
    } else if (url.startsWith('http')) {
      designImages.push(url);
    } else if (url.startsWith('data:')) {
      designImages.push(url);
    }
  }

  if (designImages.length === 0) {
    console.error('ERROR: No usable images after processing.');
    process.exit(1);
  }

  // ── Get seller context from existing config ──
  const existingConfig = (store.store_config || {}) as Record<string, any>;
  const sellerContext = existingConfig.sellerContext || {};

  // ── Run Director-Stylist pipeline ──
  console.log(`\n  Running Director-Stylist pipeline...`);
  const startMs = Date.now();

  const designResult = await generateStoreDesign({
    storeName: store.name,
    vertical: store.vertical,
    productImages: designImages,
    sellerContext,
    sellerHints: store.description || undefined,
  });

  const elapsedMs = Date.now() - startMs;

  // ── Generate store content (testimonials, marquee, newsletter) ──
  console.log(`\n  Generating store content...`);
  const productNames = (products || []).map((p: any) => p.name).filter(Boolean).slice(0, 5);
  let contentData: Record<string, any> = {};
  try {
    const contentResult = await generateStoreContent({
      storeName: store.name,
      vertical: store.vertical,
      productNames,
      brandPersonality: (designResult.directorDecisions as any)?.brandPersonality,
    });
    contentData = {
      testimonials: contentResult.testimonials,
      marquee: contentResult.marquee,
      newsletter: contentResult.newsletter,
      categories: contentResult.categories,
    };
    console.log(`  Content generated in ${contentResult.processingTimeMs}ms`);
  } catch (err) {
    console.error(`  Content generation failed, skipping:`, err instanceof Error ? err.message : err);
  }

  // ── Update store_config ──
  console.log(`  customCSS: ${designResult.customCSS ? `${designResult.customCSS.length} chars` : 'none'}`);
  const finalConfig = {
    ...existingConfig,
    design: designResult.design,
    heroTagline: designResult.heroTagline,
    heroSubtext: designResult.heroSubtext,
    storeBio: designResult.storeBio,
    sectionContent: (designResult as any).sectionContent || {},
    ...(designResult.customCSS ? { customCSS: designResult.customCSS } : {}),
    ...(Object.keys(contentData).length > 0 ? { content: contentData } : {}),
    sections: {
      homepage: designResult.sectionLayout.map((s: any) => ({
        type: s.type,
        vibeWeight: s.vibeWeight,
        colorIntensity: s.colorIntensity,
        config: {
          variant: s.variant,
          background_hint: s.background_hint,
          position: s.position,
          required: s.required,
        },
      })),
      productPage: existingConfig.sections?.productPage || [],
    },
    language: existingConfig.language || 'en',
    currency: existingConfig.currency || 'INR',
    integrations: existingConfig.integrations || {},
  };

  console.log(`  finalConfig keys: ${Object.keys(finalConfig).join(', ')}`);
  console.log(`  storeId: ${storeId}`);

  const { error: updateErr, data: updateData, count } = await db
    .from('stores')
    .update({
      store_config: finalConfig,
      description: designResult.storeBio,
    })
    .eq('id', storeId)
    .select('id')
    .single();

  if (updateErr) {
    console.error('Failed to update store:', updateErr.message);
    process.exit(1);
  }

  console.log(`  Update result: ${updateData ? 'OK' : 'NO DATA'}, id=${updateData?.id}`);

  // ── Results ──
  const palette = (designResult.design as any)?.palette || {};
  const fonts = (designResult.design as any)?.fonts || {};
  const sections = designResult.sectionLayout || [];

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  DESIGN REGENERATED`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`Store:      ${store.name} (${store.slug})`);
  console.log(`Archetype:  ${designResult.archetypeId || '?'}`);
  console.log(`Hero:       ${designResult.heroTagline}`);
  console.log(`Subtext:    ${designResult.heroSubtext}`);
  console.log(`Bio:        ${designResult.storeBio}`);
  console.log(`Palette:    primary=${palette.primary} bg=${palette.background} text=${palette.text}`);
  console.log(`Fonts:      ${fonts.display} / ${fonts.body}`);
  console.log(`Sections:   ${sections.length}`);
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    console.log(`  [${i}] ${(s.type || '?').padEnd(25)} vibe=${s.vibeWeight ?? '?'} color=${s.colorIntensity ?? '?'}`);
  }
  console.log(`\nTiming:     ${elapsedMs}ms (AI reported: ${designResult.processingTimeMs}ms)`);
  console.log(`\nView:       http://localhost:3000/${store.slug}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
