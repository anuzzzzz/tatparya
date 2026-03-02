import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreSnapshot } from '@tatparya/shared';

// ============================================================
// Store Snapshot Service
//
// Builds a StoreSnapshot for injection into the Claude Haiku
// system prompt. Fetches all relevant store state in parallel
// so the LLM has full context to classify and act on seller
// messages.
//
// Called once per chat.process request. All queries use
// serviceDb (bypasses RLS) since the chat endpoint has
// already verified store ownership.
// ============================================================

export async function buildStoreSnapshot(
  db: SupabaseClient,
  storeId: string,
): Promise<StoreSnapshot> {
  // Parallel fetch — 7 queries in one round trip
  const [
    storeResult,
    productCountsResult,
    recentProductsResult,
    categoriesResult,
    collectionsResult,
    orderCountsResult,
    recentOrdersResult,
  ] = await Promise.all([
    // 1. Store row
    db.from('stores')
      .select('name, slug, vertical, status, store_config, description')
      .eq('id', storeId)
      .single(),

    // 2. Product counts by status
    db.rpc('get_product_counts', { p_store_id: storeId }).maybeSingle()
      .then((r) => r)
      // Fallback: if RPC doesn't exist, do it manually
      .catch(() => null),

    // 3. Recent 10 products
    db.from('products')
      .select('id, name, price, status, tags')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(10),

    // 4. Categories
    db.from('categories')
      .select('id, name, product_count')
      .eq('store_id', storeId)
      .order('position', { ascending: true }),

    // 5. Collections
    db.from('collections')
      .select('id, name, type, product_count')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('position', { ascending: true }),

    // 6. Order counts
    db.from('orders')
      .select('id, status', { count: 'exact', head: false })
      .eq('store_id', storeId),

    // 7. Recent 5 orders
    db.from('orders')
      .select('id, order_number, status, total, buyer_name')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (storeResult.error || !storeResult.data) {
    throw new Error(`Store not found: ${storeResult.error?.message || 'unknown'}`);
  }

  const store = storeResult.data;
  const storeConfig = (store.store_config || {}) as Record<string, unknown>;

  // Compute product counts from the product list if RPC unavailable
  const products = recentProductsResult.data || [];
  let totalProducts = products.length;
  let draftProducts = 0;
  let activeProducts = 0;

  if (productCountsResult?.data) {
    // RPC result
    totalProducts = productCountsResult.data.total || products.length;
    draftProducts = productCountsResult.data.draft || 0;
    activeProducts = productCountsResult.data.active || 0;
  } else {
    // Fallback: count from the recent products (approximate for stores with > 10 products)
    // Do a separate count query
    const { count } = await db.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);
    totalProducts = count || products.length;

    const { count: draftCount } = await db.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'draft');
    draftProducts = draftCount || 0;

    const { count: activeCount } = await db.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'active');
    activeProducts = activeCount || 0;
  }

  // Order counts
  const allOrders = orderCountsResult.data || [];
  const pendingStatuses = new Set(['created', 'paid', 'processing', 'cod_confirmed', 'cod_otp_verified']);
  const pendingOrderCount = allOrders.filter((o: any) => pendingStatuses.has(o.status)).length;

  const categories = (categoriesResult.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    productCount: c.product_count || 0,
  }));

  const collections = (collectionsResult.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    productCount: c.product_count || 0,
  }));

  const recentProducts = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    status: p.status,
    tags: p.tags || [],
  }));

  const recentOrders = (recentOrdersResult.data || []).map((o: any) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    total: o.total,
    buyerName: o.buyer_name,
  }));

  return {
    name: store.name,
    slug: store.slug,
    vertical: store.vertical,
    status: store.status,
    storeConfig,
    productCount: totalProducts,
    draftProductCount: draftProducts,
    activeProductCount: activeProducts,
    categoryCount: categories.length,
    collectionCount: collections.length,
    orderCount: allOrders.length,
    pendingOrderCount,
    heroTagline: (storeConfig as any).heroTagline || undefined,
    heroSubtext: (storeConfig as any).heroSubtext || undefined,
    storeBio: (storeConfig as any).storeBio || undefined,
    recentProducts,
    recentOrders,
    categories,
    collections,
  };
}
