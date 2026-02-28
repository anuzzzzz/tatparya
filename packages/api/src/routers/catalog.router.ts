import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { CatalogGenerateInput, BulkCatalogInput } from '@tatparya/shared';
import { generateProductFromImages, generateBulkProducts } from '../services/catalog-ai.service.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { MediaRepository } from '../repositories/media.repository.js';
import { emitEvent } from '../lib/event-bus.js';
import { processImage } from '../services/image-pipeline.service.js';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export const catalogRouter = router({
  // ============================================================
  // Generate product from photos (the magic moment)
  // ============================================================
  generateFromImages: storeProcedure
    .input(CatalogGenerateInput)
    .mutation(async ({ ctx, input }) => {
      const { storeId, imageUrls, vertical, hints, language } = input;

      // Call Claude Vision
      const result = await generateProductFromImages({
        imageUrls,
        vertical,
        hints: hints || undefined,
        language,
      });

      const { suggestion } = result;

      // Auto-create product as draft
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
        images: imageUrls.map((url, i) => ({
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
      for (const url of imageUrls) {
        // Find media assets matching this URL
        const { items } = await mediaRepo.listByStore(storeId, { limit: 100 });
        const mediaAsset = items.find(m => m.originalUrl === url);
        if (mediaAsset) {
          await mediaRepo.linkToProduct(storeId, mediaAsset.id, product.id);
          // Fire-and-forget image processing
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

            const product = await productRepo.create(storeId, {
              name: suggestion.name,
              slug,
              description: suggestion.description,
              price: suggestion.suggestedPrice?.min || 0,
              status: 'draft',
              tags: suggestion.tags || [],
              images: group.urls.map((url, i) => ({
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

      // Get image URLs from the product
      const imageUrls = (product.images as { originalUrl?: string }[])
        .map(img => img.originalUrl)
        .filter((url): url is string => !!url);

      if (imageUrls.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Product has no images to analyze' });
      }

      // Get store vertical
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

      // Build update data based on requested fields
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
        images: imageUrls.map((url, i) => ({
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
