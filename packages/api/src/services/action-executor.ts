import type { SupabaseClient } from '@supabase/supabase-js';
import type { TatparyaAction } from '@tatparya/shared';

// ============================================================
// Action Executor
//
// Executes validated TatparyaAction[] against Supabase.
// Each action type maps to direct DB writes using serviceDb
// (bypasses RLS). Does NOT call tRPC routers internally.
//
// Actions execute independently — if one fails, the rest
// continue. All results are returned to the chat endpoint.
// ============================================================

export interface ExecutionResult {
  action: TatparyaAction;
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeActions(
  actions: TatparyaAction[],
  storeId: string,
  db: SupabaseClient,
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const action of actions) {
    try {
      const data = await executeSingle(action, storeId, db);
      results.push({ action, success: true, data });
    } catch (err: any) {
      console.error(`[action-executor] Failed ${action.type}:`, err.message);
      results.push({ action, success: false, error: err.message });
    }
  }

  return results;
}

// ============================================================
// Single action dispatcher
// ============================================================

async function executeSingle(
  action: TatparyaAction,
  storeId: string,
  db: SupabaseClient,
): Promise<unknown> {
  switch (action.type) {
    // ── Store Identity ──────────────────────────────────
    case 'store.update_name':
      return updateStore(db, storeId, { name: action.payload.name });

    case 'store.update_description':
      return updateStore(db, storeId, { description: action.payload.description });

    case 'store.update_status':
      return updateStore(db, storeId, { status: action.payload.status });

    case 'store.update_hero_text':
      return updateStoreConfig(db, storeId, {
        heroTagline: action.payload.heroTagline,
        heroSubtext: action.payload.heroSubtext,
      });

    case 'store.update_bio':
      return updateStoreConfig(db, storeId, { storeBio: action.payload.storeBio });

    // ── Store Design ────────────────────────────────────
    case 'store.update_palette':
      return updateStoreDesign(db, storeId, { palette: action.payload.palette });

    case 'store.update_fonts':
      return updateStoreDesign(db, storeId, { fonts: action.payload.fonts });

    case 'store.update_hero_style':
      return updateStoreDesign(db, storeId, { hero: action.payload.hero });

    case 'store.update_product_card_style':
      return updateStoreDesign(db, storeId, { productCard: action.payload.productCard });

    case 'store.update_nav_style':
      return updateStoreDesign(db, storeId, { nav: action.payload.nav });

    case 'store.update_collection_style':
      return updateStoreDesign(db, storeId, { collection: action.payload.collection });

    case 'store.update_checkout_style':
      return updateStoreDesign(db, storeId, { checkout: action.payload.checkout });

    case 'store.update_layout':
      return updateStoreDesign(db, storeId, { layout: action.payload.layout });

    case 'store.update_spacing':
      return updateStoreDesign(db, storeId, { spacing: action.payload.spacing });

    case 'store.update_radius':
      return updateStoreDesign(db, storeId, { radius: action.payload.radius });

    case 'store.update_image_style':
      return updateStoreDesign(db, storeId, { imageStyle: action.payload.imageStyle });

    case 'store.update_animation':
      return updateStoreDesign(db, storeId, { animation: action.payload.animation });

    case 'store.update_design_bulk':
      return updateStoreDesign(db, storeId, action.payload.design);

    // ── Sections ────────────────────────────────────────
    case 'section.toggle':
      return toggleSection(db, storeId, action.payload.sectionType, action.payload.visible);

    case 'section.reorder':
      return reorderSections(db, storeId, action.payload.order);

    case 'section.update_config':
      return updateSectionConfig(db, storeId, action.payload.sectionType, action.payload.config);

    // ── Products ────────────────────────────────────────
    case 'product.create':
      return createProduct(db, storeId, action.payload);

    case 'product.update':
      return updateProduct(db, storeId, action.payload);

    case 'product.delete':
      return deleteRow(db, 'products', storeId, action.payload.productId);

    case 'product.publish':
      return updateRow(db, 'products', storeId, action.payload.productId, { status: 'active' });

    case 'product.archive':
      return updateRow(db, 'products', storeId, action.payload.productId, { status: 'archived' });

    case 'product.bulk_update_price':
      return bulkUpdatePrice(db, storeId, action.payload);

    case 'product.bulk_publish':
      return bulkPublish(db, storeId, action.payload.productIds);

    // ── Variants ────────────────────────────────────────
    case 'variant.create':
      return createVariant(db, storeId, action.payload);

    case 'variant.update':
      return updateRow(db, 'variants', storeId, action.payload.variantId, action.payload);

    case 'variant.delete':
      return deleteRow(db, 'variants', storeId, action.payload.variantId);

    case 'stock.update':
      return adjustStock(db, storeId, action.payload.variantId, action.payload.adjustment);

    // ── Categories ──────────────────────────────────────
    case 'category.create':
      return createCategory(db, storeId, action.payload);

    case 'category.update':
      return updateRow(db, 'categories', storeId, action.payload.categoryId, action.payload);

    case 'category.delete':
      return deleteRow(db, 'categories', storeId, action.payload.categoryId);

    case 'category.assign_product':
      return assignProductToCategories(db, storeId, action.payload);

    // ── Collections ─────────────────────────────────────
    case 'collection.create':
      return createCollection(db, storeId, action.payload);

    case 'collection.update':
      return updateRow(db, 'collections', storeId, action.payload.collectionId, action.payload);

    case 'collection.delete':
      return deleteRow(db, 'collections', storeId, action.payload.collectionId);

    case 'collection.add_products':
      return addProductsToCollection(db, storeId, action.payload.collectionId, action.payload.productIds);

    case 'collection.remove_products':
      return removeProductsFromCollection(db, action.payload.collectionId, action.payload.productIds);

    // ── Orders ──────────────────────────────────────────
    case 'order.update_status':
      return updateRow(db, 'orders', storeId, action.payload.orderId, {
        status: action.payload.status,
        tracking_number: action.payload.trackingNumber,
        tracking_url: action.payload.trackingUrl,
        notes: action.payload.notes,
      });

    case 'order.ship':
      return updateRow(db, 'orders', storeId, action.payload.orderId, {
        status: 'shipped',
        tracking_number: action.payload.trackingNumber,
        tracking_url: action.payload.trackingUrl,
      });

    case 'order.cancel':
      return updateRow(db, 'orders', storeId, action.payload.orderId, {
        status: 'cancelled',
        notes: action.payload.reason,
      });

    // ── Discounts ───────────────────────────────────────
    case 'discount.create':
      return createDiscount(db, storeId, action.payload);

    case 'discount.deactivate':
      return updateRow(db, 'discounts', storeId, action.payload.discountId, { is_active: false });

    // ── Media ───────────────────────────────────────────
    case 'media.set_hero_banner':
      return setHeroBanner(db, storeId, action.payload.mediaAssetId);

    case 'media.set_product_images':
      return setProductImages(db, storeId, action.payload.productId, action.payload.mediaAssetIds);

    case 'media.set_category_image':
      return setCategoryImage(db, storeId, action.payload.categoryId, action.payload.mediaAssetId);

    case 'media.set_collection_banner':
      return setCollectionBanner(db, storeId, action.payload.collectionId, action.payload.mediaAssetId);

    // ── Queries (read-only) ─────────────────────────────
    case 'query.products':
      return queryProducts(db, storeId, action.payload);

    case 'query.orders':
      return queryOrders(db, storeId, action.payload);

    case 'query.revenue':
      return queryRevenue(db, storeId, action.payload.period);

    case 'query.categories':
      return queryCategories(db, storeId);

    case 'query.collections':
      return queryCollections(db, storeId, action.payload);

    case 'query.store_info':
      return queryStoreInfo(db, storeId);

    case 'query.store_link':
      return queryStoreLink(db, storeId);

    case 'query.discounts':
      return queryDiscounts(db, storeId, action.payload);

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }
}

