import type { OrderRepository } from '../repositories/order.repository.js';
import type { VariantRepository } from '../repositories/product.repository.js';
import type { DiscountRepository } from '../repositories/discount.repository.js';
import { emitEvent } from '../lib/event-bus.js';

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private variantRepo: VariantRepository,
    private discountRepo: DiscountRepository,
  ) {}

  async createOrder(storeId: string, data: {
    buyerPhone: string;
    buyerName: string;
    buyerEmail?: string;
    shippingAddress: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    lineItems: Array<{
      productId: string;
      variantId?: string;
      name: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      hsnCode?: string;
      gstRate?: number;
      imageUrl?: string;
      attributes?: Record<string, string>;
    }>;
    paymentMethod: string;
    shippingMode?: string;
    discountCode?: string;
    shippingCost?: number;
    taxAmount?: number;
    notes?: string;
  }) {
    // Calculate totals
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity, 0
    );

    let discountAmount = 0;
    if (data.discountCode) {
      const discount = await this.discountRepo.findByCode(storeId, data.discountCode);
      if (discount && discount.active) {
        discountAmount = this.calculateDiscount(discount, subtotal);
        await this.discountRepo.incrementUsage(storeId, discount.id);
      }
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = data.taxAmount || 0;
    const shippingCost = data.shippingCost || 0;
    const total = taxableAmount + taxAmount + shippingCost;

    // Generate order number
    const orderNumber = await this.orderRepo.generateOrderNumber(storeId);

    // Build line items with total price
    const lineItems = data.lineItems.map((item) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity,
    }));

    // Create order
    const order = await this.orderRepo.create(storeId, {
      orderNumber,
      buyerPhone: data.buyerPhone,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      paymentMethod: data.paymentMethod,
      shippingMode: data.shippingMode,
      discountCode: data.discountCode,
      notes: data.notes,
    });

    // Commit stock reservations (deduct from actual stock)
    for (const item of data.lineItems) {
      if (item.variantId) {
        try {
          await this.variantRepo.commitReservation(storeId, item.variantId, item.quantity);
        } catch (err) {
          console.error(`Failed to commit stock for variant ${item.variantId}:`, err);
        }
      }
    }

    // Emit order.created event
    await emitEvent('order.created', storeId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerPhone: order.buyerPhone,
      buyerName: order.buyerName,
      total: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
      lineItems: order.lineItems,
    }, { source: 'order-service' });

    return order;
  }

  async updateStatus(storeId: string, orderId: string, newStatus: string, extra?: {
    trackingNumber?: string;
    trackingUrl?: string;
    awbNumber?: string;
    paymentStatus?: string;
    paymentReference?: string;
    codOtpVerified?: boolean;
    notes?: string;
  }) {
    const order = await this.orderRepo.updateStatus(storeId, orderId, newStatus, extra);

    // Map status to event type
    const eventMap: Record<string, string> = {
      paid: 'order.paid',
      processing: 'order.processing',
      shipped: 'order.shipped',
      out_for_delivery: 'order.out_for_delivery',
      delivered: 'order.delivered',
      cancelled: 'order.cancelled',
      refunded: 'order.refunded',
      rto: 'order.rto',
      cod_confirmed: 'order.cod_confirmed',
      cod_otp_verified: 'order.cod_otp_verified',
    };

    const eventType = eventMap[newStatus];
    if (eventType) {
      await emitEvent(eventType as any, storeId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        buyerPhone: order.buyerPhone,
        buyerName: order.buyerName,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: newStatus,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      }, { source: 'order-service' });
    }

    // Handle cancellation — restore stock
    if (newStatus === 'cancelled' || newStatus === 'rto') {
      const items = order.lineItems as Array<{ variantId?: string; quantity: number }>;
      for (const item of items) {
        if (item.variantId) {
          try {
            await this.variantRepo.adjustStock(storeId, item.variantId, item.quantity);
          } catch (err) {
            console.error(`Failed to restore stock for variant ${item.variantId}:`, err);
          }
        }
      }
    }

    return order;
  }

  private calculateDiscount(discount: {
    type: string;
    value: number;
    minOrderValue: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    usedCount: number;
    active: boolean;
    startsAt: string;
    endsAt: string | null;
  }, orderTotal: number): number {
    // Check if still valid
    const now = new Date();
    if (!discount.active) return 0;
    if (new Date(discount.startsAt) > now) return 0;
    if (discount.endsAt && new Date(discount.endsAt) < now) return 0;
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return 0;
    if (discount.minOrderValue && orderTotal < discount.minOrderValue) return 0;

    let amount = 0;

    switch (discount.type) {
      case 'percentage':
        amount = (orderTotal * discount.value) / 100;
        break;
      case 'flat':
        amount = discount.value;
        break;
      case 'bogo':
        // BOGO logic would need cart items — simplified here
        amount = 0;
        break;
    }

    // Cap at max discount
    if (discount.maxDiscount && amount > discount.maxDiscount) {
      amount = discount.maxDiscount;
    }

    // Don't exceed order total
    if (amount > orderTotal) {
      amount = orderTotal;
    }

    return Math.round(amount * 100) / 100;
  }
}
