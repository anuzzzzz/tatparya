import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventBus, emitEvent } from '../lib/event-bus.js';

// Mock Redis so tests don't need a running Redis instance
vi.mock('../lib/redis.js', () => {
  const mockRedis = {
    xadd: vi.fn().mockResolvedValue('1-0'),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xack: vi.fn().mockResolvedValue(1),
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  return {
    getRedis: () => mockRedis,
    closeRedis: vi.fn(),
  };
});

describe('EventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits an event and dispatches to in-process handlers', async () => {
    const bus = getEventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('order.created', handler);

    await emitEvent('order.created', 'store-123', {
      orderId: 'order-456',
      total: 2500,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0];
    expect(event.type).toBe('order.created');
    expect(event.storeId).toBe('store-123');
    expect(event.payload.orderId).toBe('order-456');
  });

  it('only dispatches to matching event type handlers', async () => {
    const bus = getEventBus();
    const orderHandler = vi.fn().mockResolvedValue(undefined);
    const productHandler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('order.created', orderHandler);
    bus.subscribe('product.created', productHandler);

    await emitEvent('order.created', 'store-123', { orderId: 'o1' });

    expect(orderHandler).toHaveBeenCalledTimes(1);
    expect(productHandler).not.toHaveBeenCalled();
  });

  it('supports multiple handlers for the same event', async () => {
    const bus = getEventBus();
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('order.shipped', handler1);
    bus.subscribe('order.shipped', handler2);

    await emitEvent('order.shipped', 'store-123', { orderId: 'o1' });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('subscribes to multiple event types at once', async () => {
    const bus = getEventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe(['order.created', 'order.paid'], handler);

    await emitEvent('order.created', 'store-1', { orderId: 'o1' });
    await emitEvent('order.paid', 'store-1', { orderId: 'o2' });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe removes handlers', async () => {
    const bus = getEventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('stock.low', handler);
    bus.unsubscribe('stock.low');

    await emitEvent('stock.low', 'store-1', { productId: 'p1' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('handler errors do not break other handlers', async () => {
    const bus = getEventBus();
    const errorHandler = vi.fn().mockRejectedValue(new Error('handler failed'));
    const goodHandler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('order.delivered', errorHandler);
    bus.subscribe('order.delivered', goodHandler);

    // Should not throw
    await emitEvent('order.delivered', 'store-1', { orderId: 'o1' });

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
  });
});