// ============================================================
// Store helpers
// ============================================================

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

async function getStoreConfig(db: SupabaseClient, storeId: string): Promise<Record<string, any>> {
  const { data, error } = await db.from('stores')
    .select('store_config')
    .eq('id', storeId)
    .single();
  if (error) throw new Error(`Failed to read store config: ${error.message}`);
  return (data.store_config || {}) as Record<string, any>;
}

async function updateStore(db: SupabaseClient, storeId: string, fields: Record<string, any>) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  const { data, error } = await db.from('stores')
    .update(clean)
    .eq('id', storeId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update store: ${error.message}`);
  return data;
}

async function updateStoreConfig(db: SupabaseClient, storeId: string, updates: Record<string, any>) {
  const config = await getStoreConfig(db, storeId);
  const merged = { ...config, ...stripUndefined(updates) };
  return updateStore(db, storeId, { store_config: merged });
}

async function updateStoreDesign(db: SupabaseClient, storeId: string, designUpdates: Record<string, any>) {
  const config = await getStoreConfig(db, storeId);
  const currentDesign = config.design || {};
  const mergedDesign = deepMerge(currentDesign, stripUndefined(designUpdates));
  return updateStore(db, storeId, { store_config: { ...config, design: mergedDesign } });
}

// ============================================================
// Section helpers
// ============================================================

async function toggleSection(db: SupabaseClient, storeId: string, sectionType: string, visible: boolean) {
  const config = await getStoreConfig(db, storeId);
  const sections = config.sections?.homepage || [];
  const idx = sections.findIndex((s: any) => s.type === sectionType);
  if (idx >= 0) {
    sections[idx].config = { ...sections[idx].config, visible };
  } else if (visible) {
    sections.push({ type: sectionType, config: { visible: true } });
  }
  return updateStore(db, storeId, { store_config: { ...config, sections: { ...config.sections, homepage: sections } } });
}

async function reorderSections(db: SupabaseClient, storeId: string, order: string[]) {
  const config = await getStoreConfig(db, storeId);
  const existing = config.sections?.homepage || [];
  const reordered = order
    .map((type) => existing.find((s: any) => s.type === type))
    .filter(Boolean);
  // Append any sections not in the new order
  for (const s of existing) {
    if (!order.includes(s.type)) reordered.push(s);
  }
  return updateStore(db, storeId, { store_config: { ...config, sections: { ...config.sections, homepage: reordered } } });
}

async function updateSectionConfig(db: SupabaseClient, storeId: string, sectionType: string, sectionConfig: Record<string, unknown>) {
  const config = await getStoreConfig(db, storeId);
  const sections = config.sections?.homepage || [];
  const idx = sections.findIndex((s: any) => s.type === sectionType);
  if (idx >= 0) {
    sections[idx].config = { ...sections[idx].config, ...sectionConfig };
  } else {
    sections.push({ type: sectionType, config: sectionConfig });
  }
  return updateStore(db, storeId, { store_config: { ...config, sections: { ...config.sections, homepage: sections } } });
}

// ============================================================
// Product helpers
// ============================================================

async function createProduct(db: SupabaseClient, storeId: string, payload: any) {
  const { data, error } = await db.from('products').insert({
    store_id: storeId,
    name: payload.name,
    slug: slugify(payload.name),
    description: payload.description || null,
    price: payload.price,
    compare_at_price: payload.compareAtPrice || null,
    status: payload.status || 'draft',
    category_id: payload.categoryId || null,
    tags: payload.tags || [],
    images: [],
    vertical_data: {},
    seo_meta: {},
    hsn_code: payload.hsnCode || null,
    gst_rate: payload.gstRate || null,
  }).select().single();
  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return data;
}

async function updateProduct(db: SupabaseClient, storeId: string, payload: any) {
  const { productId, ...fields } = payload;
  const dbFields: Record<string, any> = {};
  if (fields.name !== undefined) dbFields.name = fields.name;
  if (fields.description !== undefined) dbFields.description = fields.description;
  if (fields.price !== undefined) dbFields.price = fields.price;
  if (fields.compareAtPrice !== undefined) dbFields.compare_at_price = fields.compareAtPrice;
  if (fields.categoryId !== undefined) dbFields.category_id = fields.categoryId;
  if (fields.tags !== undefined) dbFields.tags = fields.tags;
  if (fields.status !== undefined) dbFields.status = fields.status;
  if (fields.hsnCode !== undefined) dbFields.hsn_code = fields.hsnCode;
  if (fields.gstRate !== undefined) dbFields.gst_rate = fields.gstRate;

  const { data, error } = await db.from('products')
    .update(dbFields)
    .eq('id', productId)
    .eq('store_id', storeId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update product: ${error.message}`);
  return data;
}

