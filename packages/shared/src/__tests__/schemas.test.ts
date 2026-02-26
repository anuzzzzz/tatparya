import { describe, it, expect } from 'vitest';
import {
  IndianPhone,
  Pincode,
  GSTIN,
  HSNCode,
  Address,
  PaginationInput,
} from '../schemas/common.schema.js';
import { CreateStoreInput, StoreStatus, Vertical } from '../schemas/store.schema.js';
import { CreateProductInput, ProductStatus } from '../schemas/product.schema.js';
import { OrderStatus, ORDER_TRANSITIONS, PaymentMethod } from '../schemas/order.schema.js';
import { getGSTRate, calculateGST } from '../constants/gst-rates.js';

describe('Common Schemas', () => {
  describe('IndianPhone', () => {
    it('accepts valid Indian numbers', () => {
      expect(IndianPhone.parse('+919876543210')).toBe('+919876543210');
      expect(IndianPhone.parse('+916000000000')).toBe('+916000000000');
    });

    it('rejects invalid numbers', () => {
      expect(() => IndianPhone.parse('9876543210')).toThrow();     // No +91
      expect(() => IndianPhone.parse('+911234567890')).toThrow();  // Starts with 1
      expect(() => IndianPhone.parse('+9198765432')).toThrow();    // Too short
      expect(() => IndianPhone.parse('+1234567890')).toThrow();    // Not Indian
    });
  });

  describe('Pincode', () => {
    it('accepts valid pincodes', () => {
      expect(Pincode.parse('302001')).toBe('302001');
      expect(Pincode.parse('110001')).toBe('110001');
    });

    it('rejects invalid pincodes', () => {
      expect(() => Pincode.parse('012345')).toThrow();  // Starts with 0
      expect(() => Pincode.parse('12345')).toThrow();   // Too short
      expect(() => Pincode.parse('1234567')).toThrow(); // Too long
    });
  });

  describe('GSTIN', () => {
    it('accepts valid GSTIN', () => {
      expect(GSTIN.parse('27AAPFU0939F1ZV')).toBe('27AAPFU0939F1ZV');
    });

    it('accepts undefined (optional)', () => {
      expect(GSTIN.parse(undefined)).toBeUndefined();
    });
  });

  describe('Address', () => {
    it('validates a complete address', () => {
      const addr = Address.parse({
        name: 'Priya Sharma',
        phone: '+919876543210',
        line1: '42, MG Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        stateCode: '08',
        pincode: '302001',
      });
      expect(addr.name).toBe('Priya Sharma');
      expect(addr.country).toBe('IN');
    });
  });

  describe('PaginationInput', () => {
    it('applies defaults', () => {
      const p = PaginationInput.parse({});
      expect(p.page).toBe(1);
      expect(p.limit).toBe(20);
    });

    it('rejects invalid values', () => {
      expect(() => PaginationInput.parse({ page: 0 })).toThrow();
      expect(() => PaginationInput.parse({ limit: 200 })).toThrow();
    });
  });
});

describe('Store Schemas', () => {
  it('validates CreateStoreInput', () => {
    const input = CreateStoreInput.parse({
      name: 'Priya Silks',
      slug: 'priya-silks',
      vertical: 'fashion',
    });
    expect(input.name).toBe('Priya Silks');
    expect(input.vertical).toBe('fashion');
  });

  it('rejects invalid slug', () => {
    expect(() => CreateStoreInput.parse({
      name: 'Test',
      slug: 'Has Spaces',
      vertical: 'fashion',
    })).toThrow();
  });

  it('validates all verticals', () => {
    const verticals = ['fashion', 'fmcg', 'electronics', 'jewellery', 'beauty', 'food', 'home_decor', 'general'];
    for (const v of verticals) {
      expect(Vertical.parse(v)).toBe(v);
    }
  });

  it('validates all store statuses', () => {
    const statuses = ['onboarding', 'active', 'paused', 'suspended'];
    for (const s of statuses) {
      expect(StoreStatus.parse(s)).toBe(s);
    }
  });
});

