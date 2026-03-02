// ============================================================
// Store Design Archetypes
//
// Pre-defined design configurations for each vertical.
// The AI uses these as a starting palette, then customizes
// based on the specific product photos and seller context.
//
// Each vertical has 2-3 archetypes covering different
// price tiers and brand personalities. The AI picks one
// based on seller context (audience, price range, brand vibe)
// then adjusts colors from the actual product photos.
//
// Archetype selection flow:
// 1. Seller context → selectArchetype() picks best fit
// 2. AI gets archetype as a "starting point" in its prompt
// 3. AI overrides palette colors based on product photos
// 4. WCAG validator fixes any contrast issues
// ============================================================

export interface Archetype {
  id: string;
  name: string;
  vertical: string;
  /** What kind of seller this fits — used for matching */
  fit: {
    audiences: string[];       // "college girls", "professionals", etc.
    priceFloor: number;        // Min price range this archetype suits
    priceCeiling: number;      // Max price range
    vibes: string[];           // "luxury", "minimal", "fun", "traditional"
  };
  /** The design tokens this archetype provides */
  design: {
    layout: string;
    palette: {
      mode: 'generated';
      seed: string;
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      textMuted: string;
    };
    fonts: { display: string; body: string; scale: number };
    hero: { style: string; height: string; overlayOpacity: number };
    productCard: { style: string; showPrice: boolean; showRating: boolean; imageRatio: string };
    nav: { style: string; showSearch: boolean; showCart: boolean; showWhatsapp: boolean };
    collection: { style: string; columns: { mobile: number; desktop: number }; pagination: string };
    spacing: string;
    radius: string;
    imageStyle: string;
    animation: string;
  };
}

// ============================================================
// Fashion Archetypes
// ============================================================

const FASHION_LUXURY: Archetype = {
  id: 'fashion-luxury',
  name: 'Luxury Fashion',
  vertical: 'fashion',
  fit: {
    audiences: ['professionals', 'women', 'luxury', 'wedding', 'premium'],
    priceFloor: 2000,
    priceCeiling: 50000,
    vibes: ['luxury', 'premium', 'elegant', 'sophisticated'],
  },
  design: {
    layout: 'editorial',
    palette: {
      mode: 'generated',
      seed: '#8B6F47',
      primary: '#8B6F47',
      secondary: '#F5EDE3',
      accent: '#C9956B',
      background: '#FEFCF9',
      surface: '#F8F4EF',
      text: '#2C2420',
      textMuted: '#7A706A',
    },
    fonts: { display: 'Cormorant Garamond', body: 'DM Sans', scale: 1.05 },
    hero: { style: 'full_bleed', height: 'full', overlayOpacity: 0.35 },
    productCard: { style: 'editorial', showPrice: true, showRating: false, imageRatio: '3:4' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'lookbook', columns: { mobile: 2, desktop: 3 }, pagination: 'infinite_scroll' },
    spacing: 'airy',
    radius: 'subtle',
    imageStyle: 'subtle_shadow',
    animation: 'fade',
  },
};

const FASHION_TRENDY: Archetype = {
  id: 'fashion-trendy',
  name: 'Trendy Youth Fashion',
  vertical: 'fashion',
  fit: {
    audiences: ['college', 'youth', 'girls', 'teenagers', 'students', 'young'],
    priceFloor: 300,
    priceCeiling: 3000,
    vibes: ['fun', 'trendy', 'colorful', 'bold', 'modern'],
  },
  design: {
    layout: 'magazine',
    palette: {
      mode: 'generated',
      seed: '#E94560',
      primary: '#E94560',
      secondary: '#FFF0F3',
      accent: '#FF6B6B',
      background: '#FFFAF5',
      surface: '#FFF5F5',
      text: '#1A1A2E',
      textMuted: '#6B6B80',
    },
    fonts: { display: 'Plus Jakarta Sans', body: 'Inter', scale: 1.0 },
    hero: { style: 'split_image', height: 'half', overlayOpacity: 0.2 },
    productCard: { style: 'hover_reveal', showPrice: true, showRating: false, imageRatio: '3:4' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 4 }, pagination: 'infinite_scroll' },
    spacing: 'balanced',
    radius: 'rounded',
    imageStyle: 'hover_zoom',
    animation: 'staggered',
  },
};

