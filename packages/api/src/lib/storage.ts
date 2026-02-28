import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// R2/S3 Storage Client
// Cloudflare R2 is S3-compatible. Works with any S3 provider.
// ============================================================

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2/S3 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

// ============================================================
// Key Generation
// Pattern: stores/{storeId}/{type}/{uuid}.{ext}
// ============================================================

export function generateMediaKey(
  storeId: string,
  type: 'originals' | 'processed' | 'hero' | 'card' | 'thumbnail' | 'og' | 'nobg',
  fileName: string,
): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const id = uuidv4();
  return `stores/${storeId}/${type}/${id}.${ext}`;
}

export function getPublicUrl(key: string): string {
  // Use custom domain or R2 public URL
  const baseUrl = process.env['R2_PUBLIC_URL'] || `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.dev`;
  return `${baseUrl}/${key}`;
}

// ============================================================
// Presigned Upload URL
// Client uploads directly to R2 — no file goes through API server.
// ============================================================

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600, // 1 hour
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = getPublicUrl(key);

  return { uploadUrl, publicUrl };
}

// ============================================================
// Upload Buffer (for processed images from pipeline)
// ============================================================

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getS3Client();

  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return getPublicUrl(key);
}

// ============================================================
// Download (for pipeline processing)
// ============================================================

export async function downloadObject(key: string): Promise<Buffer> {
  const client = getS3Client();

  const response = await client.send(new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));

  if (!response.Body) throw new Error(`Empty response for key: ${key}`);

  // Convert readable stream to buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ============================================================
// Delete
// ============================================================

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();

  await client.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
}

// ============================================================
// Dev Mode: Local Fallback
// When R2 is not configured, use data URLs / temp paths.
// ============================================================

export function isStorageConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

/**
 * Get a mock upload URL for development without R2.
 * Returns a local endpoint that accepts the file.
 */
export function getDevUploadUrl(key: string): { uploadUrl: string; publicUrl: string } {
  const apiBase = env.API_BASE_URL || 'http://localhost:3001';
  return {
    uploadUrl: `${apiBase}/dev/upload/${encodeURIComponent(key)}`,
    publicUrl: `${apiBase}/dev/media/${encodeURIComponent(key)}`,
  };
}
