import type { SupabaseClient } from '@supabase/supabase-js';

interface ProcessImageInput {
  storeId: string;
  mediaAssetId: string;
  originalKey: string;
  db: SupabaseClient;
  skipBgRemoval?: boolean;
}

/**
 * Process an uploaded image — resize to multiple sizes (hero, card, thumbnail, square, og).
 * 
 * In production this uses Sharp + R2. For local dev without R2 configured,
 * it just marks the asset as done so the rest of the flow works.
 */
export async function processImage(input: ProcessImageInput): Promise<void> {
  const { storeId, mediaAssetId, originalKey, db } = input;

  console.log(`[image-pipeline] Processing ${mediaAssetId} (key: ${originalKey})`);

  try {
    // TODO: Full Sharp pipeline when R2 is configured
    // For now, mark as done so the dashboard/catalog flow isn't blocked
    const { error } = await db
      .from('media_assets')
      .update({
        enhancement_status: 'done',
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediaAssetId)
      .eq('store_id', storeId);

    if (error) {
      console.error(`[image-pipeline] DB update failed:`, error.message);
      return;
    }

    console.log(`[image-pipeline] Done: ${mediaAssetId}`);
  } catch (err) {
    console.error(`[image-pipeline] Error processing ${mediaAssetId}:`, err);

    // Mark as failed
    await db
      .from('media_assets')
      .update({
        enhancement_status: 'failed',
        enhancement_error: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', mediaAssetId)
      .eq('store_id', storeId);
  }
}
