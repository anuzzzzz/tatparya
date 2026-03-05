import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc/trpc.js';
import { CreateStoreInput, UpdateStoreInput, GetStoreInput } from '@tatparya/shared';
import { emitEvent } from '../lib/event-bus.js';
import { generateStoreDesign } from '../services/store-design-ai.service.js';
import { processSellerPhotos } from '../services/photo-pipeline-orchestrator.service.js';
import { generateProductFromImages } from '../services/catalog-ai.service.js';

export const storeRouter = router({
  /**
   * Create a new store
   * Only authenticated users can create stores
   */
  create: protectedProcedure
    .input(CreateStoreInput)
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const { data: existing } = await ctx.serviceDb
        .from('stores')
        .select('id')
        .eq('slug', input.slug)
        .single();

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Store slug "${input.slug}" is already taken`,
        });
      }

      // Build default store config if not provided
      const defaultConfig = {
        design: {
          layout: 'minimal',
          palette: {
            mode: 'generated' as const,
            seed: '#D4356A',
            primary: '#D4356A',
            secondary: '#F8E8EE',
            accent: '#8B1A3A',
            background: '#FFFAF5',
            surface: '#FFF5EE',
            text: '#1A1A2E',
            textMuted: '#6B6B80',
          },
          fonts: { display: 'Playfair Display', body: 'DM Sans', scale: 1.0 },
        },
        sections: { homepage: [], productPage: [] },
        language: 'en',
        currency: 'INR' as const,
        integrations: {},
      };

      const defaultWhatsappConfig = {
        enabled: false,
        autoOrderNotifications: true,
        optInAtCheckout: true,
        maxPromoMessagesPerWeek: 3,
      };

      // Extract state code from GSTIN (first 2 digits)
      const stateCode = input.gstin ? input.gstin.slice(0, 2) : null;

      const { data: store, error } = await ctx.serviceDb
        .from('stores')
        .insert({
          owner_id: ctx.user.id,
          name: input.name,
          slug: input.slug,
          vertical: input.vertical,
          description: input.description || null,
          store_config: input.storeConfig || defaultConfig,
          whatsapp_config: input.whatsappConfig || defaultWhatsappConfig,
          status: 'onboarding',
          gstin: input.gstin || null,
          business_name: input.businessName || null,
          registered_address: input.registeredAddress || null,
          state_code: stateCode,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create store: ${error.message}`,
        });
      }

      // Emit store.created event
      await emitEvent('store.created', store.id, {
        storeId: store.id,
        name: store.name,
        slug: store.slug,
        vertical: store.vertical,
        ownerId: ctx.user.id,
      }, { source: 'api', userId: ctx.user.id });

      return mapStoreRow(store);
    }),

  /**
   * Get store by ID or slug (public — used by storefront)
   */
  get: publicProcedure
    .input(GetStoreInput)
    .query(async ({ ctx, input }) => {
      let query = ctx.serviceDb.from('stores').select('*');

      if (input.storeId) {
        query = query.eq('id', input.storeId);
      } else if (input.slug) {
        query = query.eq('slug', input.slug);
      }

      const { data: store, error } = await query.single();

      if (error || !store) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Store not found',
        });
      }

      return mapStoreRow(store);
    }),

  /**
   * List stores owned by the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: stores, error } = await ctx.serviceDb
      .from('stores')
      .select('*')
      .eq('owner_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to list stores: ${error.message}`,
      });
    }

    return (stores || []).map(mapStoreRow);
  }),

  /**
   * Dev-only: List all stores (no auth).
   * TODO: Remove before production.
   */
  devList: publicProcedure.query(async ({ ctx }) => {
    const { data: stores, error } = await ctx.serviceDb
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to list stores: ${error.message}`,
      });
    }

    return (stores || []).map(mapStoreRow);
  }),

  /**
   * Update store details
   */
  update: protectedProcedure
    .input(UpdateStoreInput)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: existing } = await ctx.serviceDb
        .from('stores')
        .select('id, owner_id')
        .eq('id', input.storeId)
        .single();

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Store not found' });
      }
      if (existing.owner_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (input.name) updateData['name'] = input.name;
      if (input.description !== undefined) updateData['description'] = input.description;
      if (input.storeConfig) updateData['store_config'] = input.storeConfig;
      if (input.whatsappConfig) updateData['whatsapp_config'] = input.whatsappConfig;
      if (input.status) updateData['status'] = input.status;
      if (input.gstin !== undefined) updateData['gstin'] = input.gstin;
      if (input.businessName !== undefined) updateData['business_name'] = input.businessName;

      const { data: store, error } = await ctx.serviceDb
        .from('stores')
        .update(updateData)
        .eq('id', input.storeId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update store: ${error.message}`,
        });
      }

      return mapStoreRow(store);
    }),

  /**
   * Check if a slug is available
   */
  checkSlug: publicProcedure
    .input(z.object({ slug: z.string().min(2).max(100) }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.serviceDb
        .from('stores')
        .select('id')
        .eq('slug', input.slug)
        .single();

      return { available: !data };
    }),

  /**
   * Dev-only: Create store without auth.
   * TODO: Remove before production.
   */
  devCreate: publicProcedure
    .input(CreateStoreInput.omit({ slug: true }).extend({
      slug: z.string().min(2).max(100).optional(),
      sellerContext: z.object({
        audience: z.string().optional(),
        priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
        brandVibe: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug || input.name
        .toLowerCase().trim()
        .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      // Use existing dev user from auth.users
      const DEV_OWNER_ID = '01e14d64-a028-4c4d-b6fe-7b13f4bbf007';

      const defaultConfig = {
        design: {
          layout: 'minimal',
          palette: {
            mode: 'generated' as const,
            seed: '#D4356A',
            primary: '#D4356A',
            secondary: '#F8E8EE',
            accent: '#8B1A3A',
            background: '#FFFAF5',
            surface: '#FFF5EE',
            text: '#1A1A2E',
            textMuted: '#6B6B80',
          },
          fonts: { display: 'Playfair Display', body: 'DM Sans', scale: 1.0 },
        },
        sections: { homepage: [], productPage: [] },
        sellerContext: (input as any).sellerContext || {},
        language: 'en',
        currency: 'INR' as const,
        integrations: {},
      };

      const defaultWhatsappConfig = {
        enabled: false,
        autoOrderNotifications: true,
        optInAtCheckout: true,
        maxPromoMessagesPerWeek: 3,
      };

      const { data: store, error } = await ctx.serviceDb
        .from('stores')
        .insert({
          owner_id: DEV_OWNER_ID,
          name: input.name,
          slug,
          vertical: input.vertical,
          description: input.description || null,
          store_config: defaultConfig,
          whatsapp_config: defaultWhatsappConfig,
          status: 'active',
          gstin: input.gstin || null,
          business_name: input.businessName || null,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create store: ${error.message}`,
        });
      }

      return mapStoreRow(store);
    }),

  /**
   * Dev-only: Generate store design from product photos.
   * Call this after store creation + first photo upload.
   * Updates the store's design config in place.
   */
  devGenerateDesign: publicProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      productImages: z.array(z.string().min(1)).min(1).max(5),
      productInfo: z.object({
        names: z.array(z.string()).optional(),
        priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
        tags: z.array(z.string()).optional(),
      }).optional(),
      sellerHints: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the store
      const { data: store, error: fetchError } = await ctx.serviceDb
        .from('stores')
        .select('*')
        .eq('id', input.storeId)
        .single();

      if (fetchError || !store) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Store not found' });
      }

      // Generate design from photos + seller context + archetype
      const storeConfig = (store.store_config || {}) as Record<string, any>;
      const result = await generateStoreDesign({
        storeName: store.name,
        vertical: store.vertical,
        productImages: input.productImages,
        productInfo: input.productInfo,
        sellerContext: storeConfig.sellerContext || undefined,
        sellerHints: input.sellerHints,
      });

      // Merge AI design into existing store config
      const existingConfig = (store.store_config || {}) as Record<string, any>;
      const newConfig = {
        ...existingConfig,
        design: result.design,
        heroTagline: result.heroTagline,
        heroSubtext: result.heroSubtext,
        storeBio: result.storeBio,
        sections: {
          ...(existingConfig.sections || {}),
          // Wire sectionLayout from composition engine into config.sections.homepage
          homepage: result.sectionLayout.map((s: any) => ({
            type: s.type,
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

      // Update store with new design + bio
      const { data: updated, error: updateError } = await ctx.serviceDb
        .from('stores')
        .update({
          store_config: newConfig,
          description: result.storeBio,
        })
        .eq('id', input.storeId)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update store design: ${updateError.message}`,
        });
      }

      return {
        store: mapStoreRow(updated),
        heroTagline: result.heroTagline,
        heroSubtext: result.heroSubtext,
        processingTimeMs: result.processingTimeMs,
      };
    }),

  /**
   * Dev-only: Full pipeline — photos → store → pipeline → design.
   *
   * One-shot endpoint for testing the complete flow:
   *  1. Create store
   *  2. Download images → local storage → media_assets records
   *  3. Run photo pipeline (draft mode)
   *  4. Generate AI store design
   *  5. Return complete store + pipeline results
   *
   * Accepts external image URLs or base64 data URIs.
   */
  devFullPipeline: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      vertical: z.string().min(1),
      description: z.string().optional(),
      productImages: z.array(z.string().min(1)).min(1).max(10),
      sellerContext: z.object({
        audience: z.string().optional(),
        priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
        brandVibe: z.string().optional(),
      }).optional(),
      sellerHints: z.string().optional(),
      pipelineMode: z.enum(['draft', 'production']).default('draft'),
    }))
    .mutation(async ({ ctx, input }) => {
      const totalStart = Date.now();

      // ── Step 1: Create store ──
      const slug = input.name
        .toLowerCase().trim()
        .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const DEV_OWNER_ID = '01e14d64-a028-4c4d-b6fe-7b13f4bbf007';

      const { data: store, error: storeError } = await ctx.serviceDb
        .from('stores')
        .insert({
          owner_id: DEV_OWNER_ID,
          name: input.name,
          slug,
          vertical: input.vertical,
          description: input.description || null,
          store_config: {
            design: { layout: 'minimal', palette: { primary: '#D4356A', background: '#FFFAF5', text: '#1A1A2E' } },
            sections: { homepage: [], productPage: [] },
            sellerContext: input.sellerContext || {},
            language: 'en', currency: 'INR', integrations: {},
          },
          whatsapp_config: { enabled: false },
          status: 'active',
        })
        .select()
        .single();

      if (storeError || !store) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Store creation failed: ${storeError?.message}` });
      }

      const storeId = store.id as string;
      console.log(`[full-pipeline] Store created: ${storeId} (${slug})`);

      // ── Step 2: Ingest images → local storage + media_assets ──
      // Force local storage for dev pipeline (avoids R2 issues in dev)
      const { generateMediaKey } = await import('../lib/storage.js');
      const { mkdirSync, writeFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const localUploadDir = join(process.cwd(), '../storefront/public/uploads');
      const mediaIds: string[] = [];
      const imageBuffers: Buffer[] = [];

      for (let i = 0; i < input.productImages.length; i++) {
        const imgSrc = input.productImages[i]!;
        let buffer: Buffer;

        try {
          if (imgSrc.startsWith('data:')) {
            // Base64 data URI
            const b64 = imgSrc.split(',')[1];
            if (!b64) throw new Error('Invalid data URI');
            buffer = Buffer.from(b64, 'base64');
          } else {
            // External URL — download it
            const resp = await fetch(imgSrc);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            buffer = Buffer.from(await resp.arrayBuffer());
          }

          // Save to local storage (dev-safe, always writes locally)
          const key = generateMediaKey(storeId, 'originals', `photo-${i}.jpg`);
          const filePath = join(localUploadDir, key);
          mkdirSync(dirname(filePath), { recursive: true });
          writeFileSync(filePath, buffer);
          const publicUrl = `/uploads/${key}`;

          // Keep buffer for pipeline (avoids re-download from R2)
          imageBuffers.push(buffer);

          // Create media_assets record
          const { data: media, error: mediaError } = await ctx.serviceDb
            .from('media_assets')
            .insert({
              store_id: storeId,
              original_key: key,
              original_url: publicUrl,
              filename: `photo-${i}.jpg`,
              content_type: 'image/jpeg',
              file_size_bytes: buffer.length,
              enhancement_status: 'pending',
            })
            .select('id')
            .single();

          if (mediaError || !media) {
            console.warn(`[full-pipeline] media_assets insert failed for image ${i}:`, mediaError?.message);
            continue;
          }

          mediaIds.push(media.id as string);
          console.log(`[full-pipeline] Image ${i} ingested: ${media.id} (${(buffer.length / 1024).toFixed(0)}KB)`);
        } catch (err) {
          console.warn(`[full-pipeline] Failed to ingest image ${i}:`, err);
        }
      }

      if (mediaIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No images could be ingested. Check your image URLs.',
        });
      }

      // ── Step 3: Run photo pipeline ──
      console.log(`[full-pipeline] Running photo pipeline (${input.pipelineMode}) on ${mediaIds.length} images...`);
      const pipelineResult = await processSellerPhotos({
        storeId,
        mediaIds,
        vertical: input.vertical,
        mode: input.pipelineMode,
        db: ctx.serviceDb,
        preloadedBuffers: imageBuffers,
      });

      console.log(`[full-pipeline] Pipeline done in ${pipelineResult.timing.totalMs}ms — ${pipelineResult.summary.usablePhotos} usable, score ${pipelineResult.summary.overallScore}`);

      // ── Step 3b: Create products from triage groups ──
      const triageGroups = pipelineResult.triage?.groups || [];
      const createdProducts: string[] = [];

      // If triage returned groups, use them; otherwise treat each image as its own product
      const productGroups = triageGroups.length > 0
        ? triageGroups
        : mediaIds.map((_, i) => ({ imageIndices: [i], label: `Product ${i + 1}`, confidence: 1 }));

      for (let g = 0; g < productGroups.length; g++) {
        const group = productGroups[g]!;
        const productName = group.label || `Product ${g + 1}`;
        const productSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `product-${g + 1}`;

        // Build images array from media_assets for this group's image indices
        const productImages: Record<string, unknown>[] = [];
        for (const imgIdx of group.imageIndices) {
          const mediaId = mediaIds[imgIdx];
          if (!mediaId) continue;

          // Fetch the media_asset to get all variant URLs
          const { data: media } = await ctx.serviceDb
            .from('media_assets')
            .select('*')
            .eq('id', mediaId)
            .single();

          if (media) {
            productImages.push({
              id: media.id,
              originalUrl: media.original_url,
              heroUrl: media.hero_url || undefined,
              cardUrl: media.card_url || undefined,
              thumbnailUrl: media.thumbnail_url || undefined,
              squareUrl: media.square_url || undefined,
              ogUrl: media.og_url || undefined,
              alt: productName,
              position: productImages.length,
              enhancementStatus: media.enhancement_status || 'pending',
            });
          }
        }

        if (productImages.length === 0) continue;

        const { data: product, error: productError } = await ctx.serviceDb
          .from('products')
          .insert({
            store_id: storeId,
            name: productName,
            slug: `${productSlug}-${storeId.slice(0, 4)}`,
            description: `${productName} from ${input.name}`,
            price: 0,
            status: 'active',
            images: productImages,
            tags: [input.vertical],
          })
          .select('id')
          .single();

        if (productError) {
          console.warn(`[full-pipeline] Product creation failed for "${productName}":`, productError.message);
        } else {
          createdProducts.push(product!.id as string);
          // Link media_assets to this product
          for (const imgIdx of group.imageIndices) {
            const mediaId = mediaIds[imgIdx];
            if (mediaId) {
              await ctx.serviceDb
                .from('media_assets')
                .update({ product_id: product!.id })
                .eq('id', mediaId);
            }
          }
          console.log(`[full-pipeline] Product created: "${productName}" with ${productImages.length} images`);
        }
      }

      console.log(`[full-pipeline] ${createdProducts.length} products created from ${productGroups.length} groups`);

      // ── Step 3c: Enrich products with catalog AI (names, descriptions, prices) ──
      console.log(`[full-pipeline] Enriching ${createdProducts.length} products with catalog AI...`);
      for (const productId of createdProducts) {
        try {
          const { data: prod } = await ctx.serviceDb
            .from('products')
            .select('id, name, images')
            .eq('id', productId)
            .single();
          if (!prod) continue;

          const imgs = (prod.images as any[]) || [];
          const imgUrls = imgs
            .map((img: any) => img.originalUrl || img.cardUrl || img.heroUrl)
            .filter(Boolean)
            .slice(0, 3);

          if (imgUrls.length === 0) continue;

          // Convert local /uploads/ paths to base64 for the AI
          const aiImageUrls: string[] = [];
          const { readFileSync } = await import('fs');
          const { join } = await import('path');
          for (const url of imgUrls) {
            if (url.startsWith('/uploads/')) {
              try {
                const buffer = readFileSync(join(localUploadDir, url.replace('/uploads/', '')));
                aiImageUrls.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
              } catch { continue; }
            } else {
              aiImageUrls.push(url);
            }
          }

          if (aiImageUrls.length === 0) continue;

          const { suggestion } = await generateProductFromImages({
            imageUrls: aiImageUrls,
            vertical: input.vertical,
            hints: { name: prod.name },
          });

          await ctx.serviceDb
            .from('products')
            .update({
              name: suggestion.name || prod.name,
              description: suggestion.description || null,
              price: suggestion.suggestedPrice?.min || 0,
              compare_at_price: suggestion.suggestedPrice?.max || null,
              tags: suggestion.tags || [],
              vertical_data: suggestion.verticalAttributes || {},
            })
            .eq('id', productId);

          console.log(`[full-pipeline] Enriched: "${suggestion.name}" ₹${suggestion.suggestedPrice?.min}-${suggestion.suggestedPrice?.max}`);
        } catch (err) {
          console.warn(`[full-pipeline] Catalog AI failed for product ${productId}:`, err);
        }
      }

      // ── Step 4: Generate AI store design ──
      // Use the original image URLs for the design AI (it needs viewable images)
      const designImages = input.productImages.slice(0, 5);

      console.log(`[full-pipeline] Generating store design...`);
      const designResult = await generateStoreDesign({
        storeName: input.name,
        vertical: input.vertical,
        productImages: designImages,
        sellerContext: input.sellerContext,
        sellerHints: input.sellerHints,
      });

      // ── Step 5: Merge into store config ──
      const existingConfig = (store.store_config || {}) as Record<string, any>;
      const finalConfig = {
        ...existingConfig,
        design: designResult.design,
        heroTagline: designResult.heroTagline,
        heroSubtext: designResult.heroSubtext,
        storeBio: designResult.storeBio,
        sections: {
          homepage: designResult.sectionLayout.map((s: any) => ({
            type: s.type,
            vibeWeight: s.vibeWeight,
            colorIntensity: s.colorIntensity,
            config: { variant: s.variant, background_hint: s.background_hint, position: s.position, required: s.required },
          })),
          productPage: [],
        },
        // Attach pipeline summary for debugging
        photoPipeline: {
          summary: pipelineResult.summary,
          sectionAssignment: pipelineResult.sectionAssignment,
          timing: pipelineResult.timing,
        },
        language: 'en', currency: 'INR', integrations: {},
      };

      const { data: updated, error: updateError } = await ctx.serviceDb
        .from('stores')
        .update({ store_config: finalConfig, description: designResult.storeBio })
        .eq('id', storeId)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Store update failed: ${updateError.message}` });
      }

      const totalMs = Date.now() - totalStart;
      console.log(`[full-pipeline] Complete in ${totalMs}ms — store ${slug} is ready`);

      return {
        store: mapStoreRow(updated!),
        pipeline: pipelineResult.summary,
        design: {
          heroTagline: designResult.heroTagline,
          heroSubtext: designResult.heroSubtext,
          storeBio: designResult.storeBio,
          archetypeId: designResult.archetypeId,
        },
        timing: {
          ...pipelineResult.timing,
          designMs: designResult.processingTimeMs,
          totalMs,
        },
        storefrontUrl: `/${slug}`,
      };
    }),
});

// ============================================================
// Helper: Map DB row to our StoreRow type
// ============================================================

function mapStoreRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    ownerId: row['owner_id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    vertical: row['vertical'] as string,
    description: row['description'] as string | null,
    storeConfig: row['store_config'] as Record<string, unknown>,
    whatsappConfig: row['whatsapp_config'] as Record<string, unknown>,
    status: row['status'] as string,
    customDomain: row['custom_domain'] as string | null,
    gstin: row['gstin'] as string | null,
    businessName: row['business_name'] as string | null,
    registeredAddress: row['registered_address'] as Record<string, unknown> | null,
    stateCode: row['state_code'] as string | null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
