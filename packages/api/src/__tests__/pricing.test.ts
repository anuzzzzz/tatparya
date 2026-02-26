import { describe, it, expect } from 'vitest';
import { getGSTRate, calculateGST } from '@tatparya/shared';

describe('Pricing & GST', () => {
  describe('GST Rate Lookup', () => {
    it('fashion: saree under ₹1000 = 5%', () => {
      expect(getGSTRate('6211', 800)).toBe(5);
    });

    it('fashion: saree over ₹1000 = 12%', () => {
      expect(getGSTRate('6211', 2500)).toBe(12);
    });

    it('fashion: saree at exactly ₹1000 = 5% (threshold is exclusive)', () => {
      expect(getGSTRate('6211', 1000)).toBe(5);
    });

    it('jewellery: gold = 3%', () => {
      expect(getGSTRate('7113', 50000)).toBe(3);
    });

    it('jewellery: imitation = 12%', () => {
      expect(getGSTRate('7117', 500)).toBe(12);
    });

    it('electronics: mobile = 18%', () => {
      expect(getGSTRate('8517', 15000)).toBe(18);
    });

    it('food: tea/coffee = 5%', () => {
      expect(getGSTRate('0901', 200)).toBe(5);
    });

    it('shipping = 18%', () => {
      expect(getGSTRate('9965', 100)).toBe(18);
    });

    it('unknown HSN defaults to 18%', () => {
      expect(getGSTRate('0000', 1000)).toBe(18);
    });
  });

  describe('GST Split Calculation', () => {
    it('intra-state (same state): CGST + SGST', () => {
      // Rajasthan seller → Rajasthan buyer, 12% on ₹5000
      const result = calculateGST(5000, 12, '08', '08');
      expect(result.isInterState).toBe(false);
      expect(result.totalTax).toBe(600);
      expect(result.cgst).toBe(300);
      expect(result.sgst).toBe(300);
      expect(result.igst).toBe(0);
    });

    it('inter-state (different states): IGST only', () => {
      // Rajasthan seller → Maharashtra buyer, 12% on ₹5000
      const result = calculateGST(5000, 12, '08', '27');
      expect(result.isInterState).toBe(true);
      expect(result.totalTax).toBe(600);
      expect(result.igst).toBe(600);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });

    it('handles 5% rate correctly', () => {
      // 5% on ₹800 = ₹40
      const result = calculateGST(800, 5, '08', '08');
      expect(result.totalTax).toBe(40);
      expect(result.cgst).toBe(20);
      expect(result.sgst).toBe(20);
    });

    it('handles 3% rate (gold)', () => {
      // 3% on ₹50000 = ₹1500
      const result = calculateGST(50000, 3, '08', '27');
      expect(result.totalTax).toBe(1500);
      expect(result.igst).toBe(1500);
    });

    it('handles zero amount', () => {
      const result = calculateGST(0, 18, '08', '27');
      expect(result.totalTax).toBe(0);
    });

    it('handles zero rate', () => {
      const result = calculateGST(10000, 0, '08', '08');
      expect(result.totalTax).toBe(0);
    });

    it('shipping GST is always 18%', () => {
      // Intra-state shipping
      const intra = calculateGST(100, 18, '08', '08');
      expect(intra.totalTax).toBe(18);
      expect(intra.cgst).toBe(9);
      expect(intra.sgst).toBe(9);

      // Inter-state shipping
      const inter = calculateGST(100, 18, '08', '27');
      expect(inter.totalTax).toBe(18);
      expect(inter.igst).toBe(18);
    });
  });

  describe('Full Order Tax Calculation', () => {
    it('calculates tax for a mixed order', () => {
      // Saree ₹2500 (12%) + Kurti ₹800 (5%), intra-state
      const sareeGst = calculateGST(2500, 12, '08', '08');
      const kurtiGst = calculateGST(800, 5, '08', '08');

      expect(sareeGst.totalTax).toBe(300);
      expect(kurtiGst.totalTax).toBe(40);

      const totalTax = sareeGst.totalTax + kurtiGst.totalTax;
      expect(totalTax).toBe(340);
    });

    it('tax on discounted amount, not original', () => {
      // ₹2500 saree with ₹500 discount = taxable ₹2000 at 12%
      const discountedGst = calculateGST(2000, 12, '08', '08');
      expect(discountedGst.totalTax).toBe(240);
    });
  });
});
