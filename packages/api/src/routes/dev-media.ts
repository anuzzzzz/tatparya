import type { FastifyInstance } from 'fastify';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ============================================================
// Dev Media Routes
//
// In dev mode (no R2 configured), storage.ts generates URLs
// pointing to /dev/upload/* and /dev/media/*. These Fastify
// routes handle those requests by writing/reading from the
// storefront's public/uploads directory.
//
// Production uses R2 presigned URLs — these routes are never
// registered outside development.
// ============================================================

const LOCAL_UPLOAD_DIR = join(process.cwd(), '../storefront/public/uploads');

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
};

export async function registerDevMediaRoutes(app: FastifyInstance) {
  if (process.env.NODE_ENV === 'production') return;

  // Scoped plugin so the raw body parser only applies to upload routes
  await app.register(async (instance) => {
    // Parse any content type as raw buffer (for image uploads)
    instance.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    // PUT /dev/upload/* — receive uploaded file and write to disk
    instance.put('/dev/upload/*', async (request, reply) => {
      try {
        const rawKey = (request.params as any)['*'];
        const key = decodeURIComponent(rawKey);
        const filePath = join(LOCAL_UPLOAD_DIR, key);

        mkdirSync(dirname(filePath), { recursive: true });

        const body = request.body;
        if (Buffer.isBuffer(body)) {
          writeFileSync(filePath, body);
        } else if (body instanceof Uint8Array) {
          writeFileSync(filePath, Buffer.from(body));
        } else {
          reply.code(400).send({ error: 'Expected binary body' });
          return;
        }

        console.log(`[dev-media] Saved ${key} (${Buffer.isBuffer(body) ? body.length : 0} bytes)`);
        reply.code(200).send({ success: true, key });
      } catch (err: any) {
        console.error('[dev-media] Upload failed:', err.message);
        reply.code(500).send({ error: err.message });
      }
    });
  });

  // GET /dev/media/* — serve file from disk
  app.get('/dev/media/*', async (request, reply) => {
    try {
      const rawKey = (request.params as any)['*'];
      const key = decodeURIComponent(rawKey);
      const filePath = join(LOCAL_UPLOAD_DIR, key);

      if (!existsSync(filePath)) {
        reply.code(404).send({ error: 'File not found', key, path: filePath });
        return;
      }

      const data = readFileSync(filePath);
      const ext = key.split('.').pop()?.toLowerCase() || 'jpg';

      reply
        .header('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(data);
    } catch (err: any) {
      console.error('[dev-media] Serve failed:', err.message);
      reply.code(500).send({ error: err.message });
    }
  });

  console.log('[dev-media] Dev upload/media routes registered');
}
