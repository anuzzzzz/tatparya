import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { CreateCategoryInput, AssignCategoriesInput, ListCategoriesInput } from '@tatparya/shared';
import { CategoryRepository } from '../repositories/category.repository.js';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export const categoryRouter = router({
  create: storeProcedure
    .input(CreateCategoryInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      const slug = input.slug || slugify(input.name);

      // Check duplicate slug under same parent
      const existing = await repo.findBySlug(input.storeId, slug);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: `Category slug "${slug}" already exists` });
      }

      return repo.create(input.storeId, { ...input, slug });
    }),

  getTree: publicProcedure
    .input(z.object({ storeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      return repo.getTree(input.storeId);
    }),

  list: publicProcedure
    .input(ListCategoriesInput)
    .query(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      return repo.listByParent(input.storeId, input.parentId ?? null);
    }),

  update: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      categoryId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      parentId: z.string().uuid().nullable().optional(),
      imageUrl: z.string().url().nullable().optional(),
      filterConfig: z.record(z.boolean()).optional(),
      defaultHsnCode: z.string().optional(),
      position: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      const { storeId, categoryId, ...data } = input;
      return repo.update(storeId, categoryId, data);
    }),

  delete: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), categoryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      await repo.delete(input.storeId, input.categoryId);
      return { success: true };
    }),

  // Product-category assignment
  assignProduct: storeProcedure
    .input(AssignCategoriesInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      for (const catId of input.categoryIds) {
        const isPrimary = catId === input.primaryCategoryId;
        await repo.assignProduct(input.storeId, input.productId, catId, isPrimary);
      }
      return { success: true };
    }),

  getProductCategories: publicProcedure
    .input(z.object({ storeId: z.string().uuid(), productId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const repo = new CategoryRepository(ctx.serviceDb);
      return repo.getProductCategories(input.storeId, input.productId);
    }),
});
