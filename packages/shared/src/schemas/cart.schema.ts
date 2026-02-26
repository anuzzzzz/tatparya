import { z } from 'zod';
import { StoreId, EntityId, INRAmount } from './common.schema.js';

// ============================================================
// Cart Item
// ============================================================

export const CartItem = z.object({
  productId: EntityId,
  variantId: EntityId.optional(),
  quantity: z.number().int().positive(),
  name: z.string(),
  price: INRAmount,
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.string()).optional(),
});

export type CartItem = z.infer<typeof CartItem>;

// ============================================================
// Cart Operations
// ============================================================

export const AddToCartInput = z.object({
  storeId: StoreId,
  cartId: z.string(), // Session-based cart ID
  productId: EntityId,
  variantId: EntityId.optional(),
  quantity: z.number().int().positive().default(1),
});

export const UpdateCartItemInput = z.object({
  storeId: StoreId,
  cartId: z.string(),
  productId: EntityId,
  variantId: EntityId.optional(),
  quantity: z.number().int().min(0), // 0 = remove
});

export const RemoveFromCartInput = z.object({
  storeId: StoreId,
  cartId: z.string(),
  productId: EntityId,
  variantId: EntityId.optional(),
});

export const GetCartInput = z.object({
  storeId: StoreId,
  cartId: z.string(),
});

export const ApplyDiscountInput = z.object({
  storeId: StoreId,
  cartId: z.string(),
  discountCode: z.string().min(1).max(50).trim().toUpperCase(),
});

export type AddToCartInput = z.infer<typeof AddToCartInput>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInput>;
export type RemoveFromCartInput = z.infer<typeof RemoveFromCartInput>;
export type GetCartInput = z.infer<typeof GetCartInput>;
export type ApplyDiscountInput = z.infer<typeof ApplyDiscountInput>;

// ============================================================
// Cart State (stored in Redis)
// ============================================================

export const Cart = z.object({
  id: z.string(),
  storeId: StoreId,
  items: z.array(CartItem),
  discountCode: z.string().optional(),
  discountAmount: INRAmount.default(0),
  subtotal: INRAmount,
  taxAmount: INRAmount.default(0),
  total: INRAmount,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiresAt: z.coerce.date(), // Auto-expire after 72 hours
});

export type Cart = z.infer<typeof Cart>;

// ============================================================
// Discount Schema
// ============================================================

export const CreateDiscountInput = z.object({
  storeId: StoreId,
  code: z.string().min(2).max(50).trim().toUpperCase(),
  type: z.enum(['percentage', 'flat', 'bogo']),
  value: z.number().positive(),
  minOrderValue: INRAmount.optional(),
  maxDiscount: INRAmount.optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: z.coerce.date().default(() => new Date()),
  endsAt: z.coerce.date().optional(),
  whatsappOnly: z.boolean().default(false),
});

export const ValidateDiscountInput = z.object({
  storeId: StoreId,
  code: z.string().trim().toUpperCase(),
  orderTotal: INRAmount,
});

export type CreateDiscountInput = z.infer<typeof CreateDiscountInput>;
export type ValidateDiscountInput = z.infer<typeof ValidateDiscountInput>;
