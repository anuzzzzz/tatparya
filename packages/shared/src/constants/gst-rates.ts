// ============================================================
// GST Rate Lookup Table
// HSN Code → GST Rate mapping for common product categories
// Used by pricing engine and invoice generation
// ============================================================

export interface GSTRateEntry {
  hsnCode: string;
  description: string;
  rate: number;          // GST rate as percentage (5, 12, 18, 28)
  thresholdAmount?: number; // For items where rate changes above a price (e.g. clothing)
  rateAboveThreshold?: number;
}

/**
 * Common GST rates for Indian e-commerce verticals.
 * Clothing under ₹1000 = 5%, above ₹1000 = 12%
 * Jewellery = 3%
 * Electronics mostly 18%
 * Food items vary: 0%, 5%, 12%
 */
export const GST_RATES: GSTRateEntry[] = [
  // Fashion & Clothing
  { hsnCode: '6106', description: 'Knitted garments (women)', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6109', description: 'T-shirts, vests (knitted)', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6204', description: 'Women suits, dresses, skirts', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6206', description: 'Women blouses, shirts', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6211', description: 'Sarees, dhotis', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6205', description: 'Men shirts', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6203', description: 'Men suits, trousers', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 12 },
  { hsnCode: '6402', description: 'Footwear (>₹1000)', rate: 18 },
  { hsnCode: '6404', description: 'Footwear (≤₹1000)', rate: 5, thresholdAmount: 1000, rateAboveThreshold: 18 },

  // Jewellery
  { hsnCode: '7113', description: 'Gold/silver jewellery', rate: 3 },
  { hsnCode: '7117', description: 'Imitation jewellery', rate: 12 },

  // Electronics
  { hsnCode: '8517', description: 'Mobile phones, smartphones', rate: 18 },
  { hsnCode: '8471', description: 'Laptops, computers', rate: 18 },
  { hsnCode: '8518', description: 'Headphones, speakers', rate: 18 },
  { hsnCode: '8504', description: 'Chargers, power banks', rate: 18 },
  { hsnCode: '8528', description: 'Monitors, TVs', rate: 18 },

  // Beauty & Personal Care
  { hsnCode: '3304', description: 'Cosmetics, makeup', rate: 18 },
  { hsnCode: '3305', description: 'Hair care products', rate: 18 },
  { hsnCode: '3401', description: 'Soap, body wash', rate: 18 },

  // Food & FMCG
  { hsnCode: '0901', description: 'Coffee, tea', rate: 5 },
  { hsnCode: '1006', description: 'Rice', rate: 5 },
  { hsnCode: '1905', description: 'Bread, biscuits, cakes', rate: 18 },
  { hsnCode: '2106', description: 'Packaged food preparations', rate: 18 },
  { hsnCode: '0402', description: 'Milk products (packaged)', rate: 5 },

  // Home & Decor
  { hsnCode: '6302', description: 'Bed linen, curtains', rate: 12 },
  { hsnCode: '6911', description: 'Ceramic tableware', rate: 12 },
  { hsnCode: '9403', description: 'Furniture', rate: 18 },

  // Shipping (service)
  { hsnCode: '9965', description: 'Goods transport (courier/shipping)', rate: 18 },
];

/**
 * Get GST rate for a product given its HSN code and unit price
 */
export function getGSTRate(hsnCode: string, unitPrice: number): number {
  const entry = GST_RATES.find((r) => r.hsnCode === hsnCode);
  if (!entry) return 18; // Default to 18% if HSN not found

  if (entry.thresholdAmount && entry.rateAboveThreshold && unitPrice > entry.thresholdAmount) {
    return entry.rateAboveThreshold;
  }

  return entry.rate;
}

/**
 * Calculate GST split based on seller state vs buyer state
 * Same state = CGST + SGST (each = rate/2)
 * Different state = IGST (= full rate)
 */
export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  sellerStateCode: string,
  buyerStateCode: string
): { cgst: number; sgst: number; igst: number; totalTax: number; isInterState: boolean } {
  const isInterState = sellerStateCode !== buyerStateCode;
  const totalTax = Math.round((taxableAmount * gstRate) / 100 * 100) / 100;

  if (isInterState) {
    return { cgst: 0, sgst: 0, igst: totalTax, totalTax, isInterState };
  }

  const halfTax = Math.round((totalTax / 2) * 100) / 100;
  // Handle rounding: if total is odd paisa, add extra to CGST
  const cgst = halfTax;
  const sgst = Math.round((totalTax - halfTax) * 100) / 100;

  return { cgst, sgst, igst: 0, totalTax, isInterState };
}
