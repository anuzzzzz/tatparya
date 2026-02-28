import { z } from 'zod';
import { StoreId, EntityId } from './common.schema.js';

// ============================================================
// Media Upload
// ============================================================

export const GetUploadUrlInput = z.object({
  storeId: StoreId,
  filename: z.string().min(1).max(255),
  contentType: z.enum([
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  ]),
  fileSizeBytes: z.number().int().min(1).max(20 * 1024 * 1024), // 20MB max
});

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlInput>;

export const ConfirmUploadInput = z.object({
  storeId: StoreId,
  mediaId: EntityId,
});

export type ConfirmUploadInput = z.infer<typeof ConfirmUploadInput>;

export const ListMediaInput = z.object({
  storeId: StoreId,
  productId: EntityId.optional(),
  status: z.enum(['pending', 'processing', 'done', 'failed']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ListMediaInput = z.infer<typeof ListMediaInput>;

export const DeleteMediaInput = z.object({
  storeId: StoreId,
  mediaId: EntityId,
});

export type DeleteMediaInput = z.infer<typeof DeleteMediaInput>;

// ============================================================
// AI Catalog Generation
// ============================================================

export const GenerateFromPhotosInput = z.object({
  storeId: StoreId,
  mediaIds: z.array(EntityId).min(1).max(10),
  vertical: z.enum([
    'fashion', 'fmcg', 'electronics', 'jewellery', 'beauty', 'food', 'home_decor', 'general',
  ]).optional(),
  sellerHints: z.string().max(2000).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
});

export type GenerateFromPhotosInput = z.infer<typeof GenerateFromPhotosInput>;

export const CatalogSuggestion = z.object({
  name: z.string(),
  description: z.string(),
  shortDescription: z.string().max(200).optional(),
  price: z.number().min(0).optional(),
  compareAtPrice: z.number().min(0).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).max(20),
  hsnCode: z.string().optional(),
  gstRate: z.number().optional(),
  seoMeta: z.object({
    title: z.string().max(70),
    description: z.string().max(160),
    keywords: z.array(z.string()).max(10),
  }).optional(),
  variants: z.array(z.object({
    attributes: z.record(z.string()),
    priceAdjustment: z.number().optional(),
  })).optional(),
  verticalData: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1),
});

export type CatalogSuggestion = z.infer<typeof CatalogSuggestion>;

export const EnhanceImagesInput = z.object({
  storeId: StoreId,
  mediaIds: z.array(EntityId).min(1).max(10),
});

export type EnhanceImagesInput = z.infer<typeof EnhanceImagesInput>;

// ============================================================
// Catalog AI Router Inputs
// ============================================================

const Vertical = z.enum([
  'fashion', 'fmcg', 'electronics', 'jewellery', 'beauty', 'food', 'home_decor', 'general',
]);

export const CatalogGenerateInput = z.object({
  storeId: StoreId,
  imageUrls: z.array(z.string().url()).min(1).max(10),
  vertical: Vertical.optional(),
  hints: z.record(z.unknown()).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
});

export type CatalogGenerateInput = z.infer<typeof CatalogGenerateInput>;

export const BulkCatalogInput = z.object({
  storeId: StoreId,
  images: z.array(z.object({
    urls: z.array(z.string().url()).min(1).max(10),
    hints: z.string().optional(),
  })).min(1).max(20),
  vertical: Vertical.optional(),
  autoCreateDrafts: z.boolean().default(true),
});

export type BulkCatalogInput = z.infer<typeof BulkCatalogInput>;

// ============================================================
// Media Asset Row
// ============================================================

export const MediaAssetRow = z.object({
  id: EntityId,
  storeId: StoreId,
  productId: EntityId.nullable(),
  originalUrl: z.string().url(),
  originalKey: z.string(),
  filename: z.string(),
  contentType: z.string(),
  fileSizeBytes: z.number(),
  heroUrl: z.string().url().nullable(),
  cardUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  squareUrl: z.string().url().nullable(),
  ogUrl: z.string().url().nullable(),
  aiAnalysis: z.record(z.unknown()),
  enhancementStatus: z.enum(['pending', 'processing', 'done', 'failed']),
  enhancementError: z.string().nullable(),
  altText: z.string().nullable(),
  position: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MediaAssetRow = z.infer<typeof MediaAssetRow>;
