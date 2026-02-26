import { router, publicProcedure } from '../trpc/trpc.js';
import { AddToCartInput, UpdateCartItemInput, RemoveFromCartInput, GetCartInput, ApplyDiscountInput } from '@tatparya/shared';
import { ProductRepository, VariantRepository } from '../repositories/product.repository.js';
import { DiscountRepository } from '../repositories/discount.repository.js';
import { CartService } from '../services/cart.service.js';
import { PricingService } from '../services/pricing.service.js';
import { TRPCError } from '@trpc/server';

export const cartRouter = router({
  get: publicProcedure
    .input(GetCartInput)
    .query(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      const cart = await cartService.getCart(input.storeId, input.cartId);
      return cart || { id: input.cartId, storeId: input.storeId, items: [], subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 };
    }),

  addItem: publicProcedure
    .input(AddToCartInput)
    .mutation(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      return cartService.addItem(input.storeId, input.cartId, input.productId, input.variantId, input.quantity);
    }),

  updateItem: publicProcedure
    .input(UpdateCartItemInput)
    .mutation(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      return cartService.updateItemQuantity(input.storeId, input.cartId, input.productId, input.variantId, input.quantity);
    }),

  removeItem: publicProcedure
    .input(RemoveFromCartInput)
    .mutation(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      return cartService.removeItem(input.storeId, input.cartId, input.productId, input.variantId);
    }),

  clear: publicProcedure
    .input(GetCartInput)
    .mutation(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      await cartService.clearCart(input.storeId, input.cartId);
      return { success: true };
    }),

  applyDiscount: publicProcedure
    .input(ApplyDiscountInput)
    .mutation(async ({ ctx, input }) => {
      const cartService = new CartService(
        new ProductRepository(ctx.serviceDb),
        new VariantRepository(ctx.serviceDb),
      );
      const pricingService = new PricingService(new DiscountRepository(ctx.serviceDb));

      const cart = await cartService.getCart(input.storeId, input.cartId);
      if (!cart || cart.items.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cart is empty' });
      }

      const result = await pricingService.validateDiscount(input.storeId, input.discountCode, cart.subtotal);
      if (!result.valid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.message });
      }

      return cartService.applyDiscount(cart, result.discountAmount, input.discountCode);
    }),
});
