import { v4 as uuidv4 } from 'uuid';
import type { EventBus, BaseEvent, EventType } from '@tatparya/shared';
import { getRedis } from './redis.js';

// ============================================================
// Redis Streams EventBus Implementation
//
// All state changes emit events to Redis Streams.
// This connects Commerce Core ↔ WhatsApp Engine and any
// future consumers. If/when migrating to Kafka, swap this
// adapter — no application code changes.
// ============================================================

const STREAM_KEY = 'tatparya:events';
const CONSUMER_GROUP = 'tatparya-workers';

type EventHandler = (event: BaseEvent) => Promise<void>;

class RedisEventBus implements EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private isConsuming = false;

  async emit(event: BaseEvent): Promise<void> {
    const redis = getRedis();
    const eventWithDefaults: BaseEvent = {
      id: event.id || uuidv4(),
      type: event.type,
      storeId: event.storeId,
      timestamp: event.timestamp || new Date(),
      payload: event.payload,
      metadata: event.metadata || { source: 'api' },
    };

    try {
      await redis.xadd(
        STREAM_KEY,
        '*', // Auto-generate stream ID
        'type', eventWithDefaults.type,
        'storeId', eventWithDefaults.storeId,
        'data', JSON.stringify(eventWithDefaults),
      );

      console.log(`📤 Event emitted: ${eventWithDefaults.type} [store: ${eventWithDefaults.storeId}]`);

      // Also dispatch to in-process handlers (for co-located consumers)
      await this.dispatch(eventWithDefaults);
    } catch (err) {
      console.error(`Failed to emit event ${eventWithDefaults.type}:`, err);
      throw err;
    }
  }

  subscribe(eventTypes: EventType | EventType[], handler: EventHandler): void {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    for (const type of types) {
      const existing = this.handlers.get(type) || [];
      existing.push(handler);
      this.handlers.set(type, existing);
    }
    console.log(`📥 Subscribed to: ${types.join(', ')}`);
  }

  unsubscribe(eventTypes: EventType | EventType[]): void {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    for (const type of types) {
      this.handlers.delete(type);
    }
  }

  private async dispatch(event: BaseEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Handler error for ${event.type}:`, err);
      }
    }
  }

  /**
   * Start consuming events from the Redis Stream.
   * Call this in background workers that need to process events.
   */
  async startConsuming(consumerName: string): Promise<void> {
    if (this.isConsuming) return;
    this.isConsuming = true;

    const redis = getRedis();

    // Create consumer group if it doesn't exist
    try {
      await redis.xgroup('CREATE', STREAM_KEY, CONSUMER_GROUP, '0', 'MKSTREAM');
    } catch {
      // Group already exists — that's fine
    }

    console.log(`🔄 Started consuming events as ${consumerName}`);

    while (this.isConsuming) {
      try {
        const results = await redis.xreadgroup(
          'GROUP', CONSUMER_GROUP, consumerName,
          'COUNT', '10',
          'BLOCK', '5000', // Wait up to 5 seconds for new messages
          'STREAMS', STREAM_KEY, '>',
        );

        if (!results) continue;

        for (const [, messages] of results) {
          for (const [id, fields] of messages as [string, string[]][]) {
            try {
              const dataIndex = fields.indexOf('data');
              if (dataIndex === -1 || !fields[dataIndex + 1]) continue;

              const event: BaseEvent = JSON.parse(fields[dataIndex + 1]!);
              await this.dispatch(event);

              // Acknowledge the message
              await redis.xack(STREAM_KEY, CONSUMER_GROUP, id);
            } catch (err) {
              console.error(`Failed to process message ${id}:`, err);
            }
          }
        }
      } catch (err) {
        if (this.isConsuming) {
          console.error('Error consuming events:', err);
          await new Promise((r) => setTimeout(r, 1000)); // Back off on error
        }
      }
    }
  }

  stopConsuming(): void {
    this.isConsuming = false;
  }
}

// Singleton
let eventBus: RedisEventBus | null = null;

export function getEventBus(): RedisEventBus {
  if (!eventBus) {
    eventBus = new RedisEventBus();
  }
  return eventBus;
}

// ============================================================
// Helper: Create and emit a typed event
// ============================================================

export async function emitEvent(
  type: EventType,
  storeId: string,
  payload: Record<string, unknown>,
  metadata?: { source?: string; correlationId?: string; userId?: string },
): Promise<void> {
  const event: BaseEvent = {
    id: uuidv4(),
    type,
    storeId,
    timestamp: new Date(),
    payload,
    metadata: {
      source: metadata?.source || 'api',
      correlationId: metadata?.correlationId,
      userId: metadata?.userId,
    },
  };
  await getEventBus().emit(event);
}
