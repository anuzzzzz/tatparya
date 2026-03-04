import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

import { triagePhotos } from './photo-triage-ai.service.js';
import {
  classifyPhotos,
  assignPhotosToSections,
  type PhotoClassification,
  type SectionPhotoAssignment,
} from './photo-classifier.service.js';
import {
  enhancePhotoBatch,
  generateSizeVariants,
  type EnhancementResult,
} from './photo-enhancer.service.js';
import {
  fastQualityGate,
  visionQualityGate,
  assessStoreReadiness,
  type QualityGateResult,
  type StoreReadinessResult,
} from './photo-quality-gate.service.js';
import { uploadBuffer, buildMediaKey, downloadBuffer } from '../lib/storage.js';
import { emitEvent } from '../lib/event-bus.js';

// ============================================================
// Photo Pipeline Orchestrator
//
// Full pipeline from raw seller uploads to store-ready images:
//
//   1. TRIAGE       — Group photos by product (existing service)
//   2. CLASSIFY     — Category, quality, section assignment
//   3. ENHANCE      — BG removal, lighting, crop, sharpen
//   4. QUALITY GATE — Score processed images
//   5. SIZE VARIANTS — Generate all responsive sizes
//   6. UPLOAD       — Push to R2/local storage
//   7. ASSIGN       — Map photos to store sections
//
// Entry point: processSellerPhotos()
//
// Designed for the "Draft vs Production" pattern:
//   - Draft mode: Skip enhancement, use originals with CSS
//   - Production mode: Full pipeline on "Publish Store"
// ============================================================

export interface PipelineInput {
  storeId: string;
  mediaIds: string[];           // IDs from media_assets table
  vertical?: string;
  mode: 'draft' | 'production';
  db: SupabaseClient;
  /** Pre-loaded image buffers — skips storage download when provided (useful for dev/testing) */
  preloadedBuffers?: Buffer[];
}

export interface PipelineOutput {
  // Triage results
  triage: {
    groups: Array<{ imageIndices: number[]; label: string; confidence: number }>;
    needsConfirmation: boolean;
    confirmationMessage?: string;
  };

  // Classification results
  classifications: PhotoClassification[];
  sectionAssignment: SectionPhotoAssignment;

  // Enhancement results (production mode only)
  enhancements?: EnhancementResult[];

  // Quality assessment
  storeReadiness: StoreReadinessResult;

  // Upload results — mediaId → variant URLs
  uploadedVariants: Record<string, Record<string, string>>;

  // Timing
  timing: {
    triageMs: number;
    classifyMs: number;
    enhanceMs: number;
    uploadMs: number;
    totalMs: number;
  };

  // Seller-facing summary
  summary: {
    totalPhotos: number;
    usablePhotos: number;
    enhancedPhotos: number;
    skippedPhotos: number;
    overallScore: number;
    message: string;
    suggestions: string[];
  };
}


// ============================================================
// Main Pipeline
// ============================================================

