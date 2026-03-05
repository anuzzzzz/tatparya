/**
 * Test background removal + branded composite pipeline.
 *
 * Processes all 5 Saskia product images: removes background,
 * composites on a branded gradient, and saves as test-branded-1..5.jpg.
 *
 * Usage:
 *   cd packages/api
 *   npx tsx scripts/test-bg-removal.ts
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env before importing services that read process.env
config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env.local') });

import { removeBackground, compositeOnBrandedBackground } from '../src/services/photo-enhancer.service.js';

const STORE_ID = '3af945cd-e450-4db9-8525-4c705177d3a3';

const PALETTE = {
  primary: '#b38868',
  background: '#fff8f0',
  surface: '#FFF5EE',
};

async function main() {
  const originalsDir = join(
    __dirname,
    '../../storefront/public/uploads/stores',
    STORE_ID,
    'originals',
  );
  const outputDir = join(__dirname, '../../storefront/public/uploads');

  const files = readdirSync(originalsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Background Removal Test — ${files.length} images`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const num = i + 1;
    const inputPath = join(originalsDir, file);
    const inputBuffer = readFileSync(inputPath);

    console.log(`[${num}/${files.length}] ${file} (${(inputBuffer.length / 1024).toFixed(0)}KB)`);

    // Step 1: Remove background
    const t1 = Date.now();
    const noBgBuffer = await removeBackground(inputBuffer);
    console.log(`  bg removal: ${Date.now() - t1}ms — ${(noBgBuffer.length / 1024).toFixed(0)}KB`);

    // Step 2: Composite on branded gradient
    const t2 = Date.now();
    const brandedBuffer = await compositeOnBrandedBackground(noBgBuffer, PALETTE);
    console.log(`  composite:  ${Date.now() - t2}ms — ${(brandedBuffer.length / 1024).toFixed(0)}KB`);

    const outputPath = join(outputDir, `test-branded-${num}.jpg`);
    writeFileSync(outputPath, brandedBuffer);
    console.log(`  saved:      test-branded-${num}.jpg`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  DONE — ${files.length} images processed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\nView at:`);
  for (let i = 1; i <= files.length; i++) {
    console.log(`  http://localhost:3000/uploads/test-branded-${i}.jpg`);
  }
  console.log(``);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
