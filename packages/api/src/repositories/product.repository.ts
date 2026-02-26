import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Product Repository
// Every function takes store_id as first parameter.
// This is the PRIMARY tenant isolation mechanism.
// ============================================================

export class ProductRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    name: string;
    slug: string;
    description?: string | null;
    price: number;
    compareAtPrice?: number | null;
    status?: string;
    categoryId?: string | null;
    tags?: string[];
    images?: unknown[];
    verticalData?: Record<string, unknown>;
    seoMeta?: Record<string, unknown>;
    hsnCode?: string | null;
    gstRate?: number | null;
  }) {
    const { data: product, error } = await this.db
      .from('products')
      .insert({
        store_id: storeId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        compare_at_price: data.compareAtPrice || null,
        status: data.status || 'draft',
        category_id: data.categoryId || null,
        tags: data.tags || [],
        images: data.images || [],
        vertical_data: data.verticalData || {},
        seo_meta: data.seoMeta || {},
        hsn_code: data.hsnCode || null,
        gst_rate: data.gstRate || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create product: ${error.message}`);
    return mapProductRow(product);
  }

  async findById(storeId: string, productId: string) {
    const { data, error } = await this.db
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('store_id', storeId)
      .eq('id', productId)
      .single();

    if (error) return null;
    return mapProductRow(data);
  }

  async findBySlug(storeId: string, slug: string) {
    const { data, error } = await this.db
      .from('products')
      .select('*, categories(id, name, slug)')
      .eq('store_id', storeId)
      .eq('slug', slug)
      .single();

    if (error) return null;
    return mapProductRow(data);
  }

  async list(storeId: string, filters: {
    categoryId?: string;
    status?: string;
    search?: string;
    tags?: string[];
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.db
      .from('products')
      .select('*, categories(id, name, slug)', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters.search) {
      query = query.textSearch('search_vector', filters.search, { type: 'websearch' });
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list products: ${error.message}`);

    return {
      items: (data || []).map(mapProductRow),
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async update(storeId: string, productId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};

    // Map camelCase to snake_case
    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', price: 'price',
      compareAtPrice: 'compare_at_price', status: 'status',
      categoryId: 'category_id', tags: 'tags', images: 'images',
      verticalData: 'vertical_data', seoMeta: 'seo_meta',
      hsnCode: 'hsn_code', gstRate: 'gst_rate',
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updateData[dbKey!] = data[key];
      }
    }

    const { data: product, error } = await this.db
      .from('products')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product: ${error.message}`);
    return mapProductRow(product);
  }

  async delete(storeId: string, productId: string) {
    const { error } = await this.db
      .from('products')
      .delete()
      .eq('store_id', storeId)
      .eq('id', productId);

    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  }

  async countByStore(storeId: string, status?: string) {
    let query = this.db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (status) query = query.eq('status', status);

    const { count, error } = await query;
    if (error) throw new Error(`Failed to count products: ${error.message}`);
    return count || 0;
  }
}

// ============================================================
// Variant Repository
// ============================================================

export class VariantRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    productId: string;
    sku?: string;
    attributes: Record<string, string>;
    price?: number | null;
    stock?: number;
    weightGrams?: number;
  }) {
    const { data: variant, error } = await this.db
      .from('variants')
      .insert({
        store_id: storeId,
        product_id: data.productId,
        sku: data.sku || null,
        attributes: data.attributes,
        price: data.price ?? null,
        stock: data.stock || 0,
        weight_grams: data.weightGrams || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create variant: ${error.message}`);
    return mapVariantRow(variant);
  }

  async listByProduct(storeId: string, productId: string) {
    const { data, error } = await this.db
      .from('variants')
      .select()
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .order('created_at');

    if (error) throw new Error(`Failed to list variants: ${error.message}`);
    return (data || []).map(mapVariantRow);
  }

  async findById(storeId: string, variantId: string) {
    const { data, error } = await this.db
      .from('variants')
      .select()
      .eq('store_id', storeId)
      .eq('id', variantId)
      .single();

    if (error) return null;
    return mapVariantRow(data);
  }

  async update(storeId: string, variantId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data['sku'] !== undefined) updateData['sku'] = data['sku'];
    if (data['attributes'] !== undefined) updateData['attributes'] = data['attributes'];
    if (data['price'] !== undefined) updateData['price'] = data['price'];
    if (data['stock'] !== undefined) updateData['stock'] = data['stock'];
    if (data['weightGrams'] !== undefined) updateData['weight_grams'] = data['weightGrams'];

    const { data: variant, error } = await this.db
      .from('variants')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update variant: ${error.message}`);
    return mapVariantRow(variant);
  }

  async adjustStock(storeId: string, variantId: string, adjustment: number) {
    // Use RPC for atomic increment/decrement
    const variant = await this.findById(storeId, variantId);
    if (!variant) throw new Error('Variant not found');

    const newStock = variant.stock + adjustment;
    if (newStock < 0) throw new Error('Insufficient stock');

    return this.update(storeId, variantId, { stock: newStock });
  }

  async reserveStock(storeId: string, variantId: string, quantity: number) {
    const variant = await this.findById(storeId, variantId);
    if (!variant) throw new Error('Variant not found');

    const available = variant.stock - variant.reserved;
    if (available < quantity) throw new Error(`Insufficient stock. Available: ${available}`);

    const { data, error } = await this.db
      .from('variants')
      .update({ reserved: variant.reserved + quantity })
      .eq('store_id', storeId)
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reserve stock: ${error.message}`);
    return mapVariantRow(data);
  }

  async releaseStock(storeId: string, variantId: string, quantity: number) {
    const variant = await this.findById(storeId, variantId);
    if (!variant) throw new Error('Variant not found');

    const newReserved = Math.max(0, variant.reserved - quantity);

    const { data, error } = await this.db
      .from('variants')
      .update({ reserved: newReserved })
      .eq('store_id', storeId)
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to release stock: ${error.message}`);
    return mapVariantRow(data);
  }

  async commitReservation(storeId: string, variantId: string, quantity: number) {
    const variant = await this.findById(storeId, variantId);
    if (!variant) throw new Error('Variant not found');

    const { data, error } = await this.db
      .from('variants')
      .update({
        stock: variant.stock - quantity,
        reserved: Math.max(0, variant.reserved - quantity),
      })
      .eq('store_id', storeId)
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw new Error(`Failed to commit reservation: ${error.message}`);
    return mapVariantRow(data);
  }

  async delete(storeId: string, variantId: string) {
    const { error } = await this.db
      .from('variants')
      .delete()
      .eq('store_id', storeId)
      .eq('id', variantId);

    if (error) throw new Error(`Failed to delete variant: ${error.message}`);
  }
}

// ============================================================
// Row Mappers
// ============================================================

function mapProductRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    description: row['description'] as string | null,
    price: Number(row['price']),
    compareAtPrice: row['compare_at_price'] ? Number(row['compare_at_price']) : null,
    currency: (row['currency'] as string) || 'INR',
    status: row['status'] as string,
    categoryId: row['category_id'] as string | null,
    category: row['categories'] as Record<string, unknown> | null,
    tags: row['tags'] as string[],
    images: row['images'] as unknown[],
    verticalData: row['vertical_data'] as Record<string, unknown>,
    seoMeta: row['seo_meta'] as Record<string, unknown>,
    hsnCode: row['hsn_code'] as string | null,
    gstRate: row['gst_rate'] ? Number(row['gst_rate']) : null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function mapVariantRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    productId: row['product_id'] as string,
    storeId: row['store_id'] as string,
    sku: row['sku'] as string | null,
    attributes: row['attributes'] as Record<string, string>,
    price: row['price'] ? Number(row['price']) : null,
    stock: Number(row['stock']),
    reserved: Number(row['reserved']),
    weightGrams: row['weight_grams'] ? Number(row['weight_grams']) : null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
