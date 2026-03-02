import { z } from 'zod';
import { StoreId, UserId, Slug, GSTIN, Address, SeoMeta } from './common.schema.js';

// ============================================================
// Store Status
// ============================================================

export const StoreStatus = z.enum([
  'onboarding',   // Still in creation flow
  'active',       // Live and accepting orders
  'paused',       // Seller paused the store
  'suspended',    // Admin suspended
]);
export type StoreStatus = z.infer<typeof StoreStatus>;

// ============================================================
// Vertical
// ============================================================

export const Vertical = z.enum([
  'fashion',
  'fmcg',
  'electronics',
  'jewellery',
  'beauty',
  'food',
  'home_decor',
  'general',
]);
export type Vertical = z.infer<typeof Vertical>;

// ============================================================
// Design Tokens (the config-driven theming system)
// ============================================================

export const PaletteConfig = z.object({
  mode: z.enum(['generated', 'custom']).default('generated'),
  seed: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textMuted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const FontConfig = z.object({
  display: z.string().min(1),
  body: z.string().min(1),
  scale: z.number().min(0.5).max(2.0).default(1.0),
});

export const HeroConfig = z.object({
  style: z.enum(['full_bleed', 'split_image', 'gradient', 'carousel', 'video', 'minimal_text', 'parallax']).default('full_bleed'),
  height: z.enum(['full', 'half', 'auto']).default('full'),
  overlayOpacity: z.number().min(0).max(1).default(0.3),
});

export const ProductCardConfig = z.object({
  style: z.enum(['minimal', 'hover_reveal', 'quick_view', 'editorial', 'compact', 'list', 'swipe']).default('minimal'),
  showPrice: z.boolean().default(true),
  showRating: z.boolean().default(true),
  imageRatio: z.enum(['3:4', '1:1', '4:3', '16:9']).default('3:4'),
});

export const NavConfig = z.object({
  style: z.enum(['top_bar', 'hamburger', 'sidebar', 'bottom_tab', 'sticky_minimal', 'mega_menu', 'search_first']).default('sticky_minimal'),
  showSearch: z.boolean().default(true),
  showCart: z.boolean().default(true),
  showWhatsapp: z.boolean().default(true),
});

export const CollectionConfig = z.object({
  style: z.enum(['masonry', 'uniform_grid', 'list', 'lookbook', 'filterable_sidebar']).default('uniform_grid'),
  columns: z.object({
    mobile: z.number().int().min(1).max(3).default(2),
    desktop: z.number().int().min(2).max(6).default(4),
  }).default({ mobile: 2, desktop: 4 }),
  pagination: z.enum(['infinite_scroll', 'paginated']).default('infinite_scroll'),
});

export const CheckoutConfig = z.object({
  style: z.enum(['single_page', 'multi_step', 'drawer', 'whatsapp']).default('single_page'),
  showTrustBadges: z.boolean().default(true),
  whatsappCheckout: z.boolean().default(false),
});

export const DesignTokens = z.object({
  layout: z.enum(['minimal', 'magazine', 'catalog_grid', 'single_product_hero', 'boutique', 'editorial', 'marketplace']).default('minimal'),
  palette: PaletteConfig,
  fonts: FontConfig,
  hero: HeroConfig.default({}),
  productCard: ProductCardConfig.default({}),
  nav: NavConfig.default({}),
  collection: CollectionConfig.default({}),
  checkout: CheckoutConfig.default({}),
  spacing: z.enum(['airy', 'balanced', 'compact', 'ultra_minimal']).default('balanced'),
  radius: z.enum(['sharp', 'subtle', 'rounded', 'pill']).default('rounded'),
  imageStyle: z.enum(['raw', 'subtle_shadow', 'border_frame', 'hover_zoom', 'rounded']).default('subtle_shadow'),
  animation: z.enum(['none', 'fade', 'slide_up', 'bounce', 'staggered']).default('fade'),
});

export type DesignTokens = z.infer<typeof DesignTokens>;

// ============================================================
// Section Config (homepage composition)
// ============================================================

export const SectionConfig = z.object({
  type: z.string().min(1),
  config: z.record(z.unknown()).default({}),
});

export const SectionsConfig = z.object({
  homepage: z.array(SectionConfig).default([]),
  productPage: z.array(SectionConfig).default([]),
});

// ============================================================
// Store Config (the master JSON stored per store)
// ============================================================

export const StoreConfig = z.object({
  design: DesignTokens,
  sections: SectionsConfig.default({}),
  verticalOverrides: z.record(z.unknown()).default({}),
  sellerContext: z.object({
    audience: z.string().optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }).optional(),
    brandVibe: z.string().optional(),
  }).default({}),
  /** AI-generated hero headline — specific to this brand */
  heroTagline: z.string().optional(),
  /** AI-generated hero subtext */
  heroSubtext: z.string().optional(),
  /** AI-generated store bio for the about section */
  storeBio: z.string().optional(),
  language: z.string().default('en'),
  currency: z.literal('INR').default('INR'),
  integrations: z.object({
    razorpay: z.record(z.unknown()).optional(),
    shiprocket: z.record(z.unknown()).optional(),
    whatsapp: z.record(z.unknown()).optional(),
  }).default({}),
});

export type StoreConfig = z.infer<typeof StoreConfig>;

// ============================================================
// WhatsApp Config (per-store WhatsApp settings)
// ============================================================

export const WhatsAppConfig = z.object({
  enabled: z.boolean().default(false),
  businessPhone: z.string().optional(),
  autoOrderNotifications: z.boolean().default(true),
  optInAtCheckout: z.boolean().default(true),
  maxPromoMessagesPerWeek: z.number().int().min(1).max(5).default(3),
});

export type WhatsAppConfig = z.infer<typeof WhatsAppConfig>;

// ============================================================
// Store CRUD Schemas
// ============================================================

export const CreateStoreInput = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: Slug,
  vertical: Vertical,
  description: z.string().max(500).optional(),
  storeConfig: StoreConfig.optional(),
  whatsappConfig: WhatsAppConfig.optional(),
  gstin: GSTIN,
  businessName: z.string().max(200).optional(),
  registeredAddress: Address.optional(),
});

export const UpdateStoreInput = z.object({
  storeId: StoreId,
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  storeConfig: StoreConfig.partial().optional(),
  whatsappConfig: WhatsAppConfig.partial().optional(),
  status: StoreStatus.optional(),
  gstin: GSTIN,
  businessName: z.string().max(200).optional(),
});

export const GetStoreInput = z.object({
  storeId: StoreId.optional(),
  slug: Slug.optional(),
}).refine(
  (data) => data.storeId || data.slug,
  { message: 'Either storeId or slug must be provided' }
);

export type CreateStoreInput = z.infer<typeof CreateStoreInput>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreInput>;
export type GetStoreInput = z.infer<typeof GetStoreInput>;

// ============================================================
// Store DB Row Type
// ============================================================

export const StoreRow = z.object({
  id: StoreId,
  ownerId: UserId,
  name: z.string(),
  slug: z.string(),
  vertical: Vertical,
  description: z.string().nullable(),
  storeConfig: StoreConfig,
  whatsappConfig: WhatsAppConfig,
  status: StoreStatus,
  customDomain: z.string().nullable(),
  gstin: z.string().nullable(),
  businessName: z.string().nullable(),
  registeredAddress: Address.nullable(),
  stateCode: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StoreRow = z.infer<typeof StoreRow>;