async function bulkUpdatePrice(db: SupabaseClient, storeId: string, payload: any) {
  let query = db.from('products').select('id, price').eq('store_id', storeId);
  if (payload.filterByCategory) query = query.eq('category_id', payload.filterByCategory);
  if (payload.filterByTags?.length) query = query.contains('tags', payload.filterByTags);

  const { data: products, error: fetchErr } = await query;
  if (fetchErr) throw new Error(`Failed to fetch products: ${fetchErr.message}`);
  if (!products?.length) return { updated: 0 };

  let updated = 0;
  for (const p of products) {
    const newPrice = payload.adjustmentType === 'percentage'
      ? Math.round(p.price * (1 + payload.adjustmentValue / 100) * 100) / 100
      : p.price + payload.adjustmentValue;

    if (newPrice > 0) {
      await db.from('products').update({ price: newPrice }).eq('id', p.id).eq('store_id', storeId);
      updated++;
    }
  }
  return { updated, total: products.length };
}

async function bulkPublish(db: SupabaseClient, storeId: string, productIds?: string[]) {
  let query = db.from('products').update({ status: 'active' }).eq('store_id', storeId).eq('status', 'draft');
  if (productIds?.length) query = query.in('id', productIds);
  const { count, error } = await query;
  if (error) throw new Error(`Failed to publish products: ${error.message}`);
  return { published: count || 0 };
}

