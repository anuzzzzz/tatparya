import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ============================================================
// R2/S3 Storage Client
// Cloudflare R2 is S3-compatible. Works with any S3 provider.
//
// In dev mode (R2 not configured), falls back to local disk
// storage served by Next.js static files or dev API endpoint.
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
// Storage Configuration Detection
// ============================================================

export function isStorageConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

// ============================================================
// Key Generation
//
// Two styles:
// - generateMediaKey(): Legacy pattern using filename for key
// - buildMediaKey(): New pattern using mediaId + variant + ext
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

export function buildMediaKey(storeId: string, mediaId: string, variant: string, ext: string): string {
  return `stores/${storeId}/${variant}/${mediaId}.${ext}`;
}

export function getExtFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[contentType] || 'jpg';
}

export function getPublicUrl(key: string): string {
  if (!isStorageConfigured()) {
    // Dev mode: return local URL
    const apiBase = env.API_BASE_URL || 'http://localhost:3001';
    return `${apiBase}/dev/media/${encodeURIComponent(key)}`;
  }
  const baseUrl = env.R2_PUBLIC_URL || `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.dev`;
  return `${baseUrl}/${key}`;
}

// ============================================================
// Presigned Upload URL
// Client uploads directly to R2 — no file goes through API.
//
// createPresignedUploadUrl: Called by media.service.ts
// getPresignedUploadUrl: Called by media.router.ts (legacy)
// ============================================================

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  maxSizeBytes?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!isStorageConfigured()) {
    return getDevUploadUrl(params.key);
  }
  return getPresignedUploadUrl(params.key, params.contentType);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
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
// Upload Buffer (for processed images from Sharp pipeline)
//
// Accepts object signature (from media.service.ts) or
// positional args (legacy callers).
// ============================================================

export async function uploadBuffer(
  keyOrParams: string | { key: string; body: Buffer; contentType: string },
  buffer?: Buffer,
  contentType?: string,
): Promise<string> {
  // Normalize to object form
  let key: string;
  let body: Buffer;
  let ct: string;

  if (typeof keyOrParams === 'object') {
    key = keyOrParams.key;
    body = keyOrParams.body;
    ct = keyOrParams.contentType;
  } else {
    key = keyOrParams;
    body = buffer!;
    ct = contentType!;
  }

  if (!isStorageConfigured()) {
    return writeLocalFile(key, body);
  }

  const client = getS3Client();

  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: ct,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return getPublicUrl(key);
}

// ============================================================
// Download (for pipeline processing)
//
// downloadBuffer: Called by media.service.ts
// downloadObject: Legacy name
// ============================================================

export async function downloadBuffer(key: string): Promise<Buffer> {
  if (!isStorageConfigured()) {
    return readLocalFile(key);
  }
  return downloadObject(key);
}

export async function downloadObject(key: string): Promise<Buffer> {
  const client = getS3Client();

  const response = await client.send(new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));

  if (!response.Body) throw new Error(`Empty response for key: ${key}`);

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
// Dev Mode: Local Disk Fallback
//
// When R2 is not configured, images are stored in the
// storefront's public/uploads directory and served by Next.js.
// ============================================================

const LOCAL_UPLOAD_DIR = join(process.cwd(), '../storefront/public/uploads');

export function getDevUploadUrl(key: string): { uploadUrl: string; publicUrl: string } {
  const apiBase = env.API_BASE_URL || 'http://localhost:3001';
  return {
    uploadUrl: `${apiBase}/dev/upload/${encodeURIComponent(key)}`,
    publicUrl: `${apiBase}/dev/media/${encodeURIComponent(key)}`,
  };
}

function writeLocalFile(key: string, buffer: Buffer): string {
  const filePath = join(LOCAL_UPLOAD_DIR, key);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
  // Return URL that Next.js can serve statically
  return `/uploads/${key}`;
}

function readLocalFile(key: string): Buffer {
  const filePath = join(LOCAL_UPLOAD_DIR, key);
  if (!existsSync(filePath)) {
    throw new Error(`Local file not found: ${filePath}`);
  }
  return readFileSync(filePath);
}
