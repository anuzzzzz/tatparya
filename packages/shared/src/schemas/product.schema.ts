import { z } from 'zod';
import { StoreId, EntityId, Slug, INRAmount, HSNCode, SeoMeta, PaginationInput } from './common.schema.js';

// ============================================================
// Product Status
// ============================================================

export const ProductStatus = z.enum(['draft', 'active', 'archived']);
export type ProductStatus = z.infer<typeof ProductStatus>;

// ============================================================
// Image Record
// ============================================================

export const ProductImage = z.object({
  id: z.string(),
  originalUrl: z.string().url(),
  heroUrl: z.string().url().optional(),
  cardUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  squareUrl: z.string().url().optional(),
  ogUrl: z.string().url().optional(),
  alt: z.string().max(200).optional(),
  position: z.number().int().min(0),
  enhancementStatus: z.enum(['pending', 'processing', 'done', 'failed']).default('pending'),
});

export type ProductImage = z.infer<typeof ProductImage>;

// ============================================================
// Product CRUD
// ============================================================

export const CreateProductInput = z.object({
  storeId: StoreId,
  name: z.string().min(1).max(300).trim(),
  slug: Slug.optional(), // Auto-generated if not provided
  description: z.string().max(5000).optional(),
  price: INRAmount,
  compareAtPrice: INRAmount.optional(),
  categoryId: EntityId.optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  images: z.array(ProductImage).default([]),
  verticalData: z.record(z.unknown()).default({}),
  seoMeta: SeoMeta.optional(),
  status: ProductStatus.default('draft'),
  hsnCode: HSNCode.optional(),
  gstRate: z.number().min(0).max(28).optional(),
});

export const UpdateProductInput = z.object({
  storeId: StoreId,
  productId: EntityId,
  name: z.string().min(1).max(300).trim().optional(),
  description: z.string().max(5000).optional(),
  price: INRAmount.optional(),
  compareAtPrice: INRAmount.nullable().optional(),
  categoryId: EntityId.nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  images: z.array(ProductImage).optional(),
  verticalData: z.record(z.unknown()).optional(),
  seoMeta: SeoMeta.optional(),
  status: ProductStatus.optional(),
  hsnCode: HSNCode.optional(),
  gstRate: z.number().min(0).max(28).optional(),
});

export const ListProductsInput = z.object({
  storeId: StoreId,
  categoryId: EntityId.optional(),
  status: ProductStatus.optional(),
  search: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  minPrice: INRAmount.optional(),
  maxPrice: INRAmount.optional(),
  pagination: PaginationInput.default({ page: 1, limit: 20 }),
});

export const GetProductInput = z.object({
  storeId: StoreId,
  productId: EntityId.optional(),
  slug: Slug.optional(),
}).refine(
  (data) => data.productId || data.slug,
  { message: 'Either productId or slug must be provided' }
);

export type CreateProductInput = z.infer<typeof CreateProductInput>;
export type UpdateProductInput = z.infer<typeof UpdateProductInput>;
export type ListProductsInput = z.infer<typeof ListProductsInput>;
export type GetProductInput = z.infer<typeof GetProductInput>;

// ============================================================
// Variant
// ============================================================

export const CreateVariantInput = z.object({
  storeId: StoreId,
  productId: EntityId,
  sku: z.string().max(100).optional(),
  attributes: z.record(z.string()), // e.g. { size: "L", color: "Red" }
  price: INRAmount.optional(), // Override product price; null = use product price
  stock: z.number().int().min(0).default(0),
  weightGrams: z.number().int().min(0).optional(),
});

export const UpdateVariantInput = z.object({
  storeId: StoreId,
  variantId: EntityId,
  sku: z.string().max(100).optional(),
  attributes: z.record(z.string()).optional(),
  price: INRAmount.nullable().optional(),
  stock: z.number().int().min(0).optional(),
  weightGrams: z.number().int().min(0).optional(),
});

export const UpdateStockInput = z.object({
  storeId: StoreId,
  variantId: EntityId,
  adjustment: z.number().int(), // Positive = add, negative = subtract
  reason: z.string().max(200).optional(),
});

export type CreateVariantInput = z.infer<typeof CreateVariantInput>;
export type UpdateVariantInput = z.infer<typeof UpdateVariantInput>;
export type UpdateStockInput = z.infer<typeof UpdateStockInput>;

// ============================================================
// Category
// ============================================================

export const CreateCategoryInput = z.object({
  storeId: StoreId,
  name: z.string().min(1).max(100).trim(),
  slug: Slug.optional(),
  parentId: EntityId.optional(),
  verticalConfig: z.record(z.unknown()).default({}),
  defaultHsnCode: HSNCode.optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;
