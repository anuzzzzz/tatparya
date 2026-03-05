import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PhotoClassification } from './photo-classifier.service.js';

// ============================================================
// Photo Enhancer Service
//
// Processes seller photos based on classification results.
// Each enhancement is independent — if one fails, others
// still apply.
//
// Pipeline per photo:
//   1. Background removal (rembg → white bg composite)
//   2. Lighting normalization (auto-levels, brightness)
//   3. White balance correction (neutralize color casts)
//   4. Smart crop (detect product bounds, crop to fill)
//   5. Sharpen (gentle unsharp mask)
//   6. Generate all size variants (hero, card, thumb, square, og)
//
// All operations use Sharp (already in stack) except bg removal
// which shells out to Python rembg.
// ============================================================

export interface EnhancementResult {
  imageIndex: number;
  success: boolean;
  enhancedBuffer?: Buffer;
  noBgBuffer?: Buffer;        // Transparent PNG (for overlays)
  whiteBgBuffer?: Buffer;     // White background composite
  metadata?: {
    width: number;
    height: number;
    format: string;
    originalWidth: number;
    originalHeight: number;
    enhancementsApplied: string[];
  };
  error?: string;
}

export interface SizeVariants {
  hero: Buffer;       // 1200×1600, cover crop
  card: Buffer;       // 600×800, cover crop
  thumbnail: Buffer;  // 300×400, cover crop
  square: Buffer;     // 800×800, cover crop
  og: Buffer;         // 1200×630, cover crop
  banner: Buffer;     // 1600×600, cover crop (for hero/collection banners)
}

const TMP_DIR = join(tmpdir(), 'tatparya-enhance');

// Ensure temp directory exists
if (!existsSync(TMP_DIR)) {
  mkdirSync(TMP_DIR, { recursive: true });
}


// ============================================================
// Main: Enhance a single photo
// ============================================================

export async function enhancePhoto(
  imageBuffer: Buffer,
  classification: PhotoClassification,
): Promise<EnhancementResult> {
  const needs = new Set(classification.enhancementNeeds);
  const applied: string[] = [];
  let buffer = imageBuffer;

  // Get original metadata
  const originalMeta = await sharp(buffer).metadata();
  const originalWidth = originalMeta.width || 0;
  const originalHeight = originalMeta.height || 0;

  let noBgBuffer: Buffer | undefined;
  let whiteBgBuffer: Buffer | undefined;

  try {
    // ── Step 1: Background Removal ──
    if (needs.has('bg_removal') && classification.category === 'product') {
      try {
        noBgBuffer = await removeBackground(buffer);
        // Composite onto white background for product cards
        whiteBgBuffer = await compositeOnWhite(noBgBuffer, originalWidth, originalHeight);
        buffer = whiteBgBuffer;
        applied.push('bg_removal');
      } catch (err) {
        console.warn(`[enhancer] bg_removal failed for image ${classification.imageIndex}:`, err);
        // Continue with original — bg removal is nice-to-have, not critical
      }
    }

    // ── Step 2: Lighting Normalization ──
    if (needs.has('lighting_fix') || classification.quality.lighting <= 2) {
      buffer = await normalizeLighting(buffer);
      applied.push('lighting_fix');
    }

    // ── Step 3: White Balance ──
    if (needs.has('white_balance')) {
      buffer = await correctWhiteBalance(buffer);
      applied.push('white_balance');
    }

    // ── Step 4: Smart Crop ──
    if (needs.has('crop') || classification.quality.composition <= 2) {
      buffer = await smartCrop(buffer);
      applied.push('crop');
    }

    // ── Step 5: Sharpen ──
    if (needs.has('sharpen') || (originalWidth > 800 && classification.quality.overall >= 4)) {
      buffer = await gentleSharpen(buffer);
      applied.push('sharpen');
    }

    // If no enhancements were needed, still normalize the image format
    if (applied.length === 0) {
      buffer = await sharp(buffer)
        .webp({ quality: 90 })
        .toBuffer();
      applied.push('format_normalize');
    }

    const finalMeta = await sharp(buffer).metadata();

    return {
      imageIndex: classification.imageIndex,
      success: true,
      enhancedBuffer: buffer,
      noBgBuffer,
      whiteBgBuffer,
      metadata: {
        width: finalMeta.width || 0,
        height: finalMeta.height || 0,
        format: finalMeta.format || 'webp',
        originalWidth,
        originalHeight,
        enhancementsApplied: applied,
      },
    };
  } catch (err) {
    return {
      imageIndex: classification.imageIndex,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown enhancement error',
    };
  }
}


// ============================================================
// Generate all size variants from enhanced buffer
// ============================================================