const FASHION_TRADITIONAL: Archetype = {
  id: 'fashion-traditional',
  name: 'Traditional / Ethnic Wear',
  vertical: 'fashion',
  fit: {
    audiences: ['mothers', 'traditional', 'ethnic', 'saree', 'festival', 'wedding'],
    priceFloor: 500,
    priceCeiling: 15000,
    vibes: ['traditional', 'ethnic', 'rich', 'festive', 'warm'],
  },
  design: {
    layout: 'boutique',
    palette: {
      mode: 'generated',
      seed: '#8B1A1A',
      primary: '#8B1A1A',
      secondary: '#FFF5E6',
      accent: '#D4956A',
      background: '#FFFDF5',
      surface: '#FFF8ED',
      text: '#2C1810',
      textMuted: '#7A6860',
    },
    fonts: { display: 'Playfair Display', body: 'Lora', scale: 1.0 },
    hero: { style: 'full_bleed', height: 'full', overlayOpacity: 0.4 },
    productCard: { style: 'editorial', showPrice: true, showRating: false, imageRatio: '3:4' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'masonry', columns: { mobile: 2, desktop: 3 }, pagination: 'paginated' },
    spacing: 'airy',
    radius: 'subtle',
    imageStyle: 'border_frame',
    animation: 'fade',
  },
};

// ============================================================
// Jewellery Archetypes
// ============================================================

const JEWELLERY_PREMIUM: Archetype = {
  id: 'jewellery-premium',
  name: 'Premium Jewellery',
  vertical: 'jewellery',
  fit: {
    audiences: ['women', 'brides', 'luxury', 'wedding', 'premium', 'professionals'],
    priceFloor: 1000,
    priceCeiling: 100000,
    vibes: ['luxury', 'elegant', 'premium', 'rich'],
  },
  design: {
    layout: 'boutique',
    palette: {
      mode: 'generated',
      seed: '#C9A84C',
      primary: '#C9A84C',
      secondary: '#1A1A2E',
      accent: '#E8D5A3',
      background: '#0F0F1A',
      surface: '#1A1A2E',
      text: '#F5F0E8',
      textMuted: '#B0A898',
    },
    fonts: { display: 'Cormorant Garamond', body: 'DM Sans', scale: 1.0 },
    hero: { style: 'full_bleed', height: 'full', overlayOpacity: 0.5 },
    productCard: { style: 'minimal', showPrice: true, showRating: false, imageRatio: '1:1' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 3 }, pagination: 'paginated' },
    spacing: 'airy',
    radius: 'sharp',
    imageStyle: 'subtle_shadow',
    animation: 'fade',
  },
};

const JEWELLERY_AFFORDABLE: Archetype = {
  id: 'jewellery-affordable',
  name: 'Affordable / Oxidized Jewellery',
  vertical: 'jewellery',
  fit: {
    audiences: ['college', 'girls', 'daily', 'casual', 'students', 'young'],
    priceFloor: 100,
    priceCeiling: 2000,
    vibes: ['fun', 'bohemian', 'casual', 'trendy'],
  },
  design: {
    layout: 'catalog_grid',
    palette: {
      mode: 'generated',
      seed: '#8B6F47',
      primary: '#8B6F47',
      secondary: '#F5EDE3',
      accent: '#C49B6C',
      background: '#FEFCF8',
      surface: '#F8F3EB',
      text: '#2C2420',
      textMuted: '#7A706A',
    },
    fonts: { display: 'Outfit', body: 'Inter', scale: 1.0 },
    hero: { style: 'split_image', height: 'half', overlayOpacity: 0.2 },
    productCard: { style: 'compact', showPrice: true, showRating: false, imageRatio: '1:1' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 4 }, pagination: 'infinite_scroll' },
    spacing: 'balanced',
    radius: 'rounded',
    imageStyle: 'rounded',
    animation: 'staggered',
  },
};

// ============================================================
// Electronics Archetype
// ============================================================