// ============================================================
// Variant helpers
// ============================================================

async function createVariant(db: SupabaseClient, storeId: string, payload: any) {
  const { data, error } = await db.from('variants').insert({
    store_id: storeId,
    product_id: payload.productId,
    attributes: payload.attributes,
    price: payload.price || null,
    stock: payload.stock || 0,
    sku: payload.sku || null,
  }).select().single();
  if (error) throw new Error(`Failed to create variant: ${error.message}`);
  return data;
}

async function adjustStock(db: SupabaseClient, storeId: string, variantId: string, adjustment: number) {
  const { data: variant, error: fetchErr } = await db.from('variants')
    .select('stock').eq('id', variantId).eq('store_id', storeId).single();
  if (fetchErr) throw new Error(`Variant not found: ${fetchErr.message}`);

  const newStock = Math.max(0, (variant.stock || 0) + adjustment);
  const { data, error } = await db.from('variants')
    .update({ stock: newStock }).eq('id', variantId).eq('store_id', storeId).select().single();
  if (error) throw new Error(`Failed to update stock: ${error.message}`);
  return data;
}

// ============================================================
// Category helpers
// ============================================================

async function createCategory(db: SupabaseClient, storeId: string, payload: any) {
  const { data, error } = await db.from('categories').insert({
    store_id: storeId,
    name: payload.name,
    slug: slugify(payload.name),
    parent_id: payload.parentId || null,
    image_url: payload.imageUrl || null,
    default_hsn_code: payload.defaultHsnCode || null,
  }).select().single();
  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return data;
}

async function assignProductToCategories(db: SupabaseClient, storeId: string, payload: any) {
  // Clear existing assignments
  await db.from('product_categories')
    .delete()
    .eq('product_id', payload.productId)
    .eq('store_id', storeId);

  // Insert new assignments
  const rows = payload.categoryIds.map((catId: string) => ({
    store_id: storeId,
    product_id: payload.productId,
    category_id: catId,
    is_primary: catId === payload.primaryCategoryId,
  }));

  const { error } = await db.from('product_categories').insert(rows);
  if (error) throw new Error(`Failed to assign categories: ${error.message}`);
  return { assigned: rows.length };
}

// ============================================================
// Collection helpers
// ============================================================

async function createCollection(db: SupabaseClient, storeId: string, payload: any) {
  const { data, error } = await db.from('collections').insert({
    store_id: storeId,
    name: payload.name,
    slug: slugify(payload.name),
    type: payload.type || 'manual',
    description: payload.description || null,
    banner_image_url: payload.bannerImageUrl || null,
    rules: payload.rules || {},
    sort_order: payload.sortOrder || 'manual',
    is_featured: payload.isFeatured || false,
  }).select().single();
  if (error) throw new Error(`Failed to create collection: ${error.message}`);
  return data;
}

