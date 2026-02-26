import type { SupabaseClient } from '@supabase/supabase-js';

export class CategoryRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    name: string;
    slug: string;
    parentId?: string | null;
    vertical?: string;
    imageUrl?: string;
    filterConfig?: Record<string, boolean>;
    defaultHsnCode?: string;
    seoMeta?: Record<string, unknown>;
    position?: number;
  }) {
    const { data: cat, error } = await this.db
      .from('categories')
      .insert({
        store_id: storeId,
        name: data.name,
        slug: data.slug,
        parent_id: data.parentId || null,
        vertical: data.vertical || null,
        image_url: data.imageUrl || null,
        filter_config: data.filterConfig || {},
        default_hsn_code: data.defaultHsnCode || null,
        seo_meta: data.seoMeta || {},
        position: data.position || 0,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create category: ${error.message}`);
    return mapCategoryRow(cat);
  }

  async findById(storeId: string, categoryId: string) {
    const { data, error } = await this.db
      .from('categories')
      .select()
      .eq('store_id', storeId)
      .eq('id', categoryId)
      .single();

    if (error) return null;
    return mapCategoryRow(data);
  }

  async findBySlug(storeId: string, slug: string) {
    const { data, error } = await this.db
      .from('categories')
      .select()
      .eq('store_id', storeId)
      .eq('slug', slug)
      .single();

    if (error) return null;
    return mapCategoryRow(data);
  }

  async listByParent(storeId: string, parentId: string | null) {
    let query = this.db
      .from('categories')
      .select()
      .eq('store_id', storeId)
      .order('position');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list categories: ${error.message}`);
    return (data || []).map(mapCategoryRow);
  }

  async getTree(storeId: string) {
    const { data, error } = await this.db
      .from('categories')
      .select()
      .eq('store_id', storeId)
      .order('position');

    if (error) throw new Error(`Failed to get category tree: ${error.message}`);

    const rows = (data || []).map(mapCategoryRow);
    return buildTree(rows);
  }

  async updateProductCount(storeId: string, categoryId: string) {
    const { count } = await this.db
      .from('product_categories')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('category_id', categoryId);

    await this.db
      .from('categories')
      .update({ product_count: count || 0 })
      .eq('store_id', storeId)
      .eq('id', categoryId);
  }

  async update(storeId: string, categoryId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data['name'] !== undefined) updateData['name'] = data['name'];
    if (data['parentId'] !== undefined) updateData['parent_id'] = data['parentId'];
    if (data['imageUrl'] !== undefined) updateData['image_url'] = data['imageUrl'];
    if (data['filterConfig'] !== undefined) updateData['filter_config'] = data['filterConfig'];
    if (data['defaultHsnCode'] !== undefined) updateData['default_hsn_code'] = data['defaultHsnCode'];
    if (data['seoMeta'] !== undefined) updateData['seo_meta'] = data['seoMeta'];
    if (data['position'] !== undefined) updateData['position'] = data['position'];

    const { data: cat, error } = await this.db
      .from('categories')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update category: ${error.message}`);
    return mapCategoryRow(cat);
  }

  async delete(storeId: string, categoryId: string) {
    const { error } = await this.db
      .from('categories')
      .delete()
      .eq('store_id', storeId)
      .eq('id', categoryId);

    if (error) throw new Error(`Failed to delete category: ${error.message}`);
  }

  // Product-category assignment (many-to-many)
  async assignProduct(storeId: string, productId: string, categoryId: string, isPrimary: boolean) {
    // If setting as primary, unset other primaries for this product
    if (isPrimary) {
      await this.db
        .from('product_categories')
        .update({ is_primary: false })
        .eq('store_id', storeId)
        .eq('product_id', productId)
        .eq('is_primary', true);
    }

    const { error } = await this.db
      .from('product_categories')
      .upsert({
        store_id: storeId,
        product_id: productId,
        category_id: categoryId,
        is_primary: isPrimary,
      }, { onConflict: 'product_id,category_id' });

    if (error) throw new Error(`Failed to assign category: ${error.message}`);
    await this.updateProductCount(storeId, categoryId);
  }

  async unassignProduct(storeId: string, productId: string, categoryId: string) {
    const { error } = await this.db
      .from('product_categories')
      .delete()
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .eq('category_id', categoryId);

    if (error) throw new Error(`Failed to unassign category: ${error.message}`);
    await this.updateProductCount(storeId, categoryId);
  }

  async getProductCategories(storeId: string, productId: string) {
    const { data, error } = await this.db
      .from('product_categories')
      .select('category_id, is_primary, categories(id, name, slug, parent_id)')
      .eq('store_id', storeId)
      .eq('product_id', productId);

    if (error) throw new Error(`Failed to get product categories: ${error.message}`);
    return data || [];
  }
}

// Build nested tree from flat list
interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
  [key: string]: unknown;
}

function buildTree(rows: ReturnType<typeof mapCategoryRow>[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const row of rows) {
    map.set(row.id, { ...row, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function mapCategoryRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    parentId: row['parent_id'] as string | null,
    vertical: row['vertical'] as string | null,
    imageUrl: row['image_url'] as string | null,
    filterConfig: row['filter_config'] as Record<string, boolean>,
    defaultHsnCode: row['default_hsn_code'] as string | null,
    seoMeta: row['seo_meta'] as Record<string, unknown>,
    productCount: Number(row['product_count'] || 0),
    position: Number(row['position'] || 0),
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