export async function generateSizeVariants(
  buffer: Buffer,
  sectionHint: PhotoClassification['sectionHint'],
): Promise<Partial<SizeVariants>> {
  const variants: Partial<SizeVariants> = {};

  const configs = getSizeConfigs(sectionHint);

  await Promise.all(
    Object.entries(configs).map(async ([name, config]) => {
      try {
        const resized = await sharp(buffer)
          .resize(config.width, config.height, {
            fit: 'cover',
            position: config.position || 'centre',
            withoutEnlargement: false,  // Allow upscaling for small images
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .webp({ quality: config.quality || 85 })
          .toBuffer();
        (variants as any)[name] = resized;
      } catch (err) {
        console.warn(`[enhancer] variant ${name} failed:`, err);
      }
    })
  );

  return variants;
}


// ============================================================
// Background Removal (rembg via Python subprocess)
//
// Shells out to rembg CLI. Input: original buffer.
// Output: RGBA PNG with transparent background.
//
// If rembg is not installed, throws (caller should catch).
// ============================================================

export async function removeBackground(
  inputBuffer: Buffer,
  options?: { size?: 'regular' | 'full' },
): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) throw new Error('REMOVE_BG_API_KEY not configured');

  const formData = new FormData();
  formData.append('image_file', new Blob([inputBuffer]), 'image.jpg');
  formData.append('size', options?.size || 'regular'); // regular = 625x400 max (cheapest)
  formData.append('type', 'product');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`remove.bg ${response.status}: ${errText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}


// ============================================================
// Composite transparent PNG onto white background
// ============================================================

async function compositeOnWhite(
  transparentPng: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  // Get dimensions of the transparent image
  const meta = await sharp(transparentPng).metadata();
  const w = meta.width || width;
  const h = meta.height || height;

  // Create white background and composite
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: transparentPng, blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer();
}


// ============================================================
// Composite on Branded Gradient Background
//
// Takes a transparent PNG (bg-removed product), composites it
// centered on a 600×800 canvas with a gradient background
// derived from the store palette, plus a subtle drop shadow.
// ============================================================

export async function compositeOnBrandedBackground(
  transparentPng: Buffer,
  palette: { primary: string; background: string; surface: string },
  options?: { width?: number; height?: number; padding?: number },
): Promise<Buffer> {
  const canvasW = options?.width || 600;
  const canvasH = options?.height || 800;
  const padding = options?.padding || 0.12; // 12% padding

  // Parse palette colors to RGB
  const parseHex = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const surfaceRgb = parseHex(palette.surface);
  const bgRgb = parseHex(palette.background);

  // Create gradient background: surface at top → background at bottom (135deg feel)
  // Sharp doesn't do CSS gradients, so we create two halves and blend
  const topHalf = await sharp({
    create: {
      width: canvasW,
      height: Math.floor(canvasH / 2),
      channels: 4 as const,
      background: { r: surfaceRgb.r, g: surfaceRgb.g, b: surfaceRgb.b, alpha: 255 },
    },
  }).png().toBuffer();

  const bottomHalf = await sharp({
    create: {
      width: canvasW,
      height: Math.ceil(canvasH / 2),
      channels: 4 as const,
      background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 255 },
    },
  }).png().toBuffer();

  // Stack top + bottom to create a simple two-tone gradient
  const gradientBg = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4 as const,
      background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 255 },
    },
  })
    .composite([
      { input: topHalf, top: 0, left: 0 },
      { input: bottomHalf, top: Math.floor(canvasH / 2), left: 0 },
    ])
    .png()
    .toBuffer();

  // Trim transparent pixels to get tight content bounds
  const trimmed = await sharp(transparentPng)
    .trim()
    .png()
    .toBuffer();

  // Resize trimmed product to fit within padded area
  const padPx = Math.round(canvasW * padding);
  const maxProductW = canvasW - padPx * 2;
  const maxProductH = canvasH - padPx * 2;

  const resizedProduct = await sharp(trimmed)
    .resize(maxProductW, maxProductH, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const productMeta = await sharp(resizedProduct).metadata();
  const pW = productMeta.width || maxProductW;
  const pH = productMeta.height || maxProductH;

  // Center product on canvas
  const left = Math.round((canvasW - pW) / 2);
  const top = Math.round((canvasH - pH) / 2);

  // Create a subtle drop shadow: slightly offset, blurred version of the product
  const shadowOffset = 6;
  const shadowBlur = 12;
  const shadow = await sharp(resizedProduct)
    .greyscale()
    .modulate({ brightness: 0.0 })  // Make black
    .blur(shadowBlur)
    .ensureAlpha(0.25)               // 25% opacity
    .png()
    .toBuffer();

  // Composite: gradient bg → shadow → product
  const result = await sharp(gradientBg)
    .composite([
      { input: shadow, top: top + shadowOffset, left: left + shadowOffset, blend: 'over' },
      { input: resizedProduct, top, left, blend: 'over' },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  return result;
}


// ============================================================
// Lighting Normalization
//
// - Normalize (stretch histogram to full range)
// - Slight brightness boost (Indian phone photos are often dark)
// - Increase contrast slightly
// ============================================================

async function normalizeLighting(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .normalize()                      // Stretch histogram
    .modulate({
      brightness: 1.08,               // Slight brightness boost
      saturation: 1.05,               // Slight saturation boost
    })
    .gamma(1.1)                        // Lift shadows slightly
    .toBuffer();
}


// ============================================================
// White Balance Correction
//
// Neutralize yellow/blue color casts.
// Uses tint adjustment — negative b shifts away from yellow.
// This is approximate but handles the common case of
// tungsten/tubelight yellow cast.
// ============================================================

async function correctWhiteBalance(buffer: Buffer): Promise<Buffer> {
  // Sharp doesn't have direct white balance, but we can:
  // 1. Convert to LAB, adjust b channel, convert back
  // For simplicity, use modulate with slight hue shift
  // and reduce saturation of warm tones
  return sharp(buffer)
    .modulate({
      saturation: 0.95,                // Slightly desaturate (reduces cast)
    })
    .tint({ r: 248, g: 248, b: 255 }) // Very slight cool tint
    .toBuffer();
}


// ============================================================
// Smart Crop
//
// Uses Sharp's attention-based crop to focus on the
// most interesting part of the image (usually the product).
// ============================================================

async function smartCrop(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 800;

  // Only crop if the image has excess space
  // Target: product fills at least 60% of frame
  const targetW = Math.round(w * 0.85);
  const targetH = Math.round(h * 0.85);

  return sharp(buffer)
    .resize(targetW, targetH, {
      fit: 'cover',
      position: 'attention',  // Sharp's attention-based crop
    })
    .toBuffer();
}


// ============================================================
// Gentle Sharpen
//
// Light unsharp mask — improves perceived sharpness without
// creating halos or artifacts.
// ============================================================

async function gentleSharpen(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .sharpen({
      sigma: 0.8,        // Gentle radius
      m1: 0.8,           // Flat area sharpening (restrained)
      m2: 1.2,           // Jagged area sharpening (slightly more)
    })
    .toBuffer();
}


// ============================================================
// Size config per section hint
// ============================================================

function getSizeConfigs(sectionHint: PhotoClassification['sectionHint']): Record<string, {
  width: number; height: number; quality?: number; position?: string;
}> {
  const base = {
    thumbnail: { width: 300, height: 400, quality: 80 },
    square: { width: 800, height: 800, quality: 85 },
    og: { width: 1200, height: 630, quality: 85 },
  };

  switch (sectionHint) {
    case 'hero':
      return {
        ...base,
        hero: { width: 1600, height: 900, quality: 90, position: 'attention' },
        banner: { width: 1920, height: 720, quality: 88, position: 'attention' },
        card: { width: 600, height: 800, quality: 85 },
      };

    case 'collection_banner':
      return {
        ...base,
        banner: { width: 1600, height: 600, quality: 88, position: 'attention' },
        hero: { width: 1200, height: 800, quality: 88 },
        card: { width: 600, height: 800, quality: 85 },
      };

    case 'about':
      return {
        ...base,
        hero: { width: 1200, height: 800, quality: 88 },
        card: { width: 600, height: 600, quality: 85 },
      };

    case 'product_card':
    default:
      return {
        ...base,
        hero: { width: 1200, height: 1600, quality: 90 },
        card: { width: 600, height: 800, quality: 85 },
      };
  }
}


// ============================================================
// Batch enhance: process multiple photos
// ============================================================

export async function enhancePhotoBatch(
  imageBuffers: Buffer[],
  classifications: PhotoClassification[],
  options?: {
    concurrency?: number;
    skipBgRemoval?: boolean;
  },
): Promise<EnhancementResult[]> {
  const concurrency = options?.concurrency || 2;
  const results: EnhancementResult[] = [];

  // Filter out junk photos — don't waste processing
  const toProcess = classifications.filter(c => c.category !== 'junk');

  // Process in batches to control memory pressure
  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (classification) => {
        const buffer = imageBuffers[classification.imageIndex];
        if (!buffer) {
          return {
            imageIndex: classification.imageIndex,
            success: false,
            error: 'No buffer for image index',
          };
        }

        // Skip bg removal if requested
        if (options?.skipBgRemoval) {
          classification = {
            ...classification,
            enhancementNeeds: classification.enhancementNeeds.filter(n => n !== 'bg_removal'),
          };
        }

        return enhancePhoto(buffer, classification);
      })
    );

    results.push(...batchResults);
  }

  // Add skipped junk entries
  for (const c of classifications.filter(c => c.category === 'junk')) {
    results.push({
      imageIndex: c.imageIndex,
      success: false,
      error: 'Skipped: classified as junk',
    });
  }

  return results.sort((a, b) => a.imageIndex - b.imageIndex);
}
