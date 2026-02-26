import { z } from 'zod';

// ============================================================
// Primitives — reusable atomic schemas
// ============================================================

export const StoreId = z.string().uuid().describe('Store tenant ID');
export const UserId = z.string().uuid().describe('Supabase auth user ID');
export const EntityId = z.string().uuid().describe('Generic entity UUID');

export const IndianPhone = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Must be a valid Indian phone number (+91XXXXXXXXXX)')
  .describe('Indian mobile number with +91 prefix');

export const Email = z.string().email().toLowerCase().optional();

export const Slug = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a URL-safe slug (lowercase, hyphens only)');

export const INRAmount = z
  .number()
  .min(0)
  .multipleOf(0.01)
  .describe('Amount in INR (paisa precision)');

export const Percentage = z.number().min(0).max(100).describe('Percentage value 0-100');

export const GSTIN = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
  .optional();

export const HSNCode = z
  .string()
  .regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits');

export const Pincode = z
  .string()
  .regex(/^[1-9]\d{5}$/, 'Must be a valid 6-digit Indian pincode');

export const StateCode = z
  .string()
  .regex(/^\d{2}$/, 'State code must be 2 digits');

// ============================================================
// Pagination & Filtering
// ============================================================

export const PaginationInput = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortInput = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const DateRangeInput = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type PaginationInput = z.infer<typeof PaginationInput>;
export type SortInput = z.infer<typeof SortInput>;
export type DateRangeInput = z.infer<typeof DateRangeInput>;

// ============================================================
// Address
// ============================================================

export const Address = z.object({
  name: z.string().min(1).max(200),
  phone: IndianPhone,
  line1: z.string().min(1).max(500),
  line2: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  stateCode: StateCode,
  pincode: Pincode,
  country: z.literal('IN').default('IN'),
  landmark: z.string().max(200).optional(),
});

export type Address = z.infer<typeof Address>;

// ============================================================
// SEO Meta
// ============================================================

export const SeoMeta = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  keywords: z.array(z.string()).max(10).optional(),
  ogImage: z.string().url().optional(),
});

export type SeoMeta = z.infer<typeof SeoMeta>;

// ============================================================
// API Response Wrappers
// ============================================================

export const PaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
  });

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiError>;
