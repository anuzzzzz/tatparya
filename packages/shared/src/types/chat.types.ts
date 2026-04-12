import { z } from 'zod';

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
  recentProducts: { id: string; name: string; price: number; status: string; tags: string[] }[];
  recentOrders: { id: string; orderNumber: string; status: string; total: number; buyerName: string }[];
  categories: { id: string; name: string; productCount: number }[];
  collections: { id: string; name: string; type: string; productCount: number }[];
}

export interface ConversationTurn { role: 'seller' | 'ai'; content: string; actionsTaken?: string[] }
export interface TatparyaAction { type: string; payload: Record<string, any> }

export const LLMRouterOutput = z.object({
  actions: z.array(z.object({ type: z.string(), payload: z.record(z.any()).default({}) })).default([]),
  response: z.string(),
  followUp: z.string().optional(),
  confirmationNeeded: z.object({ summary: z.string(), actions: z.array(z.object({ type: z.string(), payload: z.record(z.any()).default({}) })) }).optional(),
  suggestions: z.array(z.object({ label: z.string(), description: z.string().optional() })).optional(),
});
export type LLMRouterOutput = z.infer<typeof LLMRouterOutput>;

export const DESIGN_ACTIONS = new Set(['store.update_palette','store.update_fonts','store.update_hero_style','store.update_product_card_style','store.update_nav_style','store.update_collection_style','store.update_checkout_style','store.update_layout','store.update_spacing','store.update_radius','store.update_image_style','store.update_animation','store.update_design_bulk','store.regenerate_design','store.undo_design']);

export const DESTRUCTIVE_ACTIONS = new Set(['store.delete','product.delete','product.archive','order.cancel','discount.deactivate','category.delete','collection.delete','variant.delete','product.bulk_update_price']);

export const VALID_ACTION_TYPES = new Set(['store.create','store.delete','store.update_name','store.update_description','store.update_status','store.update_hero_text','store.update_bio','store.update_hero_cta','store.update_announcement','store.update_social_links','store.update_palette','store.update_fonts','store.update_hero_style','store.update_product_card_style','store.update_nav_style','store.update_collection_style','store.update_checkout_style','store.update_layout','store.update_spacing','store.update_radius','store.update_image_style','store.update_animation','store.update_design_bulk','store.regenerate_design','store.regenerate_catalog','store.undo_design','section.toggle','section.reorder','section.update_config','product.create','product.update','product.delete','product.publish','product.archive','product.bulk_publish','product.bulk_update_price','variant.create','variant.update','variant.delete','stock.update','category.create','category.update','category.delete','category.assign_product','collection.create','collection.update','collection.delete','collection.add_products','collection.remove_products','order.update_status','order.ship','order.cancel','discount.create','discount.deactivate','media.set_hero_banner','media.set_product_images','media.set_category_image','media.set_collection_banner','query.products','query.orders','query.revenue','query.categories','query.collections','query.store_info','query.store_link','query.discounts']);

export function generateActionSchemaReference(): string {
  return `AVAILABLE ACTIONS:

store.create             { name: string, vertical?: string }
  Ask ONLY for the store name. Vertical defaults to "general". NEVER invent or guess a store name.

store.delete              {}
  Permanently deletes the current store and ALL data. USE FOR: "delete my store", "start over", "reset everything".
  DESTRUCTIVE - always require confirmationNeeded.

store.update_name        { name: string }
store.update_description { description: string }
store.update_status      { status: "active" | "paused" }
store.update_hero_text   { heroTagline?: string, heroSubtext?: string }
store.update_bio         { storeBio: string }
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
store.regenerate_design   { sellerHints?, brandVibe?, colorMood? } - Full AI redesign (~30s)
store.regenerate_catalog  { sellerHints? } - Re-run Vision AI on photos
store.undo_design         {} - Revert last design change
store.update_hero_cta     { ctaText?, ctaSecondaryText? }
store.update_announcement { messages?, bgColor?, textColor?, visible? }
store.update_social_links { instagram?, whatsapp?, facebook?, twitter?, youtube?, email? }

section.toggle         { sectionType: string, visible: boolean }
section.reorder        { order: string[] }
section.update_config  { sectionType: string, config: object }

product.create         { name, description?, price, compareAtPrice?, categoryId?, tags?, status?, hsnCode?, gstRate? }
product.update         { productId, name?, description?, price?, compareAtPrice?, categoryId?, tags?, status?, hsnCode?, gstRate? }
product.delete         { productId }  DESTRUCTIVE
product.publish        { productId }
product.archive        { productId }  DESTRUCTIVE
product.bulk_publish   { productIds?: string[] }
product.bulk_update_price { adjustmentType: "percentage" | "flat", adjustmentValue, filterByCategory?, filterByTags? }  DESTRUCTIVE

variant.create   { productId, attributes, price?, stock?, sku? }
variant.update   { variantId, attributes?, price?, stock?, sku? }
variant.delete   { variantId }  DESTRUCTIVE
stock.update     { variantId, adjustment: number }

category.create         { name, parentId?, imageUrl?, defaultHsnCode? }
category.update         { categoryId, name?, imageUrl? }
category.delete         { categoryId }  DESTRUCTIVE
category.assign_product { productId, categoryIds, primaryCategoryId? }

collection.create          { name, type?, description?, rules?, sortOrder?, isFeatured? }
collection.update          { collectionId, name?, description?, status? }
collection.delete          { collectionId }  DESTRUCTIVE
collection.add_products    { collectionId, productIds }
collection.remove_products { collectionId, productIds }

order.update_status { orderId, status, trackingNumber?, trackingUrl?, notes? }
order.ship          { orderId, trackingNumber?, trackingUrl? }
order.cancel        { orderId, reason? }  DESTRUCTIVE

discount.create     { code, type, value, minOrderValue?, maxDiscount?, usageLimit?, endsAt?, whatsappOnly? }
discount.deactivate { discountId }  DESTRUCTIVE

media.set_hero_banner      { mediaAssetId }
media.set_product_images   { productId, mediaAssetIds }
media.set_category_image   { categoryId, mediaAssetId }
media.set_collection_banner { collectionId, mediaAssetId }

query.products    { status?, categoryId?, search?, tags?, minPrice?, maxPrice?, limit? }
query.orders      { status?, period?, limit? }
query.revenue     { period: "today" | "week" | "month" }
query.categories  {}
query.collections { featured? }
query.store_info  {}
query.store_link  {}
query.discounts   { activeOnly? }

Actions marked DESTRUCTIVE require confirmationNeeded in the response.`;
}
