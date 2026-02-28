import type { SupabaseClient } from '@supabase/supabase-js';

interface ProcessImageOptions {
  storeId: string;
  mediaAssetId: string;
  originalKey: string;
  db: SupabaseClient;
  skipBgRemoval?: boolean;
}

/**
 * Process an uploaded image: generate size variants (hero, card, thumbnail, square, og).
 * In Phase 3+ this will call sharp/Cloudflare Workers for real resizing.
 * For now it's a stub that marks the asset as ready.
 */
export async function processImage(opts: ProcessImageOptions): Promise<void> {
  const { storeId, mediaAssetId, db } = opts;

  try {
    await db
      .from('media_assets')
      .update({ enhancement_status: 'processing' })
      .eq('id', mediaAssetId)
      .eq('store_id', storeId);

    // TODO: Implement actual image resizing with sharp / Cloudflare Workers
    // - Generate hero (1200x1600), card (600x800), thumbnail (200x200), square (800x800), og (1200x630)
    // - Upload variants to R2
    // - Update variant URLs in DB

    await db
      .from('media_assets')
      .update({ enhancement_status: 'done' })
      .eq('id', mediaAssetId)
      .eq('store_id', storeId);
  } catch (err) {
    await db
      .from('media_assets')
      .update({
        enhancement_status: 'failed',
        enhancement_error: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', mediaAssetId)
      .eq('store_id', storeId);
    throw err;
  }
}