const ELECTRONICS_DEFAULT: Archetype = {
  id: 'electronics-default',
  name: 'Electronics / Gadgets',
  vertical: 'electronics',
  fit: {
    audiences: ['tech', 'gadget', 'men', 'professionals', 'gamers'],
    priceFloor: 200,
    priceCeiling: 100000,
    vibes: ['modern', 'clean', 'tech', 'minimal'],
  },
  design: {
    layout: 'catalog_grid',
    palette: {
      mode: 'generated',
      seed: '#2563EB',
      primary: '#2563EB',
      secondary: '#EFF6FF',
      accent: '#3B82F6',
      background: '#FAFBFC',
      surface: '#F1F5F9',
      text: '#0F172A',
      textMuted: '#64748B',
    },
    fonts: { display: 'Space Grotesk', body: 'Inter', scale: 1.0 },
    hero: { style: 'minimal_text', height: 'auto', overlayOpacity: 0.0 },
    productCard: { style: 'compact', showPrice: true, showRating: true, imageRatio: '1:1' },
    nav: { style: 'search_first', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'filterable_sidebar', columns: { mobile: 2, desktop: 4 }, pagination: 'paginated' },
    spacing: 'compact',
    radius: 'sharp',
    imageStyle: 'raw',
    animation: 'none',
  },
};

// ============================================================
// Beauty Archetype
// ============================================================

const BEAUTY_DEFAULT: Archetype = {
  id: 'beauty-default',
  name: 'Beauty / Skincare',
  vertical: 'beauty',
  fit: {
    audiences: ['women', 'girls', 'beauty', 'skincare', 'self-care'],
    priceFloor: 200,
    priceCeiling: 10000,
    vibes: ['soft', 'clean', 'pastel', 'natural', 'gentle'],
  },
  design: {
    layout: 'minimal',
    palette: {
      mode: 'generated',
      seed: '#E8B4B8',
      primary: '#D4898F',
      secondary: '#FFF5F5',
      accent: '#E8B4B8',
      background: '#FFFBFB',
      surface: '#FFF5F5',
      text: '#3D2B2F',
      textMuted: '#8B7175',
    },
    fonts: { display: 'Outfit', body: 'DM Sans', scale: 1.0 },
    hero: { style: 'gradient', height: 'half', overlayOpacity: 0.0 },
    productCard: { style: 'minimal', showPrice: true, showRating: true, imageRatio: '1:1' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 3 }, pagination: 'infinite_scroll' },
    spacing: 'airy',
    radius: 'pill',
    imageStyle: 'rounded',
    animation: 'fade',
  },
};

// ============================================================
// Food Archetype
// ============================================================

const FOOD_DEFAULT: Archetype = {
  id: 'food-default',
  name: 'Food / Snacks / Grocery',
  vertical: 'food',
  fit: {
    audiences: ['families', 'foodies', 'health', 'mothers', 'home'],
    priceFloor: 50,
    priceCeiling: 5000,
    vibes: ['warm', 'earthy', 'natural', 'homemade', 'organic'],
  },
  design: {
    layout: 'minimal',
    palette: {
      mode: 'generated',
      seed: '#B8860B',
      primary: '#B8860B',
      secondary: '#FFF8E7',
      accent: '#D4A34A',
      background: '#FFFDF5',
      surface: '#FFF9ED',
      text: '#2C2410',
      textMuted: '#7A6F5A',
    },
    fonts: { display: 'Outfit', body: 'DM Sans', scale: 1.0 },
    hero: { style: 'split_image', height: 'half', overlayOpacity: 0.2 },
    productCard: { style: 'minimal', showPrice: true, showRating: false, imageRatio: '1:1' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 3 }, pagination: 'infinite_scroll' },
    spacing: 'balanced',
    radius: 'rounded',
    imageStyle: 'rounded',
    animation: 'staggered',
  },
};

// ============================================================
// Home Decor Archetype
// ============================================================

const HOME_DECOR_DEFAULT: Archetype = {
  id: 'home-decor-default',
  name: 'Home Decor / Furniture',
  vertical: 'home_decor',
  fit: {
    audiences: ['homeowners', 'couples', 'interior', 'families', 'professionals'],
    priceFloor: 300,
    priceCeiling: 50000,
    vibes: ['natural', 'earthy', 'elegant', 'warm', 'minimalist'],
  },
  design: {
    layout: 'magazine',
    palette: {
      mode: 'generated',
      seed: '#6B7B5E',
      primary: '#6B7B5E',
      secondary: '#F5F2ED',
      accent: '#A3956B',
      background: '#FAFAF5',
      surface: '#F5F2ED',
      text: '#2C2C25',
      textMuted: '#7A7A6D',
    },
    fonts: { display: 'Cormorant Garamond', body: 'Inter', scale: 1.0 },
    hero: { style: 'full_bleed', height: 'full', overlayOpacity: 0.3 },
    productCard: { style: 'editorial', showPrice: true, showRating: false, imageRatio: '4:3' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'masonry', columns: { mobile: 2, desktop: 3 }, pagination: 'infinite_scroll' },
    spacing: 'airy',
    radius: 'subtle',
    imageStyle: 'subtle_shadow',
    animation: 'fade',
  },
};

