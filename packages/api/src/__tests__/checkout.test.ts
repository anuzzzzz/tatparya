import { describe, it, expect } from 'vitest';
import {
  CreateOrderInput, Address, LineItem, OrderStatus, PaymentMethod,
  ORDER_TRANSITIONS,
} from '@tatparya/shared';

// ============================================================
// Checkout Input Validation (Zod schemas)
// ============================================================

describe('Checkout Input Validation', () => {
  const validAddress: Address = {
    name: 'Priya Sharma',
    phone: '+919876543210',
    line1: '42, MG Road, Sector 5',
    city: 'Gurugram',
    state: 'Haryana',
    stateCode: '06',
    pincode: '122001',
    country: 'IN',
  };

  const validLineItem: LineItem = {
    productId: '00000000-0000-0000-0000-000000000001',
    name: 'Cotton Kurti - Blue',
    quantity: 2,
    unitPrice: 599,
    totalPrice: 1198,
  };

  const validOrder = {
    storeId: '00000000-0000-0000-0000-000000000099',
    buyerPhone: '+919876543210',
    buyerName: 'Priya Sharma',
    shippingAddress: validAddress,
    lineItems: [validLineItem],
    paymentMethod: 'cod' as const,
  };

  describe('Valid inputs', () => {
    it('accepts a minimal COD order', () => {
      const result = CreateOrderInput.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('accepts order with optional fields', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        buyerEmail: 'priya@example.com',
        notes: 'Please deliver before 6pm',
        discountCode: 'SAVE10',
        shippingMode: 'self_managed',
      });
      expect(result.success).toBe(true);
    });

    it('accepts order with full address including optional fields', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        shippingAddress: {
          ...validAddress,
          line2: 'Near City Mall',
          landmark: 'Opposite SBI Bank',
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts order with variant line items', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        lineItems: [{
          ...validLineItem,
          variantId: '00000000-0000-0000-0000-000000000002',
          attributes: { size: 'L', color: 'Blue' },
          hsnCode: '6109',
          gstRate: 5,
          imageUrl: 'https://media.tatparya.in/products/kurti.webp',
        }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts all valid payment methods', () => {
      const methods: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet', 'cod'];
      for (const method of methods) {
        const result = CreateOrderInput.safeParse({ ...validOrder, paymentMethod: method });
        expect(result.success, `payment method "${method}" should be valid`).toBe(true);
      }
    });
  });

  describe('Phone validation', () => {
    it('rejects phone without +91 prefix', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        buyerPhone: '9876543210',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone starting with invalid digit (0-5)', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        buyerPhone: '+915876543210',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone with wrong length', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        buyerPhone: '+91987654321', // 9 digits
      });
      expect(result.success).toBe(false);
    });

    it('accepts phone starting with 6-9', () => {
      for (const digit of ['6', '7', '8', '9']) {
        const result = CreateOrderInput.safeParse({
          ...validOrder,
          buyerPhone: `+91${digit}876543210`,
        });
        expect(result.success, `phone starting with ${digit} should be valid`).toBe(true);
      }
    });
  });

  describe('Address validation', () => {
    it('rejects invalid pincode (5 digits)', () => {
      const result = Address.safeParse({
        ...validAddress,
        pincode: '12200', // 5 digits
      });
      expect(result.success).toBe(false);
    });

    it('rejects pincode starting with 0', () => {
      const result = Address.safeParse({
        ...validAddress,
        pincode: '012345',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid state code', () => {
      const result = Address.safeParse({
        ...validAddress,
        stateCode: '6', // single digit
      });
      expect(result.success).toBe(false);
    });

    it('accepts all Indian state codes (01-38)', () => {
      for (const code of ['01', '07', '19', '27', '33', '36', '38']) {
        const result = Address.safeParse({
          ...validAddress,
          stateCode: code,
        });
        expect(result.success, `state code "${code}" should be valid`).toBe(true);
      }
    });

    it('enforces country as IN', () => {
      const result = Address.safeParse({
        ...validAddress,
        country: 'US',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = Address.safeParse({
        ...validAddress,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty line1', () => {
      const result = Address.safeParse({
        ...validAddress,
        line1: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Line items validation', () => {
    it('rejects empty line items array', () => {
      const result = CreateOrderInput.safeParse({
        ...validOrder,
        lineItems: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity of 0', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative quantity', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        unitPrice: -100,
      });
      expect(result.success).toBe(false);
    });

    it('accepts zero price (free item)', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        unitPrice: 0,
        totalPrice: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts line item with GST info', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        hsnCode: '6109',
        gstRate: 5,
      });
      expect(result.success).toBe(true);
    });

    it('rejects GST rate above 28%', () => {
      const result = LineItem.safeParse({
        ...validLineItem,
        gstRate: 30,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Required fields', () => {
    it('rejects missing storeId', () => {
      const { storeId, ...noStore } = validOrder;
      const result = CreateOrderInput.safeParse(noStore);
      expect(result.success).toBe(false);
    });

    it('rejects missing buyerPhone', () => {
      const { buyerPhone, ...noPhone } = validOrder;
      const result = CreateOrderInput.safeParse(noPhone);
      expect(result.success).toBe(false);
    });

    it('rejects missing buyerName', () => {
      const { buyerName, ...noName } = validOrder;
      const result = CreateOrderInput.safeParse(noName);
      expect(result.success).toBe(false);
    });

    it('rejects missing shippingAddress', () => {
      const { shippingAddress, ...noAddr } = validOrder;
      const result = CreateOrderInput.safeParse(noAddr);
      expect(result.success).toBe(false);
    });

    it('rejects missing paymentMethod', () => {
      const { paymentMethod, ...noPay } = validOrder;
      const result = CreateOrderInput.safeParse(noPay);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// COD Order Flow (State Machine)
// ============================================================

describe('COD Order Flow', () => {
  it('supports the full COD happy path', () => {
    const codPath = ['created', 'cod_confirmed', 'cod_otp_verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    for (let i = 0; i < codPath.length - 1; i++) {
      const from = codPath[i]!;
      const to = codPath[i + 1]!;
      expect(ORDER_TRANSITIONS[from], `Missing transitions for "${from}"`).toBeDefined();
      expect(ORDER_TRANSITIONS[from]).toContain(to);
    }
  });

  it('allows cancellation from created state', () => {
    expect(ORDER_TRANSITIONS['created']).toContain('cancelled');
  });

  it('allows cancellation from cod_confirmed state', () => {
    expect(ORDER_TRANSITIONS['cod_confirmed']).toContain('cancelled');
  });

  it('allows cancellation from processing state', () => {
    expect(ORDER_TRANSITIONS['processing']).toContain('cancelled');
  });

  it('allows RTO from shipped state', () => {
    expect(ORDER_TRANSITIONS['shipped']).toContain('rto');
  });

  it('allows refund after delivery', () => {
    expect(ORDER_TRANSITIONS['delivered']).toContain('refunded');
  });

  it('cannot transition from cancelled', () => {
    expect(ORDER_TRANSITIONS['cancelled']).toEqual([]);
  });

  it('cannot skip directly from created to shipped', () => {
    expect(ORDER_TRANSITIONS['created']).not.toContain('shipped');
  });
});
