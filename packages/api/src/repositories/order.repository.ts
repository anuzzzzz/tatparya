import type { SupabaseClient } from '@supabase/supabase-js';
import { ORDER_TRANSITIONS } from '@tatparya/shared';

export class OrderRepository {
  constructor(private db: SupabaseClient) {}

  async create(storeId: string, data: {
    orderNumber: string;
    buyerPhone: string;
    buyerName: string;
    buyerEmail?: string;
    shippingAddress: Record<string, unknown>;
    billingAddress?: Record<string, unknown>;
    lineItems: unknown[];
    subtotal: number;
    discountAmount?: number;
    shippingCost?: number;
    taxAmount?: number;
    total: number;
    paymentMethod: string;
    shippingMode?: string;
    discountCode?: string;
    notes?: string;
    buyerTrustScore?: number;
  }) {
    const { data: order, error } = await this.db
      .from('orders')
      .insert({
        store_id: storeId,
        order_number: data.orderNumber,
        buyer_phone: data.buyerPhone,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail || null,
        shipping_address: data.shippingAddress,
        billing_address: data.billingAddress || data.shippingAddress,
        line_items: data.lineItems,
        subtotal: data.subtotal,
        discount_amount: data.discountAmount || 0,
        shipping_cost: data.shippingCost || 0,
        tax_amount: data.taxAmount || 0,
        total: data.total,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        status: 'created',
        fulfillment_status: 'unfulfilled',
        shipping_mode: data.shippingMode || 'self_managed',
        discount_code: data.discountCode || null,
        notes: data.notes || null,
        buyer_trust_score: data.buyerTrustScore || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create order: ${error.message}`);
    return mapOrderRow(order);
  }

  async findById(storeId: string, orderId: string) {
    const { data, error } = await this.db
      .from('orders')
      .select()
      .eq('store_id', storeId)
      .eq('id', orderId)
      .single();

    if (error) return null;
    return mapOrderRow(data);
  }

  async list(storeId: string, filters: {
    status?: string;
    paymentMethod?: string;
    buyerPhone?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = this.db
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
    if (filters.buyerPhone) query = query.eq('buyer_phone', filters.buyerPhone);
    if (filters.from) query = query.gte('created_at', filters.from.toISOString());
    if (filters.to) query = query.lte('created_at', filters.to.toISOString());

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list orders: ${error.message}`);

    return {
      items: (data || []).map(mapOrderRow),
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  async updateStatus(storeId: string, orderId: string, newStatus: string, extra?: {
    trackingNumber?: string;
    trackingUrl?: string;
    awbNumber?: string;
    paymentStatus?: string;
    paymentReference?: string;
    codOtpVerified?: boolean;
    invoiceNumber?: string;
    invoiceUrl?: string;
  }) {
    // Validate transition
    const order = await this.findById(storeId, orderId);
    if (!order) throw new Error('Order not found');

    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${order.status} → ${newStatus}. Allowed: ${(allowed || []).join(', ')}`
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };

    if (extra?.trackingNumber !== undefined) updateData['tracking_number'] = extra.trackingNumber;
    if (extra?.trackingUrl !== undefined) updateData['tracking_url'] = extra.trackingUrl;
    if (extra?.awbNumber !== undefined) updateData['awb_number'] = extra.awbNumber;
    if (extra?.paymentStatus !== undefined) updateData['payment_status'] = extra.paymentStatus;
    if (extra?.paymentReference !== undefined) updateData['payment_reference'] = extra.paymentReference;
    if (extra?.codOtpVerified !== undefined) updateData['cod_otp_verified'] = extra.codOtpVerified;
    if (extra?.invoiceNumber !== undefined) updateData['invoice_number'] = extra.invoiceNumber;
    if (extra?.invoiceUrl !== undefined) updateData['invoice_url'] = extra.invoiceUrl;

    // Set fulfillment status based on order status
    if (newStatus === 'shipped' || newStatus === 'out_for_delivery') {
      updateData['fulfillment_status'] = 'partially_fulfilled';
    } else if (newStatus === 'delivered') {
      updateData['fulfillment_status'] = 'fulfilled';
    } else if (newStatus === 'rto') {
      updateData['fulfillment_status'] = 'returned';
    }

    const { data: updated, error } = await this.db
      .from('orders')
      .update(updateData)
      .eq('store_id', storeId)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update order: ${error.message}`);
    return mapOrderRow(updated);
  }

  async generateOrderNumber(storeId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Count existing orders this month for sequential number
    const { count } = await this.db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);

    const seq = String((count || 0) + 1).padStart(5, '0');
    return `TTP-${yearMonth}-${seq}`;
  }

  async getRevenueSummary(storeId: string, period: 'today' | 'week' | 'month') {
    const now = new Date();
    let from: Date;

    switch (period) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data, error } = await this.db
      .from('orders')
      .select('total, status, payment_method')
      .eq('store_id', storeId)
      .gte('created_at', from.toISOString())
      .in('status', ['paid', 'processing', 'shipped', 'out_for_delivery', 'delivered']);

    if (error) throw new Error(`Failed to get revenue: ${error.message}`);

    const orders = data || [];
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o['total']), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    const byPaymentMethod: Record<string, number> = {};
    for (const o of orders) {
      const method = o['payment_method'] as string;
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(o['total']);
    }

    return {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      byPaymentMethod,
    };
  }
}

function mapOrderRow(row: Record<string, unknown>) {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as string,
    orderNumber: row['order_number'] as string,
    buyerPhone: row['buyer_phone'] as string,
    buyerName: row['buyer_name'] as string,
    buyerEmail: row['buyer_email'] as string | null,
    shippingAddress: row['shipping_address'] as Record<string, unknown>,
    billingAddress: row['billing_address'] as Record<string, unknown> | null,
    lineItems: row['line_items'] as unknown[],
    subtotal: Number(row['subtotal']),
    discountAmount: Number(row['discount_amount']),
    shippingCost: Number(row['shipping_cost']),
    taxAmount: Number(row['tax_amount']),
    total: Number(row['total']),
    paymentMethod: row['payment_method'] as string,
    paymentStatus: row['payment_status'] as string,
    paymentReference: row['payment_reference'] as string | null,
    status: row['status'] as string,
    fulfillmentStatus: row['fulfillment_status'] as string,
    shippingMode: row['shipping_mode'] as string,
    trackingNumber: row['tracking_number'] as string | null,
    trackingUrl: row['tracking_url'] as string | null,
    awbNumber: row['awb_number'] as string | null,
    buyerTrustScore: row['buyer_trust_score'] as number | null,
    codOtpVerified: row['cod_otp_verified'] as boolean,
    invoiceNumber: row['invoice_number'] as string | null,
    invoiceUrl: row['invoice_url'] as string | null,
    discountCode: row['discount_code'] as string | null,
    notes: row['notes'] as string | null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}
