// ============================================================
// Vertical Definitions
// Each vertical is a pluggable module with its own schema,
// variant types, HSN defaults, and display components.
// ============================================================

export interface VerticalDefinition {
  id: string;
  name: string;
  description: string;
  variantAttributes: string[];     // What constitutes a variant (size, color, weight, etc.)
  defaultHsnCode: string;
  defaultGstRate: number;
  requiredProductFields: string[]; // Fields the seller must fill
  optionalProductFields: string[]; // Nice-to-have fields
  sampleCategories: string[];      // Seed categories for onboarding
}

export const VERTICALS: Record<string, VerticalDefinition> = {
  fashion: {
    id: 'fashion',
    name: 'Fashion & Clothing',
    description: 'Apparel, footwear, accessories',
    variantAttributes: ['size', 'color'],
    defaultHsnCode: '6211',
    defaultGstRate: 5,
    requiredProductFields: ['name', 'price', 'images'],
    optionalProductFields: ['fabric', 'care_instructions', 'occasion', 'fit_type', 'sleeve_type'],
    sampleCategories: ['Sarees', 'Kurtis', 'Lehengas', 'Shirts', 'Trousers', 'Dupattas', 'Accessories'],
  },

  jewellery: {
    id: 'jewellery',
    name: 'Jewellery',
    description: 'Gold, silver, imitation jewellery',
    variantAttributes: ['size', 'material', 'weight'],
    defaultHsnCode: '7117',
    defaultGstRate: 12,
    requiredProductFields: ['name', 'price', 'images', 'material'],
    optionalProductFields: ['weight', 'purity', 'certification', 'stone_type'],
    sampleCategories: ['Necklaces', 'Earrings', 'Bangles', 'Rings', 'Bracelets', 'Anklets', 'Sets'],
  },

  electronics: {
    id: 'electronics',
    name: 'Electronics & Gadgets',
    description: 'Phones, accessories, gadgets',
    variantAttributes: ['color', 'storage', 'ram'],
    defaultHsnCode: '8517',
    defaultGstRate: 18,
    requiredProductFields: ['name', 'price', 'images', 'brand'],
    optionalProductFields: ['model_number', 'warranty', 'specs', 'compatibility'],
    sampleCategories: ['Phone Cases', 'Chargers', 'Earphones', 'Cables', 'Screen Guards', 'Speakers'],
  },

  beauty: {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    description: 'Cosmetics, skincare, haircare',
    variantAttributes: ['shade', 'size'],
    defaultHsnCode: '3304',
    defaultGstRate: 18,
    requiredProductFields: ['name', 'price', 'images'],
    optionalProductFields: ['ingredients', 'skin_type', 'usage_instructions', 'shelf_life'],
    sampleCategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrances', 'Bath & Body', 'Nail Care'],
  },

  fmcg: {
    id: 'fmcg',
    name: 'Food & Grocery',
    description: 'Packaged food, grocery, organic',
    variantAttributes: ['weight', 'quantity'],
    defaultHsnCode: '2106',
    defaultGstRate: 12,
    requiredProductFields: ['name', 'price', 'images', 'weight'],
    optionalProductFields: ['ingredients', 'nutrition_info', 'shelf_life', 'allergens', 'veg_nonveg'],
    sampleCategories: ['Spices', 'Snacks', 'Pickles', 'Sweets', 'Dry Fruits', 'Beverages', 'Organic'],
  },

  home_decor: {
    id: 'home_decor',
    name: 'Home & Decor',
    description: 'Furniture, decor, furnishings',
    variantAttributes: ['size', 'color', 'material'],
    defaultHsnCode: '9403',
    defaultGstRate: 18,
    requiredProductFields: ['name', 'price', 'images'],
    optionalProductFields: ['dimensions', 'material', 'assembly_required', 'care_instructions'],
    sampleCategories: ['Wall Decor', 'Cushions', 'Curtains', 'Rugs', 'Candles', 'Vases', 'Frames'],
  },

  general: {
    id: 'general',
    name: 'General Store',
    description: 'Multi-category or uncategorized',
    variantAttributes: ['size', 'color', 'type'],
    defaultHsnCode: '9999',
    defaultGstRate: 18,
    requiredProductFields: ['name', 'price', 'images'],
    optionalProductFields: [],
    sampleCategories: ['Featured', 'New Arrivals', 'Sale', 'Bestsellers'],
  },
};

export function getVertical(id: string): VerticalDefinition {
  return VERTICALS[id] ?? VERTICALS['general']!;
}
