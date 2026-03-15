import { z } from 'zod';

// ============================================================
// Chat Types & Action System
//
// Defines the full action vocabulary for Tatparya's LLM router.
// Used by:
//   - chat-llm.service (system prompt schema reference)
//   - action-validators (pre-execution checks)
//   - action-executor (dispatch to DB writes)
//   - chat.router (orchestration)
// ============================================================

// ============================================================
// Store Snapshot — injected into LLM context each call
// ============================================================

export interface StoreSnapshot {
  name: string;
  slug: string;
  vertical: string;
  status: string;
  storeConfig: Record<string, unknown>;
  productCount: number;
  draftProductCount: number;
  activeProductCount: number;
  categoryCount: number;
  collectionCount: number;
  orderCount: number;
  pendingOrderCount: number;
  heroTagline?: string;
  heroSubtext?: string;
  storeBio?: string;
  recentProducts: {
    id: string;
    name: string;
    price: number;
    status: string;
    tags: string[];
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    buyerName: string;
  }[];
  categories: {
    id: string;
    name: string;
    productCount: number;
  }[];
  collections: {
    id: string;
    name: string;
    type: string;
    productCount: number;
  }[];
}

// ============================================================
// Conversation Turn — chat history item
// ============================================================

export interface ConversationTurn {
  role: 'seller' | 'ai';
  content: string;
  actionsTaken?: string[];
}

// ============================================================
// TatparyaAction — the universal action type
// ============================================================

export interface TatparyaAction {
  type: string;
  payload: Record<string, any>;
}

// ============================================================
// LLM Router Output — what Haiku returns
// ============================================================

export const LLMRouterOutput = z.object({
  actions: z.array(z.object({
    type: z.string(),
    payload: z.record(z.any()),
  })).default([]),
  response: z.string(),
  followUp: z.string().optional(),
  confirmationNeeded: z.object({
    summary: z.string(),
    actions: z.array(z.object({
      type: z.string(),
      payload: z.record(z.any()),
    })),
  }).optional(),
  suggestions: z.array(z.object({
    label: z.string(),
    description: z.string().optional(),
  })).optional(),
});

export type LLMRouterOutput = z.infer<typeof LLMRouterOutput>;

// ============================================================
// Action Sets
// ============================================================

/** Design-related actions that need WCAG validation */
export const DESIGN_ACTIONS = new Set([
  'store.update_palette',
  'store.update_fonts',
  'store.update_hero_style',
  'store.update_product_card_style',
  'store.update_nav_style',
  'store.update_collection_style',
  'store.update_checkout_style',
  'store.update_layout',
  'store.update_spacing',
  'store.update_radius',
  'store.update_image_style',
  'store.update_animation',
  'store.update_design_bulk',
  'store.regenerate_design',
  'store.undo_design',
]);

/** Destructive actions that require seller confirmation */
export const DESTRUCTIVE_ACTIONS = new Set([
  'product.delete',
  'product.archive',
  'order.cancel',
  'discount.deactivate',
  'category.delete',
  'collection.delete',
  'variant.delete',
  'product.bulk_update_price',
]);

/** Complete whitelist of valid action types — used in validator to reject hallucinated types */
export const VALID_ACTION_TYPES = new Set([
  // Store identity
  'store.update_name',
  'store.update_description',
  'store.update_status',
  'store.update_hero_text',
  'store.update_bio',
  'store.update_hero_cta',
  'store.update_announcement',
  'store.update_social_links',
  // Store design
  'store.update_palette',
  'store.update_fonts',
  'store.update_hero_style',
  'store.update_product_card_style',
  'store.update_nav_style',
  'store.update_collection_style',
  'store.update_checkout_style',
  'store.update_layout',
  'store.update_spacing',
  'store.update_radius',
  'store.update_image_style',
  'store.update_animation',
  'store.update_design_bulk',
  'store.regenerate_design',
  'store.regenerate_catalog',
  'store.undo_design',
  // Sections
  'section.toggle',
  'section.reorder',
  'section.update_config',
  // Products
  'product.create',
  'product.update',
  'product.delete',
  'product.publish',
  'product.archive',
  'product.bulk_publish',
  'product.bulk_update_price',
  // Variants
  'variant.create',
  'variant.update',
  'variant.delete',
  // Stock
  'stock.update',
  // Categories
  'category.create',
  'category.update',
  'category.delete',
  'category.assign_product',
  // Collections
  'collection.create',
  'collection.update',
  'collection.delete',
  'collection.add_products',
  'collection.remove_products',
  // Orders
  'order.update_status',
  'order.ship',
  'order.cancel',
  // Discounts
  'discount.create',
  'discount.deactivate',
  // Media
  'media.set_hero_banner',
  'media.set_product_images',
  'media.set_category_image',
  'media.set_collection_banner',
  // Queries
  'query.products',
  'query.orders',
  'query.revenue',
  'query.categories',
  'query.collections',
  'query.store_info',
  'query.store_link',
  'query.discounts',
]);

// ============================================================
// Action Schema Reference — injected into system prompt
// ============================================================

