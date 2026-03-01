// ============================================================
// Client-Side Image Resizer
//
// Resizes images off the main thread using OffscreenCanvas in a
// Web Worker (93%+ browser support). Falls back to main-thread
// Canvas for older browsers (Safari < 16.4).
//
// Why this matters on Indian networks:
// - A 10MB iPhone JPEG → ~15KB thumbnail + ~300KB full
// - OffscreenCanvas keeps the chat UI at 60fps during resize
// - Main-thread fallback janks briefly (~200ms) but still works
//
// Two sizes per image:
// - Thumbnail (200px): ~10-20KB, sent as base64 for AI triage
// - Full (1200px): ~200-400KB, uploaded to R2 via presigned URL
// ============================================================

export interface ResizedImage {
  /** Small thumbnail for AI triage (Call 0) — ~15KB */
  thumb: Blob;
  /** Full-size for R2 upload + AI catalog (Call 1) — ~300KB */
  full: Blob;
  /** Thumbnail as data URL for inline display + API body */
  thumbDataUrl: string;
  /** Original filename for reference */
  filename: string;
}

/** Default resize targets */
export const RESIZE_TARGETS = {
  thumb: { maxWidth: 200, quality: 0.6 },
  full: { maxWidth: 1200, quality: 0.8 },
} as const;

// ============================================================
// Public API
// ============================================================

/**
 * Resize a single image to the given max width.
 * Prefers OffscreenCanvas in a Worker; falls back to main-thread Canvas.
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  if (supportsOffscreenCanvas()) {
    try {
      return await resizeInWorker(file, maxWidth, quality);
    } catch {
      // Worker failed (e.g. CSP restrictions) — fall back
      return resizeOnMainThread(file, maxWidth, quality);
    }
  }
  return resizeOnMainThread(file, maxWidth, quality);
}

/**
 * Resize a batch of files into thumb + full pairs.
 * All files are processed in parallel.
 */
export async function resizeAll(files: File[]): Promise<ResizedImage[]> {
  return Promise.all(
    files.map(async (file) => {
      const [thumb, full] = await Promise.all([
        resizeImage(file, RESIZE_TARGETS.thumb.maxWidth, RESIZE_TARGETS.thumb.quality),
        resizeImage(file, RESIZE_TARGETS.full.maxWidth, RESIZE_TARGETS.full.quality),
      ]);

      const thumbDataUrl = await blobToDataUrl(thumb);

      return {
        thumb,
        full,
        thumbDataUrl,
        filename: file.name,
      };
    }),
  );
}

/**
 * Convert a Blob to a base64 data URL.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// Feature Detection
// ============================================================

function supportsOffscreenCanvas(): boolean {
  return (
    typeof OffscreenCanvas !== 'undefined' &&
    typeof Worker !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

// ============================================================
// OffscreenCanvas Worker (preferred — keeps UI at 60fps)
//
// Creates an inline worker to avoid a separate JS file.
// The worker receives an ImageBitmap (transferable), resizes
// it on OffscreenCanvas, and returns the result as a Blob.
// ============================================================

const WORKER_CODE = `
self.onmessage = async (e) => {
  const { bitmap, maxWidth, quality } = e.data;
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    self.postMessage({ blob }, []);
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
`;

let workerBlobUrl: string | null = null;

function getWorkerBlobUrl(): string {
  if (!workerBlobUrl) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
  }
  return workerBlobUrl;
}

async function resizeInWorker(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const worker = new Worker(getWorkerBlobUrl());

  return new Promise<Blob>((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker resize timed out'));
    }, 15_000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.blob);
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(e.message || 'Worker error'));
    };

    // Transfer the bitmap (zero-copy)
    worker.postMessage({ bitmap, maxWidth, quality }, [bitmap]);
  });
}

// ============================================================
// Main-Thread Canvas Fallback
//
// For Safari < 16.4 and browsers without OffscreenCanvas.
// Janks for ~200ms on cheap phones but works everywhere.
// ============================================================

function resizeOnMainThread(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}
