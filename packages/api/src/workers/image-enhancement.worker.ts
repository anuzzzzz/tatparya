import { getEventBus } from '../lib/event-bus.js';
import { MediaService } from '../services/media.service.js';
import { getServiceClient } from '../lib/db.js';
import type { BaseEvent } from '@tatparya/shared';

// ============================================================
// Image Enhancement Worker
//
// Subscribes to image.uploaded events and automatically
// generates all size variants (hero, card, thumbnail, square, og).
//
// In production, this would run as a separate process.
// For MVP, it runs in-process via the event bus.
// ============================================================

export function startImageEnhancementWorker(): void {
  const eventBus = getEventBus();

  eventBus.subscribe('image.uploaded', async (event: BaseEvent) => {
    const { imageId } = event.payload as { imageId: string };
    const storeId = event.storeId;

    console.log(`🖼️ Enhancement worker: Processing ${imageId} for store ${storeId}`);

    try {
      const db = getServiceClient();
      const service = new MediaService(db);
      await service.enhanceImage(storeId, imageId);
    } catch (err) {
      console.error(`Enhancement worker failed for ${imageId}:`, err);
    }
  });

  console.log('🖼️ Image enhancement worker started');
}

// ============================================================
// Enhancement Queue (for batch processing)
//
// If you want to process multiple images with controlled
// concurrency, use this instead of the event-based approach.
// ============================================================

export class EnhancementQueue {
  private queue: Array<{ storeId: string; mediaId: string }> = [];
  private processing = false;
  private concurrency: number;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  add(storeId: string, mediaId: string): void {
    this.queue.push({ storeId, mediaId });
    if (!this.processing) {
      this.process().catch(console.error);
    }
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      // Take up to `concurrency` items
      const batch = this.queue.splice(0, this.concurrency);

      await Promise.all(
        batch.map(async ({ storeId, mediaId }) => {
          try {
            const db = getServiceClient();
            const service = new MediaService(db);
            await service.enhanceImage(storeId, mediaId);
          } catch (err) {
            console.error(`Queue: Enhancement failed for ${mediaId}:`, err);
          }
        })
      );
    }

    this.processing = false;
  }

  get pending(): number {
    return this.queue.length;
  }
}
