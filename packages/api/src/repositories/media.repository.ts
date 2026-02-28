import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Media Repository
// CRUD for media_assets table. Every function takes store_id.
// ============================================================

export class MediaRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    originalKey: string;
    originalUrl: string;
    fileName: string;
    contentType: string;
    fileSizeBytes?: number;
    productId?: string;
    position?: number;
  }) {
    const { data: media, error } = await this.db
      .from('media_assets')
      .insert({
        store_id: storeId,
        original_key: data.originalKey,
        original_url: data.originalUrl,
        file_name: data.fileName,
        content_type: data.contentType,
        file_size_bytes: data.fileSizeBytes || null,
        product_id: data.productId || null,
        position: data.position || 0,
        status: 'uploaded',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create media asset: ${error.message}`);
    return mapMediaRow(media);
  }

  async findById(storeId: string, id: string) {
    const { data, error } = await this.db
      .from('media_assets')
      .select()
      .eq('store_id', storeId)
      .eq('id', id)
      .single();

    if (error) return null;
    return mapMediaRow(data);
  }

  async listByProduct(storeId: string, productId: string) {
    const { data, error } = await this.db
      .from('media_assets')
      .select()
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (error) throw new Error(`Failed to list media: ${error.message}`);
    return (data || []).map(mapMediaRow);
  }

  async listByStore(storeId: string, filters: {
    status?: string;
    unlinked?: boolean; // media not attached to any product
    limit?: number;
    offset?: number;
  } = {}) {
    let query = this.db
      .from('media_assets')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.unlinked) {
      query = query.is('product_id', null);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list media: ${error.message}`);

    return {
      items: (data || []).map(mapMediaRow),
      total: count || 0,
    };
  }

  async updateStatus(storeId: string, id: string, status: string, errorMessage?: string) {
    const updateData: Record<string, unknown> = { status };
    if (errorMessage !== undefined) updateData['error_message'] = errorMessage;

    const { data, error } = await this.db
      .from('media_assets')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update media status: ${error.message}`);
    return mapMediaRow(data);
  }

  async updateVariants(storeId: string, id: string, variants: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('media_assets')
      .update({ variants, status: 'ready' })
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update media variants: ${error.message}`);
    return mapMediaRow(data);
  }

  async updateAiMetadata(storeId: string, id: string, aiMetadata: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('media_assets')
      .update({ ai_metadata: aiMetadata })
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update AI metadata: ${error.message}`);
    return mapMediaRow(data);
  }

  async linkToProduct(storeId: string, mediaId: string, productId: string, position?: number) {
    const updateData: Record<string, unknown> = { product_id: productId };
    if (position !== undefined) updateData['position'] = position;

    const { data, error } = await this.db
      .from('media_assets')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) throw new Error(`Failed to link media to product: ${error.message}`);
    return mapMediaRow(data);
  }

  async delete(storeId: string, id: string) {
    const { error } = await this.db
      .from('media_assets')
      .delete()
      .eq('store_id', storeId)
      .eq('id', id);

    if (error) throw new Error(`Failed to delete media: ${error.message}`);
  }
}

// ============================================================
// Row Mapper
// ============================================================

function mapMediaRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    productId: row['product_id'] as string | null,
    originalKey: row['original_key'] as string,
    originalUrl: row['original_url'] as string,
    fileName: row['file_name'] as string,
    contentType: row['content_type'] as string,
    fileSizeBytes: row['file_size_bytes'] as number | null,
    variants: row['variants'] as Record<string, unknown>,
    aiMetadata: row['ai_metadata'] as Record<string, unknown>,
    status: row['status'] as string,
    errorMessage: row['error_message'] as string | null,
    position: Number(row['position']),
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
