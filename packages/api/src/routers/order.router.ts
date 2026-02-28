import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersInput } from '@tatparya/shared';
import { OrderRepository } from '../repositories/order.repository.js';
import { VariantRepository } from '../repositories/product.repository.js';
import { DiscountRepository } from '../repositories/discount.repository.js';
import { OrderService } from '../services/order.service.js';

export const orderRouter = router({
  create: storeProcedure
    .input(CreateOrderInput)
    .mutation(async ({ ctx, input }) => {
      const orderService = new OrderService(
        new OrderRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
        new DiscountRepository(ctx.serviceDb),
      );
      return orderService.createOrder(input.storeId, input);
    }),

  /**
   * Public checkout — used by the storefront for guest COD orders.
   * No auth required. Validates the store exists before creating.
   */
  publicCheckout: publicProcedure
    .input(CreateOrderInput)
    .mutation(async ({ ctx, input }) => {
      // Verify store exists and is active
      const { data: store } = await ctx.serviceDb
        .from('stores')
        .select('id, status')
        .eq('id', input.storeId)
        .single();

      if (!store) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Store not found' });
      }
      if (store.status !== 'active' && store.status !== 'onboarding') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Store is not accepting orders' });
      }

      const orderService = new OrderService(
        new OrderRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
        new DiscountRepository(ctx.serviceDb),
      );
      return orderService.createOrder(input.storeId, input);
    }),

  get: storeProcedure
    .input(z.object({ storeId: z.string().uuid(), orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const repo = new OrderRepository(ctx.serviceDb);
      const order = await repo.findById(input.storeId, input.orderId);
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      return order;
    }),

  /**
   * Public order lookup — used by storefront order confirmation page.
   * Only returns limited info (no auth required).
   */
  publicGet: publicProcedure
    .input(z.object({ storeId: z.string().uuid(), orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const repo = new OrderRepository(ctx.serviceDb);
      const order = await repo.findById(input.storeId, input.orderId);
      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      return order;
    }),

  list: storeProcedure
    .input(ListOrdersInput)
    .query(async ({ ctx, input }) => {
      const repo = new OrderRepository(ctx.serviceDb);
      return repo.list(input.storeId, {
        status: input.status,
        paymentMethod: input.paymentMethod,
        buyerPhone: input.buyerPhone,
        from: input.dateRange?.from,
        to: input.dateRange?.to,
        page: input.pagination.page,
        limit: input.pagination.limit,
      });
    }),

  updateStatus: storeProcedure
    .input(UpdateOrderStatusInput)
    .mutation(async ({ ctx, input }) => {
      const orderService = new OrderService(
        new OrderRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
        new DiscountRepository(ctx.serviceDb),
      );
      return orderService.updateStatus(input.storeId, input.orderId, input.status, {
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl,
        awbNumber: input.awbNumber,
        notes: input.notes,
      });
    }),

  revenue: storeProcedure
    .input(z.object({
      storeId: z.string().uuid(),
      period: z.enum(['today', 'week', 'month']).default('today'),
    }))
    .query(async ({ ctx, input }) => {
      const repo = new OrderRepository(ctx.serviceDb);
      return repo.getRevenueSummary(input.storeId, input.period);
    }),
});
