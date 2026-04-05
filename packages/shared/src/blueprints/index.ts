// ============================================================
// Multi-Vertical Blueprint Configs
//
// Derived from frequency analysis of 168 Indian D2C stores.
// Sections appearing in >70% of stores in a vertical are mandatory.
// Each blueprint defines the default homepage section order
// that the AI design pipeline uses as a starting point.
// ============================================================

export type SectionEntry = {
  type: string;
  variant?: string;
  vibeWeight?: number;
  colorIntensity?: 'low' | 'medium' | 'high';
};

export type BlueprintConfig = {
  vertical: string;
  label: string;
  description: string;
  sections: SectionEntry[];
  pdpFeatures?: string[];
};

export const BLUEPRINTS: Record<string, BlueprintConfig> = {
  fashion: {
    vertical: 'fashion',
    label: 'Runway',
    description: 'Bold editorial layouts for fashion & apparel brands',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'marquee' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'product_carousel' },
      { type: 'trust_bar' },
      { type: 'ugc_gallery' },
      { type: 'about_brand' },
      { type: 'testimonial_cards' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['size_chart', 'image_zoom', 'wishlist', 'delivery_estimate'],
  },

  beauty: {
    vertical: 'beauty',
    label: 'Glow',
    description: 'Clean, trust-forward layouts for beauty & skincare brands',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'trust_bar' },
      { type: 'featured_products' },
      { type: 'product_carousel' },
      { type: 'category_grid' },
      { type: 'logo_bar' },
      { type: 'testimonial_cards' },
      { type: 'about_brand' },
      { type: 'video_section' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['ingredients_list', 'image_zoom', 'delivery_estimate', 'ratings'],
  },

  food: {
    vertical: 'food',
    label: 'Harvest',
    description: 'Warm, story-driven layouts for food & artisanal brands',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'marquee' },
      { type: 'trust_bar' },
      { type: 'featured_products' },
      { type: 'about_brand' },
      { type: 'video_section' },
      { type: 'testimonial_cards' },
      { type: 'category_grid' },
      { type: 'logo_bar' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['nutrition_info', 'delivery_estimate', 'bulk_pricing'],
  },

  jewellery: {
    vertical: 'jewellery',
    label: 'Atelier',
    description: 'Luxurious, heritage-inspired layouts for jewellery brands',
    sections: [
      { type: 'hero_bento' },
      { type: 'announcement_bar' },
      { type: 'trust_bar' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'logo_bar' },
      { type: 'about_brand' },
      { type: 'testimonial_cards' },
      { type: 'video_section' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['size_chart', 'image_zoom', 'certification_badge', 'wishlist', 'delivery_estimate'],
  },

  home_decor: {
    vertical: 'home_decor',
    label: 'Habitat',
    description: 'Warm, visual layouts for home & living brands',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'announcement_bar' },
      { type: 'trust_bar' },
      { type: 'hero_bento' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'about_brand' },
      { type: 'testimonial_cards' },
      { type: 'product_carousel' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['dimensions', 'material_info', 'image_zoom', 'delivery_estimate'],
  },

  electronics: {
    vertical: 'electronics',
    label: 'Circuit',
    description: 'Minimal, spec-driven layouts for electronics & gadgets',
    sections: [
      { type: 'hero_minimal' },
      { type: 'announcement_bar' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'product_carousel' },
      { type: 'trust_bar' },
      { type: 'testimonial_cards' },
      { type: 'logo_bar' },
      { type: 'about_brand' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['specs_table', 'warranty_info', 'delivery_estimate', 'comparison'],
  },

  fmcg: {
    vertical: 'fmcg',
    label: 'Essentials',
    description: 'Trust-first, value-driven layouts for FMCG & grocery brands',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'trust_bar' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'marquee' },
      { type: 'product_carousel' },
      { type: 'about_brand' },
      { type: 'testimonial_cards' },
      { type: 'logo_bar' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['ingredients_list', 'nutrition_info', 'delivery_estimate', 'bulk_pricing'],
  },

  general: {
    vertical: 'general',
    label: 'Foundation',
    description: 'Balanced, versatile layouts for multi-category stores',
    sections: [
      { type: 'hero_slideshow' },
      { type: 'trust_bar' },
      { type: 'featured_products' },
      { type: 'about_brand' },
      { type: 'category_grid' },
      { type: 'product_carousel' },
      { type: 'testimonial_cards' },
      { type: 'newsletter' },
      { type: 'logo_bar' },
      { type: 'ugc_gallery' },
    ],
    pdpFeatures: ['image_zoom', 'delivery_estimate', 'wishlist'],
  },

  pets: {
    vertical: 'pets',
    label: 'Companion',
    description: 'Playful, community-driven layouts for pet brands',
    sections: [
      { type: 'hero_minimal' },
      { type: 'trust_bar' },
      { type: 'logo_bar' },
      { type: 'featured_products' },
      { type: 'category_grid' },
      { type: 'testimonial_cards' },
      { type: 'about_brand' },
      { type: 'ugc_gallery' },
      { type: 'collection_banner' },
      { type: 'newsletter' },
    ],
    pdpFeatures: ['weight_info', 'delivery_estimate', 'bulk_pricing'],
  },
} as const;

/**
 * Get the blueprint config for a vertical, falling back to GENERAL.
 */
export function getBlueprint(vertical: string): BlueprintConfig {
  return BLUEPRINTS[vertical] ?? BLUEPRINTS['general']!;
}
