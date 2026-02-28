import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { GetUploadUrlInput, ConfirmUploadInput } from '@tatparya/shared';
import { MediaRepository } from '../repositories/media.repository.js';
import {
  generateMediaKey,
  getPresignedUploadUrl,
  isStorageConfigured,
  getDevUploadUrl,
} from '../lib/storage.js';
import { processImage } from '../services/image-pipeline.service.js';
import { emitEvent } from '../lib/event-bus.js';

export const mediaRouter = router({
  // ============================================================
  // Get presigned upload URL
  // Client calls this → gets URL → uploads directly to R2
  // ============================================================
  getUploadUrl: storeProcedure
    .input(GetUploadUrlInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, fileName, contentType } = input;

      const key = generateMediaKey(storeId, 'originals', fileName);

      let uploadUrl: string;
      let publicUrl: string;

      if (isStorageConfigured()) {
        const urls = await getPresignedUploadUrl(key, contentType);
        uploadUrl = urls.uploadUrl;
        publicUrl = urls.publicUrl;
      } else {
        // Dev mode: return local endpoint
        const urls = getDevUploadUrl(key);
        uploadUrl = urls.uploadUrl;
        publicUrl = urls.publicUrl;
      }

      // Create media asset record (status: uploaded)
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      const media = await mediaRepo.create(storeId, {
        originalKey: key,
        originalUrl: publicUrl,
        fileName,
        contentType,
        fileSizeBytes: input.fileSizeBytes,
      });

      await emitEvent('image.uploaded', storeId, {
        imageId: media.id,
        originalUrl: publicUrl,
      }, { source: 'api', userId: ctx.user.id });

      return {
        uploadUrl,
        publicUrl,
        key,
        mediaAssetId: media.id,
        expiresIn: 3600,
      };
    }),

  // ============================================================
  // Confirm upload & trigger processing
  // Called after client finishes uploading to presigned URL
  // ============================================================
  confirmUpload: storeProcedure
    .input(ConfirmUploadInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, mediaAssetId, fileSizeBytes } = input;
      const mediaRepo = new MediaRepository(ctx.serviceDb);

      const media = await mediaRepo.findById(storeId, mediaAssetId);
      if (!media) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Media asset not found' });
      }

      // Update file size if provided
      if (fileSizeBytes) {
        await ctx.serviceDb
          .from('media_assets')
          .update({ file_size_bytes: fileSizeBytes })
          .eq('id', mediaAssetId)
          .eq('store_id', storeId);
      }

      // Kick off image processing pipeline in background
      processImage({
        storeId,
        mediaAssetId,
        originalKey: media.originalKey,
        db: ctx.serviceDb,
      }).catch(err => console.error('Image processing failed:', err));

      return { mediaAssetId, status: 'processing' };
    }),

  // ============================================================
  // List media for a store
  // ============================================================
  list: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      productId: z.string().uuid().optional(),
      status: z.enum(['uploaded', 'processing', 'ready', 'failed']).optional(),
      unlinked: z.boolean().optional(),
      page: z.number().int().positive().default(1),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const mediaRepo = new MediaRepository(ctx.serviceDb);

      if (input.productId) {
        const items = await mediaRepo.listByProduct(input.storeId, input.productId);
        return { items, total: items.length };
      }

      return mediaRepo.listByStore(input.storeId, {
        status: input.status,
        unlinked: input.unlinked,
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      });
    }),

  // ============================================================
  // Get single media asset
  // ============================================================
  get: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      mediaAssetId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      const media = await mediaRepo.findById(input.storeId, input.mediaAssetId);
      if (!media) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Media asset not found' });
      }
      return media;
    }),

  // ============================================================
  // Link media to a product
  // ============================================================
  linkToProduct: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      mediaAssetId: z.string().uuid(),
      productId: z.string().uuid(),
      position: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      return mediaRepo.linkToProduct(
        input.storeId, input.mediaAssetId, input.productId, input.position,
      );
    }),

  // ============================================================
  // Reprocess a failed image
  // ============================================================
  reprocess: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      mediaAssetId: z.string().uuid(),
      skipBgRemoval: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      const media = await mediaRepo.findById(input.storeId, input.mediaAssetId);
      if (!media) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Media asset not found' });
      }

      // Reset status and reprocess
      await mediaRepo.updateStatus(input.storeId, input.mediaAssetId, 'uploaded');

      processImage({
        storeId: input.storeId,
        mediaAssetId: input.mediaAssetId,
        originalKey: media.originalKey,
        db: ctx.serviceDb,
        skipBgRemoval: input.skipBgRemoval,
      }).catch(err => console.error('Reprocessing failed:', err));

      return { mediaAssetId: input.mediaAssetId, status: 'processing' };
    }),

  // ============================================================
  // Delete media asset
  // ============================================================
  delete: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      mediaAssetId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      await mediaRepo.delete(input.storeId, input.mediaAssetId);
      return { success: true };
    }),
});
