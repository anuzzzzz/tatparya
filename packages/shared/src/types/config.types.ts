// Re-export Zod inferred types for use across packages
// These are the runtime-validated versions from schemas

export type {
  StoreConfig,
  WhatsAppConfig,
  DesignTokens,
  StoreStatus,
  Vertical,
  StoreRow,
  CreateStoreInput,
  UpdateStoreInput,
} from '../schemas/store.schema.js';

export type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsInput,
  ProductStatus,
  ProductImage,
  CreateVariantInput,
  UpdateVariantInput,
  UpdateStockInput,
  CreateCategoryInput,
} from '../schemas/product.schema.js';

export type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingMode,
  FulfillmentStatus,
  LineItem,
  CreateOrderInput,
  UpdateOrderStatusInput,
  ListOrdersInput,
  InvoiceLineItem,
  InvoiceType,
} from '../schemas/order.schema.js';

// ============================================================
// Font Pairing Presets (for AI to select from)
// ============================================================

export interface FontPairing {
  id: string;
  display: string;
  body: string;
  mood: string;
  verticals: string[];
}

export const FONT_PAIRINGS: FontPairing[] = [
  { id: 'classic_luxury', display: 'Playfair Display', body: 'DM Sans', mood: 'premium, elegant', verticals: ['fashion', 'jewellery'] },
  { id: 'modern_bold', display: 'Space Grotesk', body: 'Inter', mood: 'modern, clean', verticals: ['electronics', 'general'] },
  { id: 'friendly_warm', display: 'Bricolage Grotesque', body: 'Instrument Sans', mood: 'friendly, approachable', verticals: ['food', 'fmcg'] },
  { id: 'editorial', display: 'Clash Display', body: 'Satoshi', mood: 'editorial, fashion-forward', verticals: ['fashion', 'beauty'] },
  { id: 'minimal_clean', display: 'Geist', body: 'Geist', mood: 'minimal, tech', verticals: ['electronics', 'general'] },
];

// ============================================================
// Design Presets (curated token combos for AI to start from)
// ============================================================

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  verticals: string[];
  tokens: Partial<import('../schemas/store.schema.js').DesignTokens>;
}