async function addProductsToCollection(db: SupabaseClient, storeId: string, collectionId: string, productIds: string[]) {
  const rows = productIds.map((pid, idx) => ({
    store_id: storeId,
    collection_id: collectionId,
    product_id: pid,
    position: idx,
  }));
  const { error } = await db.from('collection_products').upsert(rows, { onConflict: 'collection_id,product_id' });
  if (error) throw new Error(`Failed to add products to collection: ${error.message}`);

  // Update product count
  const { count } = await db.from('collection_products').select('id', { count: 'exact', head: true }).eq('collection_id', collectionId);
  await db.from('collections').update({ product_count: count || 0 }).eq('id', collectionId);

  return { added: productIds.length };
}

async function removeProductsFromCollection(db: SupabaseClient, collectionId: string, productIds: string[]) {
  const { error } = await db.from('collection_products')
    .delete()
    .eq('collection_id', collectionId)
    .in('product_id', productIds);
  if (error) throw new Error(`Failed to remove products from collection: ${error.message}`);
  return { removed: productIds.length };
}

// ============================================================
// Discount helpers
// ============================================================

async function createDiscount(db: SupabaseClient, storeId: string, payload: any) {
  const { data, error } = await db.from('discounts').insert({
    store_id: storeId,
    code: payload.code.toUpperCase(),
    type: payload.type,
    value: payload.value,
    min_order_value: payload.minOrderValue || null,
    max_discount: payload.maxDiscount || null,
    usage_limit: payload.usageLimit || null,
    ends_at: payload.endsAt || null,
    whatsapp_only: payload.whatsappOnly || false,
    is_active: true,
  }).select().single();
  if (error) throw new Error(`Failed to create discount: ${error.message}`);
  return data;
}

// ============================================================
// Media helpers
// ============================================================

async function setHeroBanner(db: SupabaseClient, storeId: string, mediaAssetId: string) {
  const { data: asset } = await db.from('media_assets')
    .select('hero_url, original_url').eq('id', mediaAssetId).eq('store_id', storeId).single();
  if (!asset) throw new Error('Media asset not found');

  const imageUrl = asset.hero_url || asset.original_url;
  const config = await getStoreConfig(db, storeId);
  const design = config.design || {};
  design.hero = { ...design.hero, backgroundImage: imageUrl };
  return updateStore(db, storeId, { store_config: { ...config, design } });
}

async function setProductImages(db: SupabaseClient, storeId: string, productId: string, mediaAssetIds: string[]) {
  const { data: assets } = await db.from('media_assets')
    .select('id, original_url, hero_url, card_url, thumbnail_url, square_url, og_url, alt_text')
    .in('id', mediaAssetIds).eq('store_id', storeId);
  if (!assets?.length) throw new Error('No media assets found');

  const images = assets.map((a: any, idx: number) => ({
    id: a.id,
    originalUrl: a.original_url,
    heroUrl: a.hero_url,
    cardUrl: a.card_url,
    thumbnailUrl: a.thumbnail_url,
    squareUrl: a.square_url,
    ogUrl: a.og_url,
    alt: a.alt_text || '',
    position: idx,
    enhancementStatus: 'done',
  }));

  const { data, error } = await db.from('products')
    .update({ images }).eq('id', productId).eq('store_id', storeId).select().single();
  if (error) throw new Error(`Failed to set product images: ${error.message}`);
  return data;
}

async function setCategoryImage(db: SupabaseClient, storeId: string, categoryId: string, mediaAssetId: string) {
  const { data: asset } = await db.from('media_assets')
    .select('hero_url, original_url').eq('id', mediaAssetId).eq('store_id', storeId).single();
  if (!asset) throw new Error('Media asset not found');
  return updateRow(db, 'categories', storeId, categoryId, { image_url: asset.hero_url || asset.original_url });
}

async function setCollectionBanner(db: SupabaseClient, storeId: string, collectionId: string, mediaAssetId: string) {
  const { data: asset } = await db.from('media_assets')
    .select('hero_url, original_url').eq('id', mediaAssetId).eq('store_id', storeId).single();
  if (!asset) throw new Error('Media asset not found');
  return updateRow(db, 'collections', storeId, collectionId, { banner_image_url: asset.hero_url || asset.original_url });
}

// ============================================================
// Query helpers (read-only)
// ============================================================