describe('Product Schemas', () => {
  it('validates CreateProductInput', () => {
    const input = CreateProductInput.parse({
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Red Silk Saree',
      price: 2500,
      tags: ['silk', 'wedding', 'red'],
    });
    expect(input.name).toBe('Red Silk Saree');
    expect(input.status).toBe('draft');
    expect(input.tags).toHaveLength(3);
  });

  it('rejects negative price', () => {
    expect(() => CreateProductInput.parse({
      storeId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      price: -100,
    })).toThrow();
  });
});

describe('Order Schemas', () => {
  it('validates all order statuses', () => {
    const statuses = [
      'created', 'payment_pending', 'paid', 'cod_confirmed', 'cod_otp_verified',
      'processing', 'shipped', 'out_for_delivery', 'delivered',
      'cancelled', 'refunded', 'rto',
    ];
    for (const s of statuses) {
      expect(OrderStatus.parse(s)).toBe(s);
    }
  });

  it('has valid state transitions', () => {
    // created can go to payment_pending, cod_confirmed, cancelled
    expect(ORDER_TRANSITIONS['created']).toContain('payment_pending');
    expect(ORDER_TRANSITIONS['created']).toContain('cod_confirmed');
    expect(ORDER_TRANSITIONS['created']).toContain('cancelled');

    // delivered can only go to refunded
    expect(ORDER_TRANSITIONS['delivered']).toEqual(['refunded']);

    // terminal states have no transitions
    expect(ORDER_TRANSITIONS['cancelled']).toEqual([]);
    expect(ORDER_TRANSITIONS['refunded']).toEqual([]);
    expect(ORDER_TRANSITIONS['rto']).toEqual([]);
  });

  it('COD flow transitions are valid', () => {
    expect(ORDER_TRANSITIONS['created']).toContain('cod_confirmed');
    expect(ORDER_TRANSITIONS['cod_confirmed']).toContain('cod_otp_verified');
    expect(ORDER_TRANSITIONS['cod_otp_verified']).toContain('processing');
  });

  it('validates all payment methods', () => {
    const methods = ['upi', 'card', 'netbanking', 'wallet', 'cod'];
    for (const m of methods) {
      expect(PaymentMethod.parse(m)).toBe(m);
    }
  });
});

describe('GST Calculations', () => {
  it('getGSTRate returns correct rate for sarees under 1000', () => {
    expect(getGSTRate('6211', 800)).toBe(5);
  });

  it('getGSTRate returns higher rate for sarees over 1000', () => {
    expect(getGSTRate('6211', 2500)).toBe(12);
  });

  it('getGSTRate returns 18% for electronics', () => {
    expect(getGSTRate('8517', 15000)).toBe(18);
  });

  it('getGSTRate returns 3% for gold jewellery', () => {
    expect(getGSTRate('7113', 50000)).toBe(3);
  });

  it('getGSTRate returns 18% default for unknown HSN', () => {
    expect(getGSTRate('9999', 1000)).toBe(18);
  });

  describe('calculateGST', () => {
    it('intra-state: splits into CGST + SGST', () => {
      // Same state (Rajasthan 08 → Rajasthan 08), 12% on ₹2500
      const result = calculateGST(2500, 12, '08', '08');
      expect(result.isInterState).toBe(false);
      expect(result.totalTax).toBe(300);
      expect(result.cgst).toBe(150);
      expect(result.sgst).toBe(150);
      expect(result.igst).toBe(0);
    });

    it('inter-state: full IGST', () => {
      // Rajasthan 08 → Maharashtra 27, 12% on ₹2500
      const result = calculateGST(2500, 12, '08', '27');
      expect(result.isInterState).toBe(true);
      expect(result.totalTax).toBe(300);
      expect(result.igst).toBe(300);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });

    it('handles odd paisa amounts correctly', () => {
      // 5% on ₹999 = ₹49.95
      const result = calculateGST(999, 5, '08', '08');
      expect(result.totalTax).toBe(49.95);
      expect(result.cgst + result.sgst).toBeCloseTo(49.95, 2);
    });

    it('handles zero tax', () => {
      const result = calculateGST(1000, 0, '08', '27');
      expect(result.totalTax).toBe(0);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(0);
    });
  });
});
