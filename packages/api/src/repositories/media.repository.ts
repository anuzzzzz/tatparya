import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Media Repository
// CRUD for media_assets table. Every function takes store_id.
//
// DB columns (from 006_media_table.sql):
//   id, store_id, product_id, original_key, original_url,
//   filename, content_type, file_size_bytes,
//   hero_key, hero_url, card_key, card_url,
//   thumbnail_key, thumbnail_url, square_key, square_url,
//   og_key, og_url, ai_analysis (JSONB),
//   enhancement_status, enhancement_error,
//   alt_text, position, created_at, updated_at
// ============================================================

export interface MediaAsset {
  id: string;
  storeId: string;
  productId: string | null;
  originalKey: string;
  originalUrl: string;
  filename: string;
  contentType: string;
  fileSizeBytes: number;
  // Individual variant columns (not a single JSONB 'variants' field)
  heroKey: string | null;
  heroUrl: string | null;
  cardKey: string | null;
  cardUrl: string | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  squareKey: string | null;
  squareUrl: string | null;
  ogKey: string | null;
  ogUrl: string | null;
  aiAnalysis: Record<string, unknown>;
  enhancementStatus: string;
  enhancementError: string | null;
  altText: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export class MediaRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    originalKey: string;
    originalUrl: string;
    filename: string;
    contentType: string;
    fileSizeBytes?: number;
    productId?: string;
    position?: number;
  }): Promise<MediaAsset> {
    const { data: media, error } = await this.db
      .from('media_assets')
      .insert({
        store_id: storeId,
        original_key: data.originalKey,
        original_url: data.originalUrl,
        filename: data.filename,
        content_type: data.contentType,
        file_size_bytes: data.fileSizeBytes || 0,
        product_id: data.productId || null,
        position: data.position || 0,
        enhancement_status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create media asset: ${error.message}`);
    return mapMediaRow(media);
  }

  async findById(storeId: string, id: string): Promise<MediaAsset | null> {
    const { data, error } = await this.db
      .from('media_assets')
      .select()
      .eq('store_id', storeId)
      .eq('id', id)
      .single();

    if (error) return null;
    return mapMediaRow(data);
  }

  async listByProduct(storeId: string, productId: string): Promise<MediaAsset[]> {
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
    unlinked?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: MediaAsset[]; total: number }> {
    let query = this.db
      .from('media_assets')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    if (filters.status) {
      query = query.eq('enhancement_status', filters.status);
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

  // ============================================================
  // Update enhancement status + variant URLs + error
  // This is the main method called by media.service.ts during
  // the Sharp image processing pipeline.
  // ============================================================

  async updateEnhancementStatus(storeId: string, id: string, updates: {
    enhancementStatus?: string;
    enhancementError?: string | null;
    heroKey?: string;
    heroUrl?: string;
    cardKey?: string;
    cardUrl?: string;
    thumbnailKey?: string;
    thumbnailUrl?: string;
    squareKey?: string;
    squareUrl?: string;
    ogKey?: string;
    ogUrl?: string;
  }): Promise<MediaAsset> {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.enhancementStatus) dbUpdates['enhancement_status'] = updates.enhancementStatus;
    if (updates.enhancementError !== undefined) dbUpdates['enhancement_error'] = updates.enhancementError;
    if (updates.heroKey) dbUpdates['hero_key'] = updates.heroKey;
    if (updates.heroUrl) dbUpdates['hero_url'] = updates.heroUrl;
    if (updates.cardKey) dbUpdates['card_key'] = updates.cardKey;
    if (updates.cardUrl) dbUpdates['card_url'] = updates.cardUrl;
    if (updates.thumbnailKey) dbUpdates['thumbnail_key'] = updates.thumbnailKey;
    if (updates.thumbnailUrl) dbUpdates['thumbnail_url'] = updates.thumbnailUrl;
    if (updates.squareKey) dbUpdates['square_key'] = updates.squareKey;
    if (updates.squareUrl) dbUpdates['square_url'] = updates.squareUrl;
    if (updates.ogKey) dbUpdates['og_key'] = updates.ogKey;
    if (updates.ogUrl) dbUpdates['og_url'] = updates.ogUrl;

    const { data, error } = await this.db
      .from('media_assets')
      .update(dbUpdates)
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update enhancement status: ${error.message}`);
    return mapMediaRow(data);
  }

  async updateAiAnalysis(storeId: string, id: string, aiAnalysis: Record<string, unknown>): Promise<MediaAsset> {
    const { data, error } = await this.db
      .from('media_assets')
      .update({ ai_analysis: aiAnalysis })
      .eq('store_id', storeId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update AI analysis: ${error.message}`);
    return mapMediaRow(data);
  }

  async linkToProduct(storeId: string, mediaId: string, productId: string, position?: number): Promise<MediaAsset> {
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

  async delete(storeId: string, id: string): Promise<void> {
    const { error } = await this.db
      .from('media_assets')
      .delete()
      .eq('store_id', storeId)
      .eq('id', id);

    if (error) throw new Error(`Failed to delete media: ${error.message}`);
  }
}

// ============================================================
// Row Mapper — maps DB snake_case to app camelCase
// Aligned with 006_media_table.sql column names
// ============================================================

function mapMediaRow(row: Record<string, unknown>): MediaAsset {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    productId: (row['product_id'] as string) || null,
    originalKey: row['original_key'] as string,
    originalUrl: row['original_url'] as string,
    filename: row['filename'] as string,
    contentType: row['content_type'] as string,
    fileSizeBytes: (row['file_size_bytes'] as number) || 0,
    heroKey: (row['hero_key'] as string) || null,
    heroUrl: (row['hero_url'] as string) || null,
    cardKey: (row['card_key'] as string) || null,
    cardUrl: (row['card_url'] as string) || null,
    thumbnailKey: (row['thumbnail_key'] as string) || null,
    thumbnailUrl: (row['thumbnail_url'] as string) || null,
    squareKey: (row['square_key'] as string) || null,
    squareUrl: (row['square_url'] as string) || null,
    ogKey: (row['og_key'] as string) || null,
    ogUrl: (row['og_url'] as string) || null,
    aiAnalysis: (row['ai_analysis'] as Record<string, unknown>) || {},
    enhancementStatus: row['enhancement_status'] as string,
    enhancementError: (row['enhancement_error'] as string) || null,
    altText: (row['alt_text'] as string) || null,
    position: Number(row['position']) || 0,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