export function generateActionSchemaReference(): string {
  return `AVAILABLE ACTIONS:

── Store Identity ──
store.update_name        { name: string }
store.update_description { description: string }
store.update_status      { status: "active" | "paused" }
store.update_hero_text   { heroTagline?: string, heroSubtext?: string }
store.update_bio         { storeBio: string }

── Store Design ──
store.update_palette     { palette: { mode: "custom", primary, secondary, accent, background, surface, text, textMuted } }
store.update_fonts       { fonts: { display: string, body: string, scale?: number } }
store.update_hero_style  { hero: { style, height, overlayOpacity } }
store.update_product_card_style { productCard: { style, showPrice, showRating, imageRatio } }
store.update_nav_style   { nav: { style, showSearch, showCart, showWhatsapp } }
store.update_collection_style { collection: { style, columns, pagination } }
store.update_checkout_style   { checkout: { style, showTrustBadges, whatsappCheckout } }
store.update_layout      { layout: string }
store.update_spacing     { spacing: string }
store.update_radius      { radius: string }
store.update_image_style { imageStyle: string }
store.update_animation   { animation: string }
store.update_design_bulk { design: { partial DesignTokens object } }

── Store Design (Full Pipeline) ──
store.regenerate_design   { sellerHints?: string, brandVibe?: string, colorMood?: string }
  → Runs the full Director→Stylist AI pipeline (~10-30s). Regenerates entire store design.
  USE FOR: "redesign my store", "make it more modern", "completely change the look",
  "I want a minimal vibe", "the colors don't feel right — redo it", any request that
  implies wholesale design change rather than a single token tweak.
  DO NOT USE FOR: "change the font to Inter" (use store.update_fonts), "make the hero taller"
  (use store.update_hero_style), "change primary color to blue" (use store.update_palette).

store.regenerate_catalog  { sellerHints?: string }
  → Re-runs Vision AI on all product photos (~15-45s). Regenerates product names, descriptions, prices.
  USE FOR: "re-analyze my photos", "update product descriptions", "rename my products",
  "the product names aren't good".

store.undo_design         {}
  → Reverts the store design to what it was before the last design change.
  USE FOR: "undo", "go back", "revert", "I don't like this, change it back",
  "restore the old design", "undo that change".

store.update_hero_cta     { ctaText?: string, ctaSecondaryText?: string }
  → Updates the hero section call-to-action button text.
  USE FOR: "change the shop button to X", "update the CTA", "change the hero button text".

store.update_announcement { messages?: string[], bgColor?: string, textColor?: string, visible?: boolean }
  → Updates the announcement bar at the top of the store.
  USE FOR: "change the announcement", "update the banner text", "hide/show the announcement bar",
  "add a sale announcement", "change announcement bar color".

store.update_social_links { instagram?: string, whatsapp?: string, facebook?: string, twitter?: string, youtube?: string, email?: string }
  → Updates the store's social media links shown in the footer and floating button.
  USE FOR: "add my Instagram", "set my WhatsApp number", "link my Facebook", "add email contact",
  "update social media links", "add my YouTube channel".
  For instagram/facebook/twitter/youtube: accept full URL or handle (e.g. "@mystore" or "mystore").
  For whatsapp: accept phone number with or without country code (e.g. "9876543210" or "+919876543210").
  For email: accept email address.

── Sections ──
section.toggle         { sectionType: string, visible: boolean }
section.reorder        { order: string[] }
section.update_config  { sectionType: string, config: object }

── Products ──
product.create         { name, description?, price, compareAtPrice?, categoryId?, tags?, status?, hsnCode?, gstRate? }
product.update         { productId, name?, description?, price?, compareAtPrice?, categoryId?, tags?, status?, hsnCode?, gstRate? }
product.delete         { productId }  ⚠️ DESTRUCTIVE
product.publish        { productId }
product.archive        { productId }  ⚠️ DESTRUCTIVE
product.bulk_publish   { productIds?: string[] }
product.bulk_update_price { adjustmentType: "percentage" | "flat", adjustmentValue: number, filterByCategory?, filterByTags? }  ⚠️ DESTRUCTIVE

── Variants ──
variant.create   { productId, attributes: object, price?, stock?, sku? }
variant.update   { variantId, attributes?, price?, stock?, sku? }
variant.delete   { variantId }  ⚠️ DESTRUCTIVE

── Stock ──
stock.update     { variantId, adjustment: number }

── Categories ──
category.create         { name, parentId?, imageUrl?, defaultHsnCode? }
category.update         { categoryId, name?, imageUrl? }
category.delete         { categoryId }  ⚠️ DESTRUCTIVE
category.assign_product { productId, categoryIds: string[], primaryCategoryId? }

── Collections ──
collection.create          { name, type?: "manual" | "smart", description?, rules?, sortOrder?, isFeatured? }
collection.update          { collectionId, name?, description?, status? }
collection.delete          { collectionId }  ⚠️ DESTRUCTIVE
collection.add_products    { collectionId, productIds: string[] }
collection.remove_products { collectionId, productIds: string[] }

── Orders ──
order.update_status { orderId, status, trackingNumber?, trackingUrl?, notes? }
order.ship          { orderId, trackingNumber?, trackingUrl? }
order.cancel        { orderId, reason? }  ⚠️ DESTRUCTIVE

── Discounts ──
discount.create     { code, type: "percentage" | "flat", value: number, minOrderValue?, maxDiscount?, usageLimit?, endsAt?, whatsappOnly? }
discount.deactivate { discountId }  ⚠️ DESTRUCTIVE

── Media ──
media.set_hero_banner      { mediaAssetId }
media.set_product_images   { productId, mediaAssetIds: string[] }
media.set_category_image   { categoryId, mediaAssetId }
media.set_collection_banner { collectionId, mediaAssetId }

── Queries (read-only) ──
query.products    { status?, categoryId?, search?, tags?, minPrice?, maxPrice?, limit? }
query.orders      { status?, period?: "today" | "week" | "month", limit? }
query.revenue     { period: "today" | "week" | "month" }
query.categories  {}
query.collections { featured?: boolean }
query.store_info  {}
query.store_link  {}
query.discounts   { activeOnly?: boolean }

Actions marked ⚠️ DESTRUCTIVE require confirmationNeeded in the response.`;
}
