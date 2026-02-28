import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import {
  CreateProductInput, UpdateProductInput, ListProductsInput, GetProductInput,
  CreateVariantInput, UpdateVariantInput, UpdateStockInput,
} from '@tatparya/shared';
import { ProductRepository, VariantRepository } from '../repositories/product.repository.js';
import { emitEvent } from '../lib/event-bus.js';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export const productRouter = router({
  create: storeProcedure
    .input(CreateProductInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      const slug = input.slug || slugify(input.name) + '-' + Date.now().toString(36);

      const product = await repo.create(input.storeId, { ...input, slug });

      await emitEvent('product.created', input.storeId, {
        productId: product.id, name: product.name, price: product.price, status: product.status,
      }, { source: 'api', userId: ctx.user.id });

      return product;
    }),

  get: publicProcedure
    .input(GetProductInput)
    .query(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      const product = input.productId
        ? await repo.findById(input.storeId, input.productId)
        : await repo.findBySlug(input.storeId, input.slug!);

      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });

      // Also fetch variants
      const variantRepo = new VariantRepository(ctx.serviceDb);
      const variants = await variantRepo.listByProduct(input.storeId, product.id);

      return { ...product, variants };
    }),

  list: publicProcedure
    .input(ListProductsInput)
    .query(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      return repo.list(input.storeId, {
        categoryId: input.categoryId,
        status: input.status,
        search: input.search,
        tags: input.tags,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        page: input.pagination.page,
        limit: input.pagination.limit,
      });
    }),

  update: storeProcedure
    .input(UpdateProductInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      const { storeId, productId, ...updateData } = input;
      const product = await repo.update(storeId, productId, updateData);

      await emitEvent('product.updated', storeId, {
        productId: product.id, name: product.name, price: product.price, status: product.status,
      }, { source: 'api', userId: ctx.user.id });

      return product;
    }),

  delete: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), productId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      await repo.delete(input.storeId, input.productId);

      await emitEvent('product.deleted', input.storeId, {
        productId: input.productId,
      }, { source: 'api', userId: ctx.user.id });

      return { success: true };
    }),

  // ============ Variants ============

  createVariant: storeProcedure
    .input(CreateVariantInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new VariantRepository(ctx.serviceDb);
      return repo.create(input.storeId, input);
    }),

  updateVariant: storeProcedure
    .input(UpdateVariantInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new VariantRepository(ctx.serviceDb);
      const { storeId, variantId, ...updateData } = input;
      return repo.update(storeId, variantId, updateData);
    }),

  updateStock: storeProcedure
    .input(UpdateStockInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new VariantRepository(ctx.serviceDb);
      const variant = await repo.adjustStock(input.storeId, input.variantId, input.adjustment);

      // Check for low stock (threshold: 5)
      if (variant.stock <= 5 && variant.stock > 0) {
        await emitEvent('stock.low', input.storeId, {
          productId: variant.productId, variantId: variant.id,
          currentStock: variant.stock, threshold: 5,
        }, { source: 'api' });
      }
      if (variant.stock === 0) {
        await emitEvent('stock.out', input.storeId, {
          productId: variant.productId, variantId: variant.id, currentStock: 0,
        }, { source: 'api' });
      }

      return variant;
    }),

  listVariants: publicProcedure
    .input(z.object({ storeId: z.string().uuid(), productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const repo = new VariantRepository(ctx.serviceDb);
      return repo.listByProduct(input.storeId, input.productId);
    }),

  deleteVariant: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), variantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repo = new VariantRepository(ctx.serviceDb);
      await repo.delete(input.storeId, input.variantId);
      return { success: true };
    }),

  /**
   * Dev-only: Update product without auth.
   * TODO: Remove before production.
   */
  devUpdate: publicProcedure
    .input(UpdateProductInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new ProductRepository(ctx.serviceDb);
      const { storeId, productId, ...updateData } = input;
      return repo.update(storeId, productId, updateData);
    }),
});
