import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc/trpc.js';
import { CreateStoreInput, UpdateStoreInput, GetStoreInput } from '@tatparya/shared';
import { emitEvent } from '../lib/event-bus.js';

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
