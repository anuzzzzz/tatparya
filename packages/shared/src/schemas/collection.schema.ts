import { z } from 'zod';
import { StoreId, EntityId, Slug, SeoMeta, PaginationInput } from './common.schema.js';

// ============================================================
// Collection Type
// ============================================================

export const CollectionType = z.enum(['manual', 'smart']);
export type CollectionType = z.infer<typeof CollectionType>;

export const CollectionSortOrder = z.enum(['manual', 'price_asc', 'price_desc', 'newest', 'bestselling']);
export type CollectionSortOrder = z.infer<typeof CollectionSortOrder>;

// ============================================================
// Smart Collection Rules
// Used by "smart" collections to auto-populate products
// e.g. { price: { lte: 999 }, tags: { contains: 'silk' } }
// ============================================================

export const SmartCollectionRules = z.record(
  z.object({
    eq: z.unknown().optional(),
    gte: z.unknown().optional(),
    lte: z.unknown().optional(),
    gt: z.unknown().optional(),
    lt: z.unknown().optional(),
    contains: z.unknown().optional(),
    in: z.array(z.unknown()).optional(),
  })
).default({});

// ============================================================
// Collection CRUD
// ============================================================

export const CreateCollectionInput = z.object({
  storeId: StoreId,
  name: z.string().min(1).max(200).trim(),
  slug: Slug.optional(),
  type: CollectionType.default('manual'),
  description: z.string().max(2000).optional(),
  bannerImageUrl: z.string().url().optional(),
  rules: SmartCollectionRules.optional(),
  sortOrder: CollectionSortOrder.default('manual'),
  isFeatured: z.boolean().default(false),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

export const UpdateCollectionInput = z.object({
  storeId: StoreId,
  collectionId: EntityId,
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  bannerImageUrl: z.string().url().nullable().optional(),
  rules: SmartCollectionRules.optional(),
  sortOrder: CollectionSortOrder.optional(),
  isFeatured: z.boolean().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const ListCollectionsInput = z.object({
  storeId: StoreId,
  featured: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional(),
  pagination: PaginationInput.default({ page: 1, limit: 20 }),
});

export const AddProductsToCollectionInput = z.object({
  storeId: StoreId,
  collectionId: EntityId,
  productIds: z.array(EntityId).min(1).max(100),
});

export const RemoveProductsFromCollectionInput = z.object({
  storeId: StoreId,
  collectionId: EntityId,
  productIds: z.array(EntityId).min(1).max(100),
});

export const ReorderCollectionProductsInput = z.object({
  storeId: StoreId,
  collectionId: EntityId,
  productIds: z.array(EntityId), // In desired order
});

export type CreateCollectionInput = z.infer<typeof CreateCollectionInput>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInput>;
export type ListCollectionsInput = z.infer<typeof ListCollectionsInput>;
export type AddProductsToCollectionInput = z.infer<typeof AddProductsToCollectionInput>;
export type RemoveProductsFromCollectionInput = z.infer<typeof RemoveProductsFromCollectionInput>;

// ============================================================
// Product-Category Assignment
// ============================================================

export const AssignCategoriesInput = z.object({
  storeId: StoreId,
  productId: EntityId,
  categoryIds: z.array(EntityId).min(1).max(10),
  primaryCategoryId: EntityId,
});

export const UpdateCategoryInput = z.object({
  storeId: StoreId,
  categoryId: EntityId,
  name: z.string().min(1).max(100).trim().optional(),
  parentId: EntityId.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  filterConfig: z.record(z.boolean()).optional(),
  defaultHsnCode: z.string().optional(),
  seoMeta: SeoMeta.optional(),
  position: z.number().int().min(0).optional(),
});

export const ListCategoriesInput = z.object({
  storeId: StoreId,
  parentId: EntityId.nullable().optional(),
  vertical: z.string().optional(),
  includeProductCount: z.boolean().default(false),
});

export type AssignCategoriesInput = z.infer<typeof AssignCategoriesInput>;
export type ListCategoriesInput = z.infer<typeof ListCategoriesInput>;
