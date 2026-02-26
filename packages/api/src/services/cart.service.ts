import { v4 as uuidv4 } from 'uuid';
import { getRedis } from '../lib/redis.js';
import type { VariantRepository, ProductRepository } from '../repositories/product.repository.js';
import type { Cart, CartItem } from '@tatparya/shared';

const CART_TTL = 72 * 60 * 60; // 72 hours
const CART_PREFIX = 'cart:';

export class CartService {
  constructor(
    private productRepo: ProductRepository,
    private variantRepo: VariantRepository,
  ) {}

  async getCart(storeId: string, cartId: string): Promise<Cart | null> {
    const redis = getRedis();
    const data = await redis.get(`${CART_PREFIX}${storeId}:${cartId}`);
    if (!data) return null;
    return JSON.parse(data) as Cart;
  }

  async addItem(storeId: string, cartId: string, productId: string, variantId?: string, quantity = 1): Promise<Cart> {
    // Validate product exists and is active
    const product = await this.productRepo.findById(storeId, productId);
    if (!product) throw new Error('Product not found');
    if (product.status !== 'active') throw new Error('Product is not available');

    // Get price and check stock
    let price = product.price;
    let itemName = product.name;
    let attributes: Record<string, string> = {};

    if (variantId) {
      const variant = await this.variantRepo.findById(storeId, variantId);
      if (!variant) throw new Error('Variant not found');

      const available = variant.stock - variant.reserved;
      if (available < quantity) {
        throw new Error(`Only ${available} items available`);
      }

      if (variant.price !== null) price = variant.price;
      attributes = variant.attributes;
    }

    // Get or create cart
    let cart = await this.getCart(storeId, cartId);
    if (!cart) {
      cart = {
        id: cartId,
        storeId,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        total: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + CART_TTL * 1000),
      };
    }

    // Check if item already in cart
    const itemKey = variantId ? `${productId}:${variantId}` : productId;
    const existingIndex = cart.items.findIndex((item) => {
      const key = item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
      return key === itemKey;
    });

    if (existingIndex >= 0) {
      cart.items[existingIndex]!.quantity += quantity;
    } else {
      const imageUrl = Array.isArray(product.images) && product.images.length > 0
        ? (product.images[0] as Record<string, unknown>)?.['cardUrl'] as string || undefined
        : undefined;

      cart.items.push({
        productId,
        variantId,
        quantity,
        name: itemName,
        price,
        imageUrl,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      });
    }

    // Reserve stock
    if (variantId) {
      await this.variantRepo.reserveStock(storeId, variantId, quantity);
    }

    return this.recalculateAndSave(cart);
  }

  async updateItemQuantity(storeId: string, cartId: string, productId: string, variantId: string | undefined, quantity: number): Promise<Cart> {
    const cart = await this.getCart(storeId, cartId);
    if (!cart) throw new Error('Cart not found');

    const itemKey = variantId ? `${productId}:${variantId}` : productId;
    const itemIndex = cart.items.findIndex((item) => {
      const key = item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
      return key === itemKey;
    });

    if (itemIndex < 0) throw new Error('Item not in cart');

    const item = cart.items[itemIndex]!;
    const diff = quantity - item.quantity;

    if (quantity === 0) {
      // Remove item, release reservation
      cart.items.splice(itemIndex, 1);
      if (variantId) {
        await this.variantRepo.releaseStock(storeId, variantId, item.quantity);
      }
    } else if (diff > 0) {
      // Adding more — check stock and reserve
      if (variantId) {
        await this.variantRepo.reserveStock(storeId, variantId, diff);
      }
      item.quantity = quantity;
    } else if (diff < 0) {
      // Reducing — release excess reservation
      if (variantId) {
        await this.variantRepo.releaseStock(storeId, variantId, Math.abs(diff));
      }
      item.quantity = quantity;
    }

    return this.recalculateAndSave(cart);
  }

  async removeItem(storeId: string, cartId: string, productId: string, variantId?: string): Promise<Cart> {
    return this.updateItemQuantity(storeId, cartId, productId, variantId, 0);
  }

  async clearCart(storeId: string, cartId: string): Promise<void> {
    const cart = await this.getCart(storeId, cartId);
    if (!cart) return;

    // Release all reservations
    for (const item of cart.items) {
      if (item.variantId) {
        try {
          await this.variantRepo.releaseStock(storeId, item.variantId, item.quantity);
        } catch {
          // Best effort release
        }
      }
    }

    const redis = getRedis();
    await redis.del(`${CART_PREFIX}${storeId}:${cartId}`);
  }

  async applyDiscount(cart: Cart, discountAmount: number, code: string): Promise<Cart> {
    cart.discountCode = code;
    cart.discountAmount = discountAmount;
    return this.recalculateAndSave(cart);
  }

  private async recalculateAndSave(cart: Cart): Promise<Cart> {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.subtotal = Math.round(cart.subtotal * 100) / 100;
    cart.total = Math.max(0, cart.subtotal - cart.discountAmount);
    cart.total = Math.round(cart.total * 100) / 100;
    cart.updatedAt = new Date();

    const redis = getRedis();
    await redis.setex(
      `${CART_PREFIX}${cart.storeId}:${cart.id}`,
      CART_TTL,
      JSON.stringify(cart),
    );

    return cart;
  }
}
