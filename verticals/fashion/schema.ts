import { z } from 'zod';

/**
 * Fashion vertical-specific product data schema.
 * Stored in products.vertical_data JSONB column.
 */
export const FashionProductData = z.object({
  fabric: z.string().max(100).optional(),
  careInstructions: z.string().max(500).optional(),
  occasion: z.array(z.string()).max(10).optional(),
  fitType: z.enum(['regular', 'slim', 'relaxed', 'oversized', 'custom']).optional(),
  sleeveType: z.enum(['full', 'half', 'sleeveless', 'three_quarter', 'cap']).optional(),
  neckType: z.string().max(50).optional(),
  length: z.string().max(50).optional(),
  pattern: z.string().max(50).optional(),
  work: z.string().max(100).optional(), // Embroidery, print, etc.
  transparency: z.enum(['opaque', 'semi_sheer', 'sheer']).optional(),
  washCare: z.enum(['machine_wash', 'hand_wash', 'dry_clean_only']).optional(),
  countryOfOrigin: z.string().max(100).default('India'),
});

export type FashionProductData = z.infer<typeof FashionProductData>;

/**
 * Fashion variant attributes — size and color
 */
export const FASHION_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL',
  // Numeric
  '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48',
  // Saree-specific
  'Free Size', 'Standard (5.5m)', 'With Blouse',
] as const;

export const FASHION_CATEGORIES_SEED = [
  { name: 'Sarees', slug: 'sarees', defaultHsn: '6211' },
  { name: 'Kurtis', slug: 'kurtis', defaultHsn: '6206' },
  { name: 'Lehengas', slug: 'lehengas', defaultHsn: '6204' },
  { name: 'Shirts', slug: 'shirts', defaultHsn: '6205' },
  { name: 'Trousers', slug: 'trousers', defaultHsn: '6203' },
  { name: 'Dupattas', slug: 'dupattas', defaultHsn: '6214' },
  { name: 'Accessories', slug: 'accessories', defaultHsn: '6217' },
  { name: 'Footwear', slug: 'footwear', defaultHsn: '6404' },
];

/**
 * Design presets for fashion stores
 */
export const FASHION_DESIGN_PRESETS = [
  {
    id: 'luxury_silk',
    name: 'Luxury Silk',
    description: 'Elegant serif fonts, warm palette, airy spacing. For premium handloom.',
    tokens: {
      layout: 'magazine' as const,
      fonts: { display: 'Playfair Display', body: 'DM Sans', scale: 1.0 },
      spacing: 'airy' as const,
      radius: 'subtle' as const,
      animation: 'fade' as const,
    },
  },
  {
    id: 'street_fashion',
    name: 'Street Fashion',
    description: 'Bold sans-serif, vibrant colors, compact grid. For trendy brands.',
    tokens: {
      layout: 'catalog_grid' as const,
      fonts: { display: 'Space Grotesk', body: 'Inter', scale: 1.0 },
      spacing: 'compact' as const,
      radius: 'rounded' as const,
      animation: 'slide_up' as const,
    },
  },
  {
    id: 'boutique',
    name: 'Boutique',
    description: 'Editorial feel, serif display, lookbook-style. For curated collections.',
    tokens: {
      layout: 'boutique' as const,
      fonts: { display: 'Clash Display', body: 'Satoshi', scale: 1.0 },
      spacing: 'airy' as const,
      radius: 'sharp' as const,
      animation: 'fade' as const,
    },
  },
];
