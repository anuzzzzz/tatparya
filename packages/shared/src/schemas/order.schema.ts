import { z } from 'zod';
import { StoreId, EntityId, IndianPhone, INRAmount, Address, PaginationInput, DateRangeInput } from './common.schema.js';

// ============================================================
// Order Status (finite state machine)
// ============================================================

export const OrderStatus = z.enum([
  'created',
  'payment_pending',
  'paid',
  'cod_confirmed',
  'cod_otp_verified',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
  'rto',             // Return to origin
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentMethod = z.enum(['upi', 'card', 'netbanking', 'wallet', 'cod']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const PaymentStatus = z.enum(['pending', 'authorized', 'captured', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const ShippingMode = z.enum(['self_managed', 'shiprocket']);
export type ShippingMode = z.infer<typeof ShippingMode>;

export const FulfillmentStatus = z.enum(['unfulfilled', 'partially_fulfilled', 'fulfilled', 'returned']);
export type FulfillmentStatus = z.infer<typeof FulfillmentStatus>;

// ============================================================
// Allowed State Transitions
// ============================================================

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  created:            ['payment_pending', 'cod_confirmed', 'cancelled'],
  payment_pending:    ['paid', 'cancelled'],
  paid:               ['processing', 'cancelled', 'refunded'],
  cod_confirmed:      ['cod_otp_verified', 'cancelled'],
  cod_otp_verified:   ['processing', 'cancelled'],
  processing:         ['shipped', 'cancelled', 'refunded'],
  shipped:            ['out_for_delivery', 'delivered', 'rto'],
  out_for_delivery:   ['delivered', 'rto'],
  delivered:          ['refunded'],
  cancelled:          [],
  refunded:           [],
  rto:                [],
};

// ============================================================
// Line Item
// ============================================================

export const LineItem = z.object({
  productId: EntityId,
  variantId: EntityId.optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: INRAmount,
  totalPrice: INRAmount,
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(28).optional(),
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.string()).optional(), // e.g. { size: "L", color: "Red" }
});

export type LineItem = z.infer<typeof LineItem>;

// ============================================================
// Order CRUD
// ============================================================

export const CreateOrderInput = z.object({
  storeId: StoreId,
  buyerPhone: IndianPhone,
  buyerName: z.string().min(1).max(200),
  buyerEmail: z.string().email().optional(),
  shippingAddress: Address,
  billingAddress: Address.optional(),
  lineItems: z.array(LineItem).min(1),
  paymentMethod: PaymentMethod,
  shippingMode: ShippingMode.default('self_managed'),
  discountCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateOrderStatusInput = z.object({
  storeId: StoreId,
  orderId: EntityId,
  status: OrderStatus,
  trackingNumber: z.string().max(200).optional(),
  trackingUrl: z.string().url().optional(),
  awbNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const ListOrdersInput = z.object({
  storeId: StoreId,
  status: OrderStatus.optional(),
  paymentMethod: PaymentMethod.optional(),
  buyerPhone: IndianPhone.optional(),
  dateRange: DateRangeInput.optional(),
  pagination: PaginationInput.default({ page: 1, limit: 20 }),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInput>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInput>;
export type ListOrdersInput = z.infer<typeof ListOrdersInput>;

// ============================================================
// Invoice
// ============================================================

export const InvoiceType = z.enum(['invoice', 'credit_note']);

export const InvoiceLineItem = z.object({
  productName: z.string(),
  hsnCode: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: INRAmount,
  taxableValue: INRAmount,
  gstRate: z.number(),
  cgst: INRAmount,
  sgst: INRAmount,
  igst: INRAmount,
});

export type InvoiceLineItem = z.infer<typeof InvoiceLineItem>;
export type InvoiceType = z.infer<typeof InvoiceType>;