export async function processSellerPhotos(input: PipelineInput): Promise<PipelineOutput> {
  const totalStart = Date.now();
  const { storeId, mediaIds, vertical, mode, db } = input;

  console.log(`[photo-pipeline] Starting ${mode} pipeline for store ${storeId}, ${mediaIds.length} photos`);

  // ── Step 0: Load image buffers & generate thumbnails ──
  const imageBuffers: Buffer[] = [];
  const thumbnailDataUrls: string[] = [];

  if (input.preloadedBuffers?.length) {
    // Use pre-loaded buffers (dev/testing path — skip storage download)
    for (let i = 0; i < input.preloadedBuffers.length; i++) {
      const buffer = input.preloadedBuffers[i]!;
      imageBuffers.push(buffer);

      try {
        const thumb = await sharp(buffer)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
        thumbnailDataUrls.push(`data:image/jpeg;base64,${thumb.toString('base64')}`);
      } catch (err) {
        console.warn(`[photo-pipeline] Failed to create thumbnail for preloaded buffer ${i}:`, err);
      }
    }
  } else {
    // Production path — load from storage
    for (const mediaId of mediaIds) {
      const { data: media } = await db
        .from('media_assets')
        .select('original_key, original_url')
        .eq('id', mediaId)
        .eq('store_id', storeId)
        .single();

      if (!media) {
        console.warn(`[photo-pipeline] Media ${mediaId} not found, skipping`);
        continue;
      }

      try {
        const buffer = await downloadBuffer(media.original_key);
        imageBuffers.push(buffer);

        // Generate thumbnail for AI classification (512px max, low quality)
        const thumb = await sharp(buffer)
          .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();

        const b64 = thumb.toString('base64');
        thumbnailDataUrls.push(`data:image/jpeg;base64,${b64}`);
      } catch (err) {
        console.warn(`[photo-pipeline] Failed to load ${mediaId}:`, err);
      }
    }
  }

  if (thumbnailDataUrls.length === 0) {
    return emptyResult('No photos could be loaded. Please try uploading again.');
  }

  // ── Step 1: TRIAGE (group by product) ──
  const triageStart = Date.now();
  const triageResult = await triagePhotos(thumbnailDataUrls);
  const triageMs = Date.now() - triageStart;
  console.log(`[photo-pipeline] Triage: ${triageResult.groups.length} groups in ${triageMs}ms`);

  // ── Step 2: CLASSIFY (category + quality + section hints) ──
  const classifyStart = Date.now();
  const classResult = await classifyPhotos(thumbnailDataUrls, vertical);
  const classifyMs = Date.now() - classifyStart;
  console.log(`[photo-pipeline] Classify: ${classResult.summary.usablePhotos} usable, avg quality ${classResult.summary.averageQuality} in ${classifyMs}ms`);

  // Assign photos to store sections
  const sectionAssignment = assignPhotosToSections(classResult.classifications);

  // ── Step 3: ENHANCE (production mode only) ──
  const enhanceStart = Date.now();
  let enhancements: EnhancementResult[] | undefined;

  if (mode === 'production') {
    enhancements = await enhancePhotoBatch(
      imageBuffers,
      classResult.classifications,
      { concurrency: 2, skipBgRemoval: false },
    );
    console.log(`[photo-pipeline] Enhanced: ${enhancements.filter(e => e.success).length}/${enhancements.length} in ${Date.now() - enhanceStart}ms`);
  }
  const enhanceMs = Date.now() - enhanceStart;

  // ── Step 4: QUALITY GATE ──
  const gateResults: QualityGateResult[] = [];

  for (const classification of classResult.classifications) {
    if (classification.category === 'junk') {
      gateResults.push({
        imageIndex: classification.imageIndex,
        publishReady: false,
        score: 1,
        tier: 'draft',
        nudge: 'This photo doesn\'t seem to be a product photo.',
      });
      continue;
    }

    const enhancement = enhancements?.find(e => e.imageIndex === classification.imageIndex);

    if (enhancement && enhancement.success) {
      // Score the enhanced photo
      const gate = fastQualityGate(classification, enhancement);

      // For hero images, optionally use vision gate for higher accuracy
      if (
        classification.sectionHint === 'hero' &&
        enhancement.enhancedBuffer &&
        mode === 'production'
      ) {
        try {
          const enhancedThumb = await sharp(enhancement.enhancedBuffer)
            .resize(512, 512, { fit: 'inside' })
            .jpeg({ quality: 60 })
            .toBuffer();
          const dataUrl = `data:image/jpeg;base64,${enhancedThumb.toString('base64')}`;
          const visionGate = await visionQualityGate(dataUrl, classification);
          // Average fast + vision scores
          gate.score = Math.round(((gate.score + visionGate.score) / 2) * 10) / 10;
          gate.tier = gate.score >= 8 ? 'premium' : gate.score >= 5 ? 'standard' : 'draft';
          gate.nudge = visionGate.nudge || gate.nudge;
        } catch {
          // Vision gate failed, keep fast gate result
        }
      }

      gateResults.push(gate);
    } else {
      // Draft mode or enhancement failed — score based on classification only
      gateResults.push(fastQualityGate(classification, {
        imageIndex: classification.imageIndex,
        success: false,
        error: mode === 'draft' ? 'Draft mode' : 'Enhancement failed',
      }));
    }
  }

  const storeReadiness = assessStoreReadiness(gateResults, sectionAssignment.hero);

  // ── Step 5 & 6: SIZE VARIANTS + UPLOAD ──
  const uploadStart = Date.now();
  const uploadedVariants: Record<string, Record<string, string>> = {};

  for (let i = 0; i < mediaIds.length; i++) {
    const mediaId = mediaIds[i]!;
    const classification = classResult.classifications[i];
    if (!classification || classification.category === 'junk') continue;

    const gateResult = gateResults.find(g => g.imageIndex === i);
    if (!gateResult?.publishReady) continue;

    // Use enhanced buffer if available, else original
    const enhancement = enhancements?.find(e => e.imageIndex === i);
    const sourceBuffer = (enhancement?.success && enhancement.enhancedBuffer)
      ? enhancement.enhancedBuffer
      : imageBuffers[i];

    if (!sourceBuffer) continue;

    try {
      // Generate size variants
      const variants = await generateSizeVariants(sourceBuffer, classification.sectionHint);
      const urls: Record<string, string> = {};

      // Upload each variant
      for (const [variantName, buffer] of Object.entries(variants)) {
        if (!buffer) continue;
        const key = buildMediaKey(storeId, mediaId, variantName, 'webp');
        const url = await uploadBuffer({ key, body: buffer as Buffer, contentType: 'image/webp' });
        urls[variantName] = url;
      }

      // Also upload the no-bg transparent PNG if available (useful for overlays)
      if (enhancement?.noBgBuffer) {
        const noBgKey = buildMediaKey(storeId, mediaId, 'nobg', 'png');
        const noBgUrl = await uploadBuffer({
          key: noBgKey,
          body: enhancement.noBgBuffer,
          contentType: 'image/png',
        });
        urls['nobg'] = noBgUrl;
      }

      uploadedVariants[mediaId] = urls;

      // Update media_assets row
      await db
        .from('media_assets')
        .update({
          hero_url: urls['hero'] || null,
          card_url: urls['card'] || null,
          thumbnail_url: urls['thumbnail'] || null,
          square_url: urls['square'] || null,
          og_url: urls['og'] || null,
          enhancement_status: 'done',
          enhancement_error: null,
          ai_analysis: {
            classification: {
              category: classification.category,
              quality: classification.quality,
              sectionHint: classification.sectionHint,
              enhancementsApplied: enhancement?.metadata?.enhancementsApplied || [],
            },
            qualityGate: {
              score: gateResult.score,
              tier: gateResult.tier,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', mediaId)
        .eq('store_id', storeId);

    } catch (err) {
      console.error(`[photo-pipeline] Upload failed for ${mediaId}:`, err);
      uploadedVariants[mediaId] = {};

      await db
        .from('media_assets')
        .update({
          enhancement_status: 'failed',
          enhancement_error: err instanceof Error ? err.message : 'Upload failed',
        })
        .eq('id', mediaId)
        .eq('store_id', storeId);
    }
  }

  const uploadMs = Date.now() - uploadStart;

  // ── Emit events ──
  await emitEvent('photos.pipeline_completed', storeId, {
    mediaIds,
    mode,
    usablePhotos: classResult.summary.usablePhotos,
    averageQuality: storeReadiness.overallScore,
    sectionAssignment,
  });

  // ── Build seller-facing summary ──
  const enhancedCount = enhancements?.filter(e => e.success).length || 0;
  const skippedCount = sectionAssignment.skipped.length;
  const totalMs = Date.now() - totalStart;

  let message: string;
  if (storeReadiness.overallScore >= 7) {
    message = `Great photos! I enhanced ${enhancedCount} images and your store is ready to look amazing.`;
  } else if (storeReadiness.overallScore >= 5) {
    message = `I've processed ${enhancedCount} photos. They'll work well, but a few better-lit shots would make your store stand out more.`;
  } else if (classResult.summary.usablePhotos >= 2) {
    message = `I made the most of your ${classResult.summary.usablePhotos} usable photos. The store will work, but better photos = more sales!`;
  } else {
    message = `I could only use ${classResult.summary.usablePhotos} photo${classResult.summary.usablePhotos === 1 ? '' : 's'}. Please upload more product photos for a complete store.`;
  }

  console.log(`[photo-pipeline] Complete: ${totalMs}ms total (triage=${triageMs}, classify=${classifyMs}, enhance=${enhanceMs}, upload=${uploadMs})`);

  return {
    triage: {
      groups: triageResult.groups,
      needsConfirmation: triageResult.needsConfirmation,
      confirmationMessage: triageResult.confirmationMessage,
    },
    classifications: classResult.classifications,
    sectionAssignment,
    enhancements,
    storeReadiness,
    uploadedVariants,
    timing: { triageMs, classifyMs, enhanceMs, uploadMs, totalMs },
    summary: {
      totalPhotos: mediaIds.length,
      usablePhotos: classResult.summary.usablePhotos,
      enhancedPhotos: enhancedCount,
      skippedPhotos: skippedCount,
      overallScore: storeReadiness.overallScore,
      message,
      suggestions: [
        ...storeReadiness.suggestions,
        ...(classResult.summary.suggestion ? [classResult.summary.suggestion] : []),
      ],
    },
  };
}


// ============================================================
// Empty result helper
// ============================================================

function emptyResult(message: string): PipelineOutput {
  return {
    triage: { groups: [], needsConfirmation: false },
    classifications: [],
    sectionAssignment: {
      hero: null, productCards: [], about: null,
      collectionBanner: null, ogImage: null, footer: null, skipped: [],
    },
    storeReadiness: {
      overallReady: false, overallScore: 0, photoResults: [],
      heroReady: false, minimumProductPhotos: false,
      suggestions: [message],
    },
    uploadedVariants: {},
    timing: { triageMs: 0, classifyMs: 0, enhanceMs: 0, uploadMs: 0, totalMs: 0 },
    summary: {
      totalPhotos: 0, usablePhotos: 0, enhancedPhotos: 0,
      skippedPhotos: 0, overallScore: 0, message, suggestions: [],
    },
  };
}
