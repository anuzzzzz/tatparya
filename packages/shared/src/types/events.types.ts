import { z } from 'zod';

// ============================================================
// Event Bus Types
// All state changes emit events. The WhatsApp engine (and future
// services) consume these events.
// ============================================================

export const EventType = z.enum([
  // Commerce events
  'order.created',
  'order.paid',
  'order.processing',
  'order.shipped',
  'order.out_for_delivery',
  'order.delivered',
  'order.cancelled',
  'order.refunded',
  'order.rto',

  // COD events
  'order.cod_confirmed',
  'order.cod_otp_verified',

  // Product events
  'product.created',
  'product.updated',
  'product.deleted',

  // Inventory events
  'stock.low',
  'stock.out',
  'stock.replenished',

  // Cart events
  'cart.abandoned',

  // Store events
  'store.created',
  'store.activated',
  'store.paused',

  // WhatsApp events
  'campaign.created',
  'campaign.sent',
  'campaign.analyzed',
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'customer.opted_in',
  'customer.opted_out',

  // Media events
  'image.uploaded',
  'image.enhancement_started',
  'image.enhancement_completed',
  'image.enhancement_failed',
]);

export type EventType = z.infer<typeof EventType>;

export const BaseEvent = z.object({
  id: z.string().uuid(),
  type: EventType,
  storeId: z.string().uuid(),
  timestamp: z.coerce.date(),
  payload: z.record(z.unknown()),
  metadata: z.object({
    source: z.string(),       // Which service emitted this
    correlationId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
  }).default({ source: 'unknown' }),
});

export type BaseEvent = z.infer<typeof BaseEvent>;

// ============================================================
// Typed Event Payloads
// ============================================================

export interface OrderEventPayload {
  orderId: string;
  orderNumber: string;
  buyerPhone: string;
  buyerName: string;
  total: number;
  paymentMethod: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export interface ProductEventPayload {
  productId: string;
  name: string;
  price: number;
  status: string;
}

export interface StockEventPayload {
  productId: string;
  variantId: string;
  productName: string;
  currentStock: number;
  threshold?: number;
}

export interface ImageEventPayload {
  imageId: string;
  productId?: string;
  originalUrl: string;
  enhancedUrls?: Record<string, string>;
}

export interface CampaignEventPayload {
  campaignId: string;
  name: string;
  type: string;
  recipientCount: number;
}

// ============================================================
// EventBus Interface
// ============================================================

export interface EventBus {
  emit(event: BaseEvent): Promise<void>;
  subscribe(eventType: EventType | EventType[], handler: (event: BaseEvent) => Promise<void>): void;
  unsubscribe(eventType: EventType | EventType[]): void;
}
