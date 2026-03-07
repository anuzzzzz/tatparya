/**
 * Nuke all Saskia stores and recreate from scratch.
 *
 * Usage: npx tsx packages/api/scripts/nuke-and-create-saskia.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateStoreDesign } from '../src/services/store-design-ai.service.js';
import { generateStoreContent } from '../src/services/content-generator.service.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Mock product data for Saskia (fashion vertical) ──
const MOCK_PRODUCTS = [
  {
    name: 'Embroidered Anarkali Kurta Set',
    description: 'Elegant hand-embroidered Anarkali kurta with matching dupatta. Crafted in pure cotton with intricate threadwork.',
    price: 2499,
    compare_at_price: 3999,
    images: ['/uploads/saskia/product-1.webp'],
  },
  {
    name: 'Block Print Palazzo Set',
    description: 'Traditional Rajasthani block print palazzo set in soft mulmul fabric. Perfect for everyday elegance.',
    price: 1899,
    compare_at_price: 2799,
    images: ['/uploads/saskia/product-2.webp'],
  },
  {
    name: 'Chanderi Silk Dupatta',
    description: 'Handwoven Chanderi silk dupatta with gold zari border. A timeless accessory for any outfit.',
    price: 1299,
    compare_at_price: null,
    images: ['/uploads/saskia/product-3.webp'],
  },
  {
    name: 'Indigo Dyed Shirt Dress',
    description: 'Contemporary shirt dress in natural indigo dye. Relaxed fit with wooden buttons and side pockets.',
    price: 2199,
    compare_at_price: 2999,
    images: ['/uploads/saskia/product-4.webp'],
  },
  {
    name: 'Khadi Cotton Wrap Skirt',
    description: 'Versatile wrap skirt in handspun khadi cotton. Adjustable waist, one size fits most.',
    price: 1599,
    compare_at_price: null,
    images: ['/uploads/saskia/product-5.webp'],
  },
  {
    name: 'Chikankari White Kurta',
    description: 'Classic Lucknowi chikankari kurta in breathable white cotton. Delicate hand-embroidery all over.',
    price: 2899,
    compare_at_price: 4499,
    images: ['/uploads/saskia/product-6.webp'],
  },
];

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  NUKING old Saskia stores...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Delete all existing Saskia stores ──
  const { data: oldStores } = await db.from('stores').select('id, slug').ilike('name', '%Saskia%');
  if (oldStores && oldStores.length > 0) {
    const ids = oldStores.map(s => s.id);
    console.log(`  Found ${ids.length} old Saskia store(s), deleting...`);

    // Delete dependent tables first
    for (const table of ['order_items', 'orders', 'cart_items', 'products', 'media_assets']) {
      const { error } = await db.from(table).delete().in('store_id', ids);
      if (error && !error.message.includes('0 rows')) {
        console.log(`  ${table}: ${error.message}`);
      } else {
        console.log(`  ${table}: cleared`);
      }
    }

    const { error: se } = await db.from('stores').delete().in('id', ids);
    console.log(`  stores: ${se ? se.message : 'deleted'}`);
  } else {
    console.log('  No old Saskia stores found.');
  }

  // ── Create or find a dummy owner ──
  let ownerId: string;

  // Always create a fresh user with unique email
  const uniqueEmail = `saskia-${Date.now()}@tatparya.local`;
  const { data: newUser, error: userErr } = await db.auth.admin.createUser({
    email: uniqueEmail,
    password: 'demo-password-123',
    email_confirm: true,
  });

  if (!newUser?.user) {
    console.error('Failed to create demo user:', userErr?.message);
    process.exit(1);
  }
  ownerId = newUser.user.id;
  console.log(`  Created demo user: ${ownerId} (${uniqueEmail})`);

  // ── Create new store ──
  console.log('\n  Creating new Saskia store...');
  const slug = `saskia-${Date.now().toString(36)}`;

  const { data: newStore, error: createErr } = await db
    .from('stores')
    .insert({
      name: 'Saskia',
      slug,
      vertical: 'fashion',
      description: 'Contemporary Indian fashion rooted in traditional craft',
      owner_id: ownerId,
      store_config: {},
      whatsapp_config: { businessPhone: '919876543210' },
    })
    .select()
    .single();

  if (createErr || !newStore) {
    console.error('Failed to create store:', createErr?.message);
    process.exit(1);
  }

  const storeId = newStore.id as string;
  console.log(`  Created: ${newStore.name} (${slug})`);
  console.log(`  ID: ${storeId}`);

  // ── Insert mock products ──
  console.log('\n  Adding mock products...');
  const productRows = MOCK_PRODUCTS.map((p, i) => ({
    store_id: storeId,
    name: p.name,
    description: p.description,
    price: p.price,
    compare_at_price: p.compare_at_price,
    images: p.images,
    status: 'active',
    slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
  }));

  const { data: products, error: prodErr } = await db
    .from('products')
    .insert(productRows)
    .select('id, name, images');

  if (prodErr) {
    console.error('Failed to insert products:', prodErr.message);
    process.exit(1);
  }

  console.log(`  Inserted ${products?.length || 0} products`);

  // ── Prepare images for AI ──
  const designImages: string[] = [];
  const repoRoot = join(__dirname, '../../..');

  // Look for JPG images in the repo root directory
  const { readdirSync } = await import('fs');
  const rootFiles = readdirSync(repoRoot).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log(`  Found ${rootFiles.length} image(s) in repo root`);

  for (const file of rootFiles.slice(0, 5)) {
    const imgPath = join(repoRoot, file);
    if (existsSync(imgPath)) {
      const buffer = readFileSync(imgPath);
      const mime = file.toLowerCase().endsWith('.png') ? 'image/png'
        : file.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      designImages.push(`data:${mime};base64,${buffer.toString('base64')}`);
      console.log(`  Encoded: ${file} (${(buffer.length / 1024).toFixed(0)}KB)`);
    }
  }

  // Also copy images to uploads dir for storefront to serve
  if (designImages.length > 0) {
    const uploadsDir = join(__dirname, '../../storefront/public/uploads/saskia');
    const { mkdirSync, copyFileSync } = await import('fs');
    mkdirSync(uploadsDir, { recursive: true });
    rootFiles.slice(0, 6).forEach((file, i) => {
      const src = join(repoRoot, file);
      const dest = join(uploadsDir, `product-${i + 1}.jpg`);
      copyFileSync(src, dest);
      console.log(`  Copied: ${file} → uploads/saskia/product-${i + 1}.jpg`);
    });
  }

  if (designImages.length === 0) {
    console.log('  No images found, using product names only for AI');
  }

  // ── Run Director-Stylist pipeline ──
  console.log('\n  Running Director-Stylist pipeline...');
  const startMs = Date.now();

  const designResult = await generateStoreDesign({
    storeName: 'Saskia',
    vertical: 'fashion',
    productImages: designImages.length > 0 ? designImages : [],
    sellerHints: 'Contemporary Indian fashion rooted in traditional craft. Ethnic wear with modern silhouettes.',
  });

  const designMs = Date.now() - startMs;
  console.log(`  Design generated in ${designMs}ms`);

  // ── Generate store content ──
  console.log('\n  Generating store content...');
  const productNames = MOCK_PRODUCTS.map(p => p.name);

  const contentResult = await generateStoreContent({
    storeName: 'Saskia',
    vertical: 'fashion',
    productNames,
    brandPersonality: (designResult.directorDecisions as any)?.brandPersonality,
  });

  console.log(`  Content generated in ${contentResult.processingTimeMs}ms`);

  // ── Build final config ──
  const finalConfig = {
    design: designResult.design,
    heroTagline: designResult.heroTagline,
    heroSubtext: designResult.heroSubtext,
    storeBio: designResult.storeBio,
    sectionContent: (designResult as any).sectionContent || {},
    ...(designResult.customCSS ? { customCSS: designResult.customCSS } : {}),
    content: {
      testimonials: contentResult.testimonials,
      marquee: contentResult.marquee,
      newsletter: contentResult.newsletter,
      categories: contentResult.categories,
      aboutPage: contentResult.aboutPage,
    },
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
      productPage: [],
    },
    language: 'en',
    currency: 'INR',
    integrations: {},
  };

  // ── Update store with config ──
  const { error: updateErr } = await db
    .from('stores')
    .update({
      store_config: finalConfig,
      description: designResult.storeBio,
    })
    .eq('id', storeId)
    .select('id')
    .single();

  if (updateErr) {
    console.error('Failed to update store config:', updateErr.message);
    process.exit(1);
  }

  // ── Print results ──
  const palette = (designResult.design as any)?.palette || {};
  const fonts = (designResult.design as any)?.fonts || {};
  const sections = designResult.sectionLayout || [];

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SASKIA STORE CREATED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Store:      Saskia (${slug})`);
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
  console.log(`\nContent:`);
  console.log(`  Testimonials: ${contentResult.testimonials.length}`);
  console.log(`  Marquee: ${contentResult.marquee.length} phrases`);
  console.log(`  Categories: ${contentResult.categories.join(', ')}`);
  console.log(`  About page: ${contentResult.aboutPage.founderStory ? 'yes' : 'fallback'}`);
  console.log(`\nTiming:     Design ${designMs}ms + Content ${contentResult.processingTimeMs}ms`);
  console.log(`\nView:       http://localhost:3000/${slug}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
