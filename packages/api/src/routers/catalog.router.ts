import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { CatalogGenerateInput, BulkCatalogInput } from '@tatparya/shared';
import { generateProductFromImages, generateBulkProducts } from '../services/catalog-ai.service.js';
import { triagePhotos } from '../services/photo-triage-ai.service.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { MediaRepository } from '../repositories/media.repository.js';
import { emitEvent } from '../lib/event-bus.js';
import { processImage } from '../services/image-pipeline.service.js';
import { persistImages } from '../lib/image-persist.js';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export const catalogRouter = router({
  // ============================================================
  // Photo Triage (Call 0) — group photos by product
  // ============================================================
  triagePhotos: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      thumbnailDataUrls: z.array(z.string()).min(1).max(20),
    }))
    .mutation(async ({ input }) => {
      return triagePhotos(input.thumbnailDataUrls);
    }),

  // ============================================================
  // Generate product from photos (the magic moment)
  // ============================================================
  generateFromImages: storeProcedure
    .input(CatalogGenerateInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, imageUrls, vertical, hints, language } = input;

      // ── CRITICAL FIX: Persist base64 images to disk/R2 ──
      // imageUrls may be base64 data URIs or http URLs.
      // persistImages saves base64 to local disk (dev) or R2 (prod)
      // and returns file URLs for both cases.
      const persistedUrls = await persistImages(storeId, imageUrls);

      // Call Claude Vision — pass the original base64/URLs for analysis
      // (Vision API accepts both base64 and http URLs)
      const result = await generateProductFromImages({
        imageUrls,
        vertical,
        hints: hints || undefined,
        language,
      });

      const { suggestion } = result;

      // Auto-create product as draft — use PERSISTED URLs (not base64)
      const productRepo = new ProductRepository(ctx.serviceDb);
      const slug = slugify(suggestion.name) + '-' + Date.now().toString(36);

      const product = await productRepo.create(storeId, {
        name: suggestion.name,
        slug,
        description: suggestion.description,
        price: suggestion.suggestedPrice?.min || 0,
        compareAtPrice: suggestion.suggestedPrice?.max || undefined,
        status: 'draft',
        tags: suggestion.tags || [],
        images: persistedUrls.map((url, i) => ({
          id: `img-${i}`,
          originalUrl: url,
          alt: suggestion.imageAlt?.[i] || suggestion.name,
          position: i,
          enhancementStatus: 'pending' as const,
        })),
        verticalData: suggestion.verticalAttributes || {},
        seoMeta: suggestion.seoMeta || {},
        hsnCode: suggestion.hsnCodeSuggestion || undefined,
      });

      await emitEvent('product.created', storeId, {
        productId: product.id,
        name: product.name,
        price: product.price,
        status: 'draft',
        source: 'ai-catalog',
      }, { source: 'catalog-ai', userId: ctx.user.id });

      // Kick off image processing in background (non-blocking)
      const mediaRepo = new MediaRepository(ctx.serviceDb);
      for (const url of persistedUrls) {
        const { items } = await mediaRepo.listByStore(storeId, { limit: 100 });
        const mediaAsset = items.find(m => m.originalUrl === url);
        if (mediaAsset) {
          await mediaRepo.linkToProduct(storeId, mediaAsset.id, product.id);
          processImage({
            storeId,
            mediaAssetId: mediaAsset.id,
            originalKey: mediaAsset.originalKey,
            db: ctx.serviceDb,
          }).catch(err => console.error('Background image processing failed:', err));
        }
      }

      return {
        suggestion,
        productId: product.id,
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  // ============================================================
  // Bulk generate products from multiple photo groups
  // ============================================================
  bulkGenerate: storeProcedure
    .input(BulkCatalogInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, images, vertical, autoCreateDrafts } = input;

      const { suggestions, totalTimeMs } = await generateBulkProducts({
        imageGroups: images.map(img => ({
          urls: img.urls,
          hints: img.hints,
        })),
        vertical,
      });

      const createdProducts: { productId: string; name: string; groupIndex: number }[] = [];

      if (autoCreateDrafts) {
        const productRepo = new ProductRepository(ctx.serviceDb);

        for (const suggestion of suggestions) {
          try {
            const slug = slugify(suggestion.name) + '-' + Date.now().toString(36);
            const group = images[suggestion.groupIndex]!;

            // ── Persist base64 images for bulk too ──
            const persistedUrls = await persistImages(storeId, group.urls);

            const product = await productRepo.create(storeId, {
              name: suggestion.name,
              slug,
              description: suggestion.description,
              price: suggestion.suggestedPrice?.min || 0,
              status: 'draft',
              tags: suggestion.tags || [],
              images: persistedUrls.map((url, i) => ({
                id: `img-${i}`,
                originalUrl: url,
                alt: suggestion.imageAlt?.[i] || suggestion.name,
                position: i,
                enhancementStatus: 'pending' as const,
              })),
              verticalData: suggestion.verticalAttributes || {},
              seoMeta: suggestion.seoMeta || {},
              hsnCode: suggestion.hsnCodeSuggestion || undefined,
            });

            createdProducts.push({
              productId: product.id,
              name: product.name,
              groupIndex: suggestion.groupIndex,
            });
          } catch (err) {
            console.error(`Failed to create product for group ${suggestion.groupIndex}:`, err);
          }
        }
      }

      return {
        suggestions,
        createdProducts,
        totalTimeMs,
      };
    }),

  // ============================================================
  // Re-generate AI data for an existing product
  // ============================================================
  regenerate: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      productId: z.string().uuid(),
      regenerateFields: z.array(z.enum([
        'name', 'description', 'tags', 'seoMeta', 'verticalAttributes',
      ])).default(['description', 'tags', 'seoMeta']),
    }))
    .mutation(async ({ ctx, input }) => {
      const productRepo = new ProductRepository(ctx.serviceDb);
      const product = await productRepo.findById(input.storeId, input.productId);

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      const imageUrls = (product.images as { originalUrl?: string }[])
        .map(img => img.originalUrl)
        .filter((url): url is string => !!url);

      if (imageUrls.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Product has no images to analyze' });
      }

      const { data: store } = await ctx.serviceDb
        .from('stores')
        .select('vertical')
        .eq('id', input.storeId)
        .single();

      const result = await generateProductFromImages({
        imageUrls,
        vertical: store?.vertical || 'general',
        hints: { name: product.name, price: product.price },
      });

      const updateData: Record<string, unknown> = {};
      for (const field of input.regenerateFields) {
        switch (field) {
          case 'name':
            updateData['name'] = result.suggestion.name;
            break;
          case 'description':
            updateData['description'] = result.suggestion.description;
            break;
          case 'tags':
            updateData['tags'] = result.suggestion.tags;
            break;
          case 'seoMeta':
            updateData['seoMeta'] = result.suggestion.seoMeta;
            break;
          case 'verticalAttributes':
            updateData['verticalData'] = result.suggestion.verticalAttributes;
            break;
        }
      }

      const updated = await productRepo.update(input.storeId, input.productId, updateData);

      return {
        product: updated,
        suggestion: result.suggestion,
        regeneratedFields: input.regenerateFields,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  // ============================================================
  // Dev-only: Generate product from photos without auth.
  // TODO: Remove before production.
  // ============================================================
  devGenerate: publicProcedure
    .input(CatalogGenerateInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, imageUrls, vertical, hints, language } = input;

      // ── Persist base64 for dev flow too ──
      const persistedUrls = await persistImages(storeId, imageUrls);

      const result = await generateProductFromImages({
        imageUrls,
        vertical,
        hints: hints || undefined,
        language,
      });

      const { suggestion } = result;

      const productRepo = new ProductRepository(ctx.serviceDb);
      const slug = slugify(suggestion.name) + '-' + Date.now().toString(36);

      const product = await productRepo.create(storeId, {
        name: suggestion.name,
        slug,
        description: suggestion.description,
        price: suggestion.suggestedPrice?.min || 0,
        compareAtPrice: suggestion.suggestedPrice?.max || undefined,
        status: 'draft',
        tags: suggestion.tags || [],
        images: persistedUrls.map((url, i) => ({
          id: `img-${i}`,
          originalUrl: url,
          alt: suggestion.imageAlt?.[i] || suggestion.name,
          position: i,
          enhancementStatus: 'pending' as const,
        })),
        verticalData: suggestion.verticalAttributes || {},
        seoMeta: suggestion.seoMeta || {},
        hsnCode: suggestion.hsnCodeSuggestion || undefined,
      });

      return {
        suggestion,
        productId: product.id,
        confidence: result.confidence,
        processingTimeMs: result.processingTimeMs,
      };
    }),
});
