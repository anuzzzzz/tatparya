import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure } from '../trpc/trpc.js';
import { CreateDiscountInput, ValidateDiscountInput } from '@tatparya/shared';
import { DiscountRepository } from '../repositories/discount.repository.js';
import { PricingService } from '../services/pricing.service.js';

export const discountRouter = router({
  create: storeProcedure
    .input(CreateDiscountInput)
    .mutation(async ({ ctx, input }) => {
      const repo = new DiscountRepository(ctx.serviceDb);

      // Check for duplicate code
      const existing = await repo.findByCode(input.storeId, input.code);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: `Discount code "${input.code}" already exists` });
      }

      return repo.create(input.storeId, input);
    }),

  validate: storeProcedure
    .input(ValidateDiscountInput)
    .query(async ({ ctx, input }) => {
      const pricingService = new PricingService(new DiscountRepository(ctx.serviceDb));
      return pricingService.validateDiscount(input.storeId, input.code, input.orderTotal);
    }),

  list: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), activeOnly: z.boolean().default(true) }))
    .query(async ({ ctx, input }) => {
      const repo = new DiscountRepository(ctx.serviceDb);
      return repo.list(input.storeId, input.activeOnly);
    }),

  deactivate: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), discountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const repo = new DiscountRepository(ctx.serviceDb);
      await repo.deactivate(input.storeId, input.discountId);
      return { success: true };
    }),
});
