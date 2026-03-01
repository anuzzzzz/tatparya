import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  createPresignedUploadUrl,
  uploadBuffer,
  downloadBuffer,
  buildMediaKey,
  getExtFromContentType,
} from '../lib/storage.js';
import { MediaRepository } from '../repositories/media.repository.js';
import { emitEvent } from '../lib/event-bus.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Media Service
//
// Handles the upload flow and image enhancement pipeline:
// 1. Generate presigned URL → seller uploads directly to R2
// 2. Create media_assets record (status: pending)
// 3. On enhancement trigger → download original → resize → upload variants
// 4. Update media_assets with all variant URLs
// ============================================================

// Image size configurations
const IMAGE_SIZES = {
  hero: { width: 1200, height: 1600, fit: 'cover' as const },
  card: { width: 600, height: 800, fit: 'cover' as const },
  thumbnail: { width: 300, height: 400, fit: 'cover' as const },
  square: { width: 800, height: 800, fit: 'cover' as const },
  og: { width: 1200, height: 630, fit: 'cover' as const },
} as const;

export class MediaService {
  private repo: MediaRepository;

  constructor(private db: SupabaseClient) {
    this.repo = new MediaRepository(db);
  }

  // ============================================================
  // Step 1: Generate presigned upload URL
  // ============================================================

  async getUploadUrl(params: {
    storeId: string;
    filename: string;
    contentType: string;
    fileSizeBytes: number;
  }) {
    const mediaId = uuidv4();
    const ext = getExtFromContentType(params.contentType);
    const key = buildMediaKey(params.storeId, mediaId, 'original', ext);

    const { uploadUrl, publicUrl } = await createPresignedUploadUrl({
      key,
      contentType: params.contentType,
      maxSizeBytes: params.fileSizeBytes,
    });

    // Create the media asset record (pending)
    const media = await this.repo.create(params.storeId, {
      originalKey: key,
      originalUrl: publicUrl,
      filename: params.filename,
      contentType: params.contentType,
      fileSizeBytes: params.fileSizeBytes,
    });

    return {
      mediaId: media.id,
      uploadUrl,
      publicUrl,
      key,
    };
  }

  // ============================================================
  // Step 2: Enhance images (resize to all variants)
  // Called by the background worker or directly.
  // ============================================================

  async enhanceImage(storeId: string, mediaId: string): Promise<void> {
    const media = await this.repo.findById(storeId, mediaId);
    if (!media) throw new Error(`Media asset not found: ${mediaId}`);

    // Mark as processing
    await this.repo.updateEnhancementStatus(storeId, mediaId, {
      enhancementStatus: 'processing',
    });

    await emitEvent('image.enhancement_started', storeId, {
      imageId: mediaId,
      originalUrl: media.originalUrl,
    });

    try {
      // Download original from R2
      const originalBuffer = await downloadBuffer(media.originalKey);

      // Generate all sizes in parallel
      const results = await Promise.all(
        Object.entries(IMAGE_SIZES).map(async ([variant, config]) => {
          const resized = await sharp(originalBuffer)
            .resize(config.width, config.height, {
              fit: config.fit,
              withoutEnlargement: true,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .webp({ quality: 85 })
            .toBuffer();

          const key = buildMediaKey(storeId, mediaId, variant, 'webp');
          const url = await uploadBuffer({
            key,
            body: resized,
            contentType: 'image/webp',
          });

          return { variant, key, url };
        })
      );

      // Build update data
      const updateData: Record<string, string> = {};
      for (const { variant, key, url } of results) {
        updateData[`${variant}Key`] = key;
        updateData[`${variant}Url`] = url;
      }

      await this.repo.updateEnhancementStatus(storeId, mediaId, {
        heroKey: updateData['heroKey'],
        heroUrl: updateData['heroUrl'],
        cardKey: updateData['cardKey'],
        cardUrl: updateData['cardUrl'],
        thumbnailKey: updateData['thumbnailKey'],
        thumbnailUrl: updateData['thumbnailUrl'],
        squareKey: updateData['squareKey'],
        squareUrl: updateData['squareUrl'],
        ogKey: updateData['ogKey'],
        ogUrl: updateData['ogUrl'],
        enhancementStatus: 'done',
        enhancementError: null,
      });

      await emitEvent('image.enhancement_completed', storeId, {
        imageId: mediaId,
        originalUrl: media.originalUrl,
        enhancedUrls: Object.fromEntries(
          results.map(({ variant, url }) => [variant, url])
        ),
      });

      console.log(`✅ Enhanced media ${mediaId}: ${results.length} sizes generated`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      await this.repo.updateEnhancementStatus(storeId, mediaId, {
        enhancementStatus: 'failed',
        enhancementError: errorMsg,
      });

      await emitEvent('image.enhancement_failed', storeId, {
        imageId: mediaId,
        originalUrl: media.originalUrl,
        error: errorMsg,
      });

      console.error(`❌ Enhancement failed for ${mediaId}:`, errorMsg);
      throw err;
    }
  }

  // ============================================================
  // Batch enhance multiple images
  // ============================================================

  async enhanceImages(storeId: string, mediaIds: string[]): Promise<void> {
    // Process sequentially to avoid memory pressure from large images
    for (const mediaId of mediaIds) {
      try {
        await this.enhanceImage(storeId, mediaId);
      } catch (err) {
        // Log but continue with remaining images
        console.error(`Failed to enhance ${mediaId}:`, err);
      }
    }
  }

  // ============================================================
  // Convert media assets to ProductImage format
  // (for embedding in the product's images JSONB array)
  // ============================================================

  mediaToProductImages(mediaAssets: Array<{
    id: string;
    originalUrl: string;
    heroUrl: string | null;
    cardUrl: string | null;
    thumbnailUrl: string | null;
    squareUrl: string | null;
    ogUrl: string | null;
    altText: string | null;
    enhancementStatus: string;
    position: number;
  }>) {
    return mediaAssets.map((m, index) => ({
      id: m.id,
      originalUrl: m.originalUrl,
      heroUrl: m.heroUrl || undefined,
      cardUrl: m.cardUrl || undefined,
      thumbnailUrl: m.thumbnailUrl || undefined,
      squareUrl: m.squareUrl || undefined,
      ogUrl: m.ogUrl || undefined,
      alt: m.altText || undefined,
      position: m.position || index,
      enhancementStatus: m.enhancementStatus as 'pending' | 'processing' | 'done' | 'failed',
    }));
  }
}