// ============================================================
// General / Fallback Archetype
// ============================================================

const GENERAL_DEFAULT: Archetype = {
  id: 'general-default',
  name: 'General Store',
  vertical: 'general',
  fit: {
    audiences: [],
    priceFloor: 0,
    priceCeiling: 100000,
    vibes: [],
  },
  design: {
    layout: 'minimal',
    palette: {
      mode: 'generated',
      seed: '#D4356A',
      primary: '#D4356A',
      secondary: '#F8E8EE',
      accent: '#8B1A3A',
      background: '#FFFAF5',
      surface: '#FFF5EE',
      text: '#1A1A2E',
      textMuted: '#6B6B80',
    },
    fonts: { display: 'Playfair Display', body: 'DM Sans', scale: 1.0 },
    hero: { style: 'full_bleed', height: 'half', overlayOpacity: 0.3 },
    productCard: { style: 'minimal', showPrice: true, showRating: false, imageRatio: '3:4' },
    nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
    collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 4 }, pagination: 'infinite_scroll' },
    spacing: 'balanced',
    radius: 'subtle',
    imageStyle: 'subtle_shadow',
    animation: 'fade',
  },
};

// ============================================================
// Registry
// ============================================================

const ALL_ARCHETYPES: Archetype[] = [
  FASHION_LUXURY,
  FASHION_TRENDY,
  FASHION_TRADITIONAL,
  JEWELLERY_PREMIUM,
  JEWELLERY_AFFORDABLE,
  ELECTRONICS_DEFAULT,
  BEAUTY_DEFAULT,
  FOOD_DEFAULT,
  HOME_DECOR_DEFAULT,
  GENERAL_DEFAULT,
];

// ============================================================
// Selection Logic
// ============================================================

/**
 * Select the best archetype for a given vertical + seller context.
 * Scoring: audience keyword match + price range overlap + vibe match.
 */
export function selectArchetype(
  vertical: string,
  sellerContext?: {
    audience?: string;
    priceRange?: { min: number; max: number };
    brandVibe?: string;
  },
): Archetype {
  // Filter to matching vertical
  const candidates = ALL_ARCHETYPES.filter((a) => a.vertical === vertical);
  if (candidates.length === 0) return GENERAL_DEFAULT;
  if (candidates.length === 1) return candidates[0]!;
  if (!sellerContext) return candidates[0]!;

  let bestScore = -1;
  let bestArchetype = candidates[0]!;

  for (const archetype of candidates) {
    let score = 0;

    // Audience keyword matching
    if (sellerContext.audience) {
      const audienceWords = sellerContext.audience.toLowerCase().split(/\s+/);
      for (const word of audienceWords) {
        if (archetype.fit.audiences.some((a) => a.includes(word) || word.includes(a))) {
          score += 3;
        }
      }
    }

    // Price range overlap
    if (sellerContext.priceRange) {
      const { min, max } = sellerContext.priceRange;
      const overlapMin = Math.max(min, archetype.fit.priceFloor);
      const overlapMax = Math.min(max, archetype.fit.priceCeiling);
      if (overlapMin <= overlapMax) {
        // Normalize overlap to 0-5 score
        const overlapRange = overlapMax - overlapMin;
        const totalRange = max - min || 1;
        score += Math.min(5, (overlapRange / totalRange) * 5);
      }
    }

    // Brand vibe matching
    if (sellerContext.brandVibe) {
      const vibeWords = sellerContext.brandVibe.toLowerCase().split(/\s+/);
      for (const word of vibeWords) {
        if (archetype.fit.vibes.some((v) => v.includes(word) || word.includes(v))) {
          score += 2;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  }

  return bestArchetype;
}

/**
 * Get all archetypes for a vertical (for UI display or testing).
 */
export function getArchetypesForVertical(vertical: string): Archetype[] {
  return ALL_ARCHETYPES.filter((a) => a.vertical === vertical);
}

/**
 * Get an archetype by ID.
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ALL_ARCHETYPES.find((a) => a.id === id);
}
