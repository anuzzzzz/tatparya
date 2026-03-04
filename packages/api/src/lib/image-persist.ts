import { v4 as uuidv4 } from 'uuid';
import { uploadBuffer, isStorageConfigured, getPublicUrl, getDevUploadUrl } from './storage.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ============================================================
// Image Persistence Layer
//
// Takes an array of image URLs (which may be base64 data URIs
// or regular http(s) URLs) and ensures they are persisted to
// storage (R2 in prod, local disk in dev).
//
// Returns an array of URLs that the storefront can load.
// ============================================================

const LOCAL_UPLOAD_DIR = join(process.cwd(), '../storefront/public/uploads');

/**
 * Persist images to storage. Handles:
 * - base64 data URIs → decode → save to R2/local → return URL
 * - http(s) URLs → pass through unchanged
 * - /uploads/ paths → already local, pass through
 */
export async function persistImages(
  storeId: string,
  imageUrls: string[],
): Promise<string[]> {
  const results: string[] = [];

  for (const url of imageUrls) {
    try {
      if (isBase64DataUri(url)) {
        const persisted = await persistBase64(storeId, url);
        results.push(persisted);
      } else {
        // Already an http URL or local path — keep as-is
        results.push(url);
      }
    } catch (err) {
      console.error(`[image-persist] Failed to persist image for store ${storeId}:`, err);
      // Fall back to original URL so we don't lose the image entirely
      results.push(url);
    }
  }

  return results;
}

/**
 * Check if a string is a base64 data URI
 */
function isBase64DataUri(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Decode a base64 data URI and save to storage.
 * Returns the public URL for the saved image.
 */
async function persistBase64(storeId: string, dataUri: string): Promise<string> {
  // Parse: data:image/jpeg;base64,/9j/4AAQ...
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Invalid base64 data URI format');
  }

  const contentType = match[1]!;
  const base64Data = match[2]!;
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate a unique filename
  const ext = contentType.split('/')[1]?.replace('+xml', '') || 'jpg';
  const fileId = uuidv4();
  const key = `stores/${storeId}/originals/${fileId}.${ext}`;

  if (isStorageConfigured()) {
    // Production: upload to R2
    const publicUrl = await uploadBuffer({ key, body: buffer, contentType });
    console.log(`[image-persist] Saved to R2: ${key} (${(buffer.length / 1024).toFixed(0)}KB)`);
    return publicUrl;
  } else {
    // Dev: write to local disk, return URL that Next.js can serve
    const filePath = join(LOCAL_UPLOAD_DIR, key);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, buffer);
    const localUrl = `/uploads/${key}`;
    console.log(`[image-persist] Saved locally: ${filePath} (${(buffer.length / 1024).toFixed(0)}KB) → ${localUrl}`);
    return localUrl;
  }
}