async function queryProducts(db: SupabaseClient, storeId: string, payload: any) {
  let query = db.from('products').select('id, name, price, status, tags, images, category_id, created_at')
    .eq('store_id', storeId);
  if (payload.status) query = query.eq('status', payload.status);
  if (payload.categoryId) query = query.eq('category_id', payload.categoryId);
  if (payload.search) query = query.ilike('name', `%${payload.search}%`);
  if (payload.tags?.length) query = query.contains('tags', payload.tags);
  if (payload.minPrice) query = query.gte('price', payload.minPrice);
  if (payload.maxPrice) query = query.lte('price', payload.maxPrice);
  query = query.order('created_at', { ascending: false }).limit(payload.limit || 20);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query products: ${error.message}`);
  return { items: data || [], total: data?.length || 0 };
}

async function queryOrders(db: SupabaseClient, storeId: string, payload: any) {
  let query = db.from('orders').select('id, order_number, status, total, buyer_name, buyer_phone, created_at, line_items')
    .eq('store_id', storeId);
  if (payload.status) query = query.eq('status', payload.status);
  if (payload.period) {
    const from = periodToDate(payload.period);
    if (from) query = query.gte('created_at', from.toISOString());
  }
  query = query.order('created_at', { ascending: false }).limit(payload.limit || 20);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query orders: ${error.message}`);
  return { items: data || [], total: data?.length || 0 };
}

async function queryRevenue(db: SupabaseClient, storeId: string, period: string) {
  const from = periodToDate(period);
  let query = db.from('orders').select('total, status').eq('store_id', storeId);
  if (from) query = query.gte('created_at', from.toISOString());

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query revenue: ${error.message}`);

  const paidStatuses = new Set(['paid', 'processing', 'shipped', 'out_for_delivery', 'delivered']);
  const paidOrders = (data || []).filter((o: any) => paidStatuses.has(o.status));
  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  return {
    totalRevenue,
    orderCount: paidOrders.length,
    avgOrderValue: paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0,
    period,
  };
}

async function queryCategories(db: SupabaseClient, storeId: string) {
  const { data, error } = await db.from('categories')
    .select('id, name, slug, product_count, position')
    .eq('store_id', storeId)
    .order('position');
  if (error) throw new Error(`Failed to query categories: ${error.message}`);
  return data || [];
}

async function queryCollections(db: SupabaseClient, storeId: string, payload: any) {
  let query = db.from('collections')
    .select('id, name, slug, type, product_count, is_featured, status')
    .eq('store_id', storeId);
  if (payload.featured !== undefined) query = query.eq('is_featured', payload.featured);
  query = query.order('position');

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query collections: ${error.message}`);
  return data || [];
}

async function queryStoreInfo(db: SupabaseClient, storeId: string) {
  const { data, error } = await db.from('stores')
    .select('id, name, slug, vertical, status, description, gstin, business_name')
    .eq('id', storeId).single();
  if (error) throw new Error(`Failed to query store: ${error.message}`);
  return data;
}

async function queryStoreLink(db: SupabaseClient, storeId: string) {
  const { data, error } = await db.from('stores')
    .select('name, slug').eq('id', storeId).single();
  if (error) throw new Error(`Failed to query store: ${error.message}`);
  return { slug: data.slug, name: data.name };
}

async function queryDiscounts(db: SupabaseClient, storeId: string, payload: any) {
  let query = db.from('discounts')
    .select('id, code, type, value, min_order_value, max_discount, usage_limit, usage_count, ends_at, is_active')
    .eq('store_id', storeId);
  if (payload.activeOnly !== false) query = query.eq('is_active', true);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query discounts: ${error.message}`);
  return data || [];
}

// ============================================================
// Generic DB helpers
// ============================================================

async function updateRow(db: SupabaseClient, table: string, storeId: string, id: string, fields: Record<string, any>) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([k, v]) => v !== undefined && k !== 'productId' && k !== 'variantId' && k !== 'categoryId' && k !== 'collectionId' && k !== 'orderId' && k !== 'discountId'));
  const { data, error } = await db.from(table)
    .update(clean)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update ${table}: ${error.message}`);
  return data;
}

async function deleteRow(db: SupabaseClient, table: string, storeId: string, id: string) {
  const { error } = await db.from(table).delete().eq('id', id).eq('store_id', storeId);
  if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
  return { deleted: true };
}

// ============================================================
// Utility
// ============================================================

function periodToDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case 'month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    default: return null;
  }
}

function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
