import { getGSTRate, calculateGST } from '@tatparya/shared';
import type { DiscountRepository } from '../repositories/discount.repository.js';

// ============================================================
// Pricing Service
// Handles discount validation and GST calculation
// ============================================================

export class PricingService {
  constructor(private discountRepo: DiscountRepository) {}

  /**
   * Validate a discount code and return the discount amount
   */
  async validateDiscount(storeId: string, code: string, orderTotal: number): Promise<{
    valid: boolean;
    discountAmount: number;
    message: string;
    discountId?: string;
  }> {
    const discount = await this.discountRepo.findByCode(storeId, code);

    if (!discount) {
      return { valid: false, discountAmount: 0, message: 'Invalid discount code' };
    }

    const now = new Date();

    if (!discount.active) {
      return { valid: false, discountAmount: 0, message: 'This discount is no longer active' };
    }
    if (new Date(discount.startsAt) > now) {
      return { valid: false, discountAmount: 0, message: 'This discount has not started yet' };
    }
    if (discount.endsAt && new Date(discount.endsAt) < now) {
      return { valid: false, discountAmount: 0, message: 'This discount has expired' };
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'This discount has reached its usage limit' };
    }
    if (discount.minOrderValue && orderTotal < discount.minOrderValue) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum order of ₹${discount.minOrderValue} required`,
      };
    }

    let amount = 0;
    switch (discount.type) {
      case 'percentage':
        amount = (orderTotal * discount.value) / 100;
        break;
      case 'flat':
        amount = discount.value;
        break;
    }

    if (discount.maxDiscount && amount > discount.maxDiscount) {
      amount = discount.maxDiscount;
    }
    if (amount > orderTotal) {
      amount = orderTotal;
    }

    amount = Math.round(amount * 100) / 100;

    return {
      valid: true,
      discountAmount: amount,
      message: discount.type === 'percentage'
        ? `${discount.value}% off — you save ₹${amount}`
        : `₹${amount} off applied`,
      discountId: discount.id,
    };
  }

  /**
   * Calculate GST for an order's line items
   */
  calculateOrderTax(
    lineItems: Array<{
      unitPrice: number;
      quantity: number;
      hsnCode?: string;
      gstRate?: number;
    }>,
    sellerStateCode: string,
    buyerStateCode: string,
    discountAmount = 0,
  ): {
    lineItemTaxes: Array<{
      taxableValue: number;
      gstRate: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }>;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
    isInterState: boolean;
  } {
    const isInterState = sellerStateCode !== buyerStateCode;

    // Distribute discount proportionally across line items
    const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineItemTaxes = lineItems.map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const lineDiscount = lineTotal * discountRatio;
      const taxableValue = Math.round((lineTotal - lineDiscount) * 100) / 100;

      const gstRate = item.gstRate || (item.hsnCode ? getGSTRate(item.hsnCode, item.unitPrice) : 18);
      const gst = calculateGST(taxableValue, gstRate, sellerStateCode, buyerStateCode);

      totalCgst += gst.cgst;
      totalSgst += gst.sgst;
      totalIgst += gst.igst;

      return {
        taxableValue,
        gstRate,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        totalTax: gst.totalTax,
      };
    });

    return {
      lineItemTaxes,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalTax: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
      isInterState,
    };
  }

  /**
   * Calculate shipping GST (always 18%)
   */
  calculateShippingTax(
    shippingCost: number,
    sellerStateCode: string,
    buyerStateCode: string,
  ) {
    return calculateGST(shippingCost, 18, sellerStateCode, buyerStateCode);
  }
}
