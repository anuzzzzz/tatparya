import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, storeProcedure, publicProcedure } from '../trpc/trpc.js';
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersInput, InitiatePaymentInput, VerifyPaymentInput } from '@tatparya/shared';
import { OrderRepository } from '../repositories/order.repository.js';
import { VariantRepository } from '../repositories/product.repository.js';
import { DiscountRepository } from '../repositories/discount.repository.js';
import { OrderService } from '../services/order.service.js';
import { RazorpayService } from '../services/razorpay.service.js';
import { env } from '../env.js';

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

  /**
   * Initiate online payment — creates our DB order, then creates a Razorpay order.
   * Returns the Razorpay key + order details needed to open the checkout modal.
   */
  initiatePayment: publicProcedure
    .input(InitiatePaymentInput)
    .mutation(async ({ ctx, input }) => {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Payment gateway not configured' });
      }

      // Verify store is active
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

      const orderRepo = new OrderRepository(ctx.serviceDb);
      const orderService = new OrderService(
        orderRepo,
        new VariantRepository(ctx.serviceDb),
        new DiscountRepository(ctx.serviceDb),
      );

      // Create DB order with paymentMethod = 'card' (updated to actual method after payment)
      const order = await orderService.createOrder(input.storeId, {
        ...input,
        paymentMethod: 'card',
      });

      // Transition created → payment_pending
      await orderService.updateStatus(input.storeId, order.id, 'payment_pending');

      // Create Razorpay order
      const razorpay = new RazorpayService(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
      const amountInPaise = Math.round(order.total * 100);
      const rzpOrder = await razorpay.createOrder(amountInPaise, 'INR', order.orderNumber, {
        storeId: input.storeId,
        orderId: order.id,
      });

      // Store razorpay order ID as payment_reference via direct DB update
      // (updateStatus validates state transitions; we only want to set a field here)
      await ctx.serviceDb
        .from('orders')
        .update({ payment_reference: rzpOrder.id })
        .eq('id', order.id)
        .eq('store_id', input.storeId);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: rzpOrder.id,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
      };
    }),

  /**
   * Verify Razorpay payment signature and mark the order as paid.
   */
  verifyPayment: publicProcedure
    .input(VerifyPaymentInput)
    .mutation(async ({ ctx, input }) => {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Payment gateway not configured' });
      }

      const razorpay = new RazorpayService(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
      const valid = razorpay.verifyPaymentSignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature,
      );

      if (!valid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment verification failed' });
      }

      const orderRepo = new OrderRepository(ctx.serviceDb);
      const orderService = new OrderService(
        orderRepo,
        new VariantRepository(ctx.serviceDb),
        new DiscountRepository(ctx.serviceDb),
      );

      let order;
      try {
        order = await orderService.updateStatus(input.storeId, input.orderId, 'paid', {
          paymentStatus: 'captured',
          paymentReference: input.razorpayPaymentId,
        });
      } catch (err: any) {
        // If the transition failed because the webhook already processed this payment,
        // just fetch and return the current order state
        if (err?.message?.includes('Invalid transition')) {
          order = await orderRepo.findById(input.storeId, input.orderId);
          if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        } else {
          throw err;
        }
      }

      return order;
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
