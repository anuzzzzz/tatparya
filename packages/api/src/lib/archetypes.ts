// ============================================================
// Store Design Archetypes v2 — Composition Library Powered
//
// Replaces the 10 hardcoded archetypes with 75 data-driven
// archetypes extracted from 106 real Shopify stores.
//
// The composition library provides:
//   - Section patterns (type, position, variant, background)
//   - Palette centroids (from real store color analysis)
//   - Typography pairings (from real stores)
//   - 42-dimensional design vectors for similarity matching
//   - Tags (tall-hero, carousel, editorial, etc.)
//
// Drop-in replacement for packages/api/src/lib/archetypes.ts
// Also place composition-library.json in the repo root or data/
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================
// Types
// ============================================================

export interface SectionPattern {
  type: string;
  position: number;
  variant?: string;
  required: boolean;
  background_hint: string;
}

export interface Archetype {
  id: string;
  name: string;
  vertical: string;
  cluster_size: number;
  confidence: number;
  representative_source: string;
  section_pattern: SectionPattern[];
  palette_centroid: {
    avg_gold_proportion: number;
    avg_maroon_proportion: number;
    dark_theme_ratio: number;
  };
  tags: string[];
  quality_score: number;
  vector: number[];
  member_ids: string[];
  fit: {
    audiences: string[];
    priceFloor: number;
    priceCeiling: number;
    vibes: string[];
  };
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

export interface Composition {
  id: string;
  name: string;
  source_url: string;
  source_type: string;
  vertical: string;
  tags: string[];
  quality_score: number;
  effective_score: number;
  sections: SectionPattern[];
  palette_hint: {
    background: string;
    surface: string;
    accent: string;
    proportions: Array<{ hex: string; proportion: number; role: string }>;
    indian_signals: {
      has_gold: boolean;
      gold_proportion: number;
      has_maroon: boolean;
      maroon_proportion: number;
      has_saffron: boolean;
      has_deep_green: boolean;
    };
  };
  typography_hint: {
    heading_font: string;
    body_font: string;
  };
}

interface CompositionLibrary {
  version: string;
  stats: Record<string, any>;
  archetypes: Record<string, any[]>;
  compositions: Composition[];
}

// ============================================================
// Library Loading
// ============================================================

let _library: CompositionLibrary | null = null;
let _archetypes: Archetype[] = [];
let _compositions: Composition[] = [];

function loadLibrary(): CompositionLibrary | null {
  if (_library) return _library;

  const searchPaths = [
    join(process.cwd(), 'composition-library.json'),
    join(process.cwd(), 'data', 'composition-library.json'),
    join(process.cwd(), '..', '..', 'composition-library.json'),
    '/tmp/tatparya-composition-engine/output/composition-library.json',
  ];

  for (const p of searchPaths) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, 'utf-8');
        _library = JSON.parse(raw);
        console.log(`[archetypes] Loaded composition library from ${p}`);
        console.log(`[archetypes] ${_library!.compositions.length} compositions, ${Object.values(_library!.archetypes).flat().length} archetypes`);
        return _library;
      } catch (err) {
        console.error(`[archetypes] Failed to parse ${p}:`, err);
      }
    }
  }

  console.warn('[archetypes] Composition library not found, using hardcoded fallbacks');
  return null;
}

// ============================================================
// Inference helpers
// ============================================================

function inferLayout(tags: string[], sections: SectionPattern[]): string {
  if (tags.includes('editorial')) return 'editorial';
  if (tags.includes('content-rich')) return 'magazine';
  if (tags.includes('minimal-hero')) return 'minimal';
  if (tags.includes('full-bleed-hero')) return 'boutique';
  if (sections.filter(s => s.type.includes('product')).length >= 3) return 'catalog_grid';
  if (sections.length <= 6) return 'minimal';
  return 'magazine';
}

function inferHeroStyle(tags: string[]): { style: string; height: string; overlayOpacity: number } {
  if (tags.includes('full-bleed-hero')) return { style: 'full_bleed', height: 'full', overlayOpacity: 0.35 };
  if (tags.includes('tall-hero')) return { style: 'full_bleed', height: 'full', overlayOpacity: 0.3 };
  if (tags.includes('minimal-hero')) return { style: 'minimal_text', height: 'half', overlayOpacity: 0.1 };
  if (tags.includes('video')) return { style: 'video', height: 'full', overlayOpacity: 0.3 };
  if (tags.includes('slideshow')) return { style: 'carousel', height: 'full', overlayOpacity: 0.25 };
  return { style: 'split_image', height: 'half', overlayOpacity: 0.2 };
}

function inferProductCard(vertical: string, tags: string[]) {
  switch (vertical) {
    case 'fashion': return { style: tags.includes('editorial') ? 'editorial' : 'hover_reveal', showPrice: true, showRating: false, imageRatio: '3:4' };
    case 'jewellery': return { style: 'minimal', showPrice: true, showRating: false, imageRatio: '1:1' };
    case 'beauty': return { style: 'minimal', showPrice: true, showRating: true, imageRatio: '1:1' };
    case 'electronics': return { style: 'compact', showPrice: true, showRating: true, imageRatio: '1:1' };
    case 'food': return { style: 'minimal', showPrice: true, showRating: false, imageRatio: '1:1' };
    case 'home_decor': return { style: 'editorial', showPrice: true, showRating: false, imageRatio: '4:3' };
    case 'pets': return { style: 'hover_reveal', showPrice: true, showRating: true, imageRatio: '1:1' };
    default: return { style: 'minimal', showPrice: true, showRating: false, imageRatio: '3:4' };
  }
}

function inferSpacing(sections: SectionPattern[]): string {
  if (sections.length >= 15) return 'compact';
  if (sections.length >= 10) return 'balanced';
  return 'airy';
}

function inferRadius(vertical: string): string {
  switch (vertical) {
    case 'jewellery': case 'electronics': return 'sharp';
    case 'beauty': return 'pill';
    case 'food': case 'pets': return 'rounded';
    default: return 'subtle';
  }
}

function inferAudiences(vertical: string): string[] {
  const base: Record<string, string[]> = {
    fashion: ['women', 'men', 'youth', 'professionals'],
    jewellery: ['women', 'brides', 'luxury', 'gift'],
    beauty: ['women', 'girls', 'self-care', 'beauty'],
    electronics: ['tech', 'gadget', 'men', 'professionals'],
    food: ['families', 'foodies', 'health', 'home'],
    home_decor: ['homeowners', 'couples', 'interior', 'professionals'],
    pets: ['pet owners', 'dog', 'cat', 'families'],
    general: [],
  };
  return base[vertical] || [];
}

function inferVibes(tags: string[]): string[] {
  const vibes: string[] = [];
  if (tags.includes('editorial')) vibes.push('editorial', 'premium');
  if (tags.includes('minimal-hero')) vibes.push('minimal', 'clean');
  if (tags.includes('tall-hero') || tags.includes('full-bleed-hero')) vibes.push('bold', 'dramatic');
  if (tags.includes('carousel')) vibes.push('dynamic', 'engaging');
  if (tags.includes('marquee')) vibes.push('energetic', 'modern');
  if (tags.includes('ugc')) vibes.push('authentic', 'social');
  if (tags.includes('video')) vibes.push('cinematic', 'immersive');
  if (tags.includes('content-rich')) vibes.push('detailed', 'informative');
  if (vibes.length === 0) vibes.push('modern', 'clean');
  return vibes;
}

function hexLuminance(hex: string): number {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const linear = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  } catch {
    return 0.9; // assume light
  }
}

function sanitizeHex(hex: string, fallback: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  // Try to fix common issues (e.g. #003a000 → #003a00)
  if (hex.startsWith('#') && hex.length === 8) return hex.slice(0, 7);
  if (hex.startsWith('#') && hex.length === 4) {
    // Expand shorthand #RGB → #RRGGBB
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return fallback;
}

function buildPalette(comp: Composition | null, vertical: string) {
  if (comp?.palette_hint) {
    const ph = comp.palette_hint;
    const bg = sanitizeHex(ph.background || '#FAFAF5', '#FAFAF5');
    const surface = sanitizeHex(ph.surface || '#F5F2ED', '#F5F2ED');
    const accent = sanitizeHex(ph.accent || '#D4356A', '#D4356A');
    const bgLum = hexLuminance(bg);
    return {
      mode: 'generated' as const,
      seed: accent,
      primary: accent,
      secondary: surface,
      accent,
      background: bg,
      surface,
      text: bgLum > 0.5 ? '#1A1A2E' : '#F5F5F5',
      textMuted: bgLum > 0.5 ? '#6B6B80' : '#B0B0B0',
    };
  }

  const fallbacks: Record<string, any> = {
    fashion: { seed: '#8B6F47', primary: '#8B6F47', secondary: '#F5EDE3', accent: '#C9956B', background: '#FEFCF9', surface: '#F8F4EF', text: '#2C2420', textMuted: '#7A706A' },
    jewellery: { seed: '#C9A84C', primary: '#C9A84C', secondary: '#1A1A2E', accent: '#E8D5A3', background: '#0F0F1A', surface: '#1A1A2E', text: '#F5F0E8', textMuted: '#B0A898' },
    beauty: { seed: '#E8B4B8', primary: '#D4898F', secondary: '#FFF5F5', accent: '#E8B4B8', background: '#FFFBFB', surface: '#FFF5F5', text: '#3D2B2F', textMuted: '#8B7175' },
    electronics: { seed: '#2563EB', primary: '#2563EB', secondary: '#EFF6FF', accent: '#3B82F6', background: '#FAFBFC', surface: '#F1F5F9', text: '#0F172A', textMuted: '#64748B' },
    food: { seed: '#B8860B', primary: '#B8860B', secondary: '#FFF8E7', accent: '#D4A34A', background: '#FFFDF5', surface: '#FFF9ED', text: '#2C2410', textMuted: '#7A6F5A' },
    home_decor: { seed: '#6B7B5E', primary: '#6B7B5E', secondary: '#F5F2ED', accent: '#A3956B', background: '#FAFAF5', surface: '#F5F2ED', text: '#2C2C25', textMuted: '#7A7A6D' },
    pets: { seed: '#E86830', primary: '#E86830', secondary: '#FFF5ED', accent: '#F4A261', background: '#FFFAF5', surface: '#FFF5ED', text: '#2C2015', textMuted: '#7A6A5A' },
  };
  return { mode: 'generated' as const, ...(fallbacks[vertical] || fallbacks['fashion']) };
}

function mapArchetype(raw: any, compositions: Composition[]): Archetype {
  const memberComps = compositions.filter(c => raw.member_ids?.includes(c.id));
  const representative = memberComps.find(c => c.source_url === raw.representative_source) || memberComps[0] || null;
  const vertical = raw.vertical === 'homedecor' ? 'home_decor' : raw.vertical;

  return {
    ...raw,
    vertical,
    fit: {
      audiences: inferAudiences(vertical),
      priceFloor: vertical === 'jewellery' ? 500 : vertical === 'electronics' ? 200 : 100,
      priceCeiling: vertical === 'jewellery' ? 100000 : vertical === 'electronics' ? 100000 : 50000,
      vibes: inferVibes(raw.tags || []),
    },
    design: {
      layout: inferLayout(raw.tags || [], raw.section_pattern || []),
      palette: buildPalette(representative, vertical),
      fonts: {
        display: representative?.typography_hint?.heading_font || 'DM Sans',
        body: representative?.typography_hint?.body_font || 'Inter',
        scale: 1.0,
      },
      hero: inferHeroStyle(raw.tags || []),
      productCard: inferProductCard(vertical, raw.tags || []),
      nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
      collection: {
        style: vertical === 'home_decor' ? 'masonry' : vertical === 'fashion' ? 'lookbook' : 'uniform_grid',
        columns: { mobile: 2, desktop: vertical === 'electronics' ? 4 : 3 },
        pagination: vertical === 'electronics' ? 'paginated' : 'infinite_scroll',
      },
      spacing: inferSpacing(raw.section_pattern || []),
      radius: inferRadius(vertical),
      imageStyle: vertical === 'fashion' ? 'hover_zoom' : vertical === 'jewellery' ? 'subtle_shadow' : 'rounded',
      animation: vertical === 'electronics' ? 'none' : 'fade',
    },
  };
}

// ============================================================
// Init
// ============================================================

function ensureLoaded() {
  if (_archetypes.length > 0) return;

  const lib = loadLibrary();
  if (!lib) {
    _archetypes = FALLBACK_ARCHETYPES;
    return;
  }

  _compositions = lib.compositions;

  for (const [, rawArchetypes] of Object.entries(lib.archetypes)) {
    for (const raw of rawArchetypes) {
      _archetypes.push(mapArchetype(raw, _compositions));
    }
  }

  console.log(`[archetypes] Mapped ${_archetypes.length} archetypes across ${new Set(_archetypes.map(a => a.vertical)).size} verticals`);
}

// ============================================================
// Public API
// ============================================================

export function selectArchetype(
  vertical: string,
  sellerContext?: {
    audience?: string;
    priceRange?: { min: number; max: number };
    brandVibe?: string;
  },
): Archetype {
  ensureLoaded();
  const norm = vertical === 'homedecor' ? 'home_decor' : vertical;
  const candidates = _archetypes.filter(a => a.vertical === norm);
  if (candidates.length === 0) {
    return _archetypes.find(a => a.vertical === 'general') || FALLBACK_ARCHETYPES[0]!;
  }
  if (candidates.length === 1 || !sellerContext) {
    return candidates.sort((a, b) => (b.cluster_size * b.quality_score) - (a.cluster_size * a.quality_score))[0]!;
  }

  let bestScore = -1;
  let best = candidates[0]!;

  for (const arch of candidates) {
    let score = Math.min(5, arch.cluster_size * 1.5) + (arch.quality_score / 100) * 3;

    if (sellerContext.audience) {
      for (const word of sellerContext.audience.toLowerCase().split(/\s+/)) {
        if (arch.fit.audiences.some(a => a.includes(word) || word.includes(a))) score += 3;
      }
    }
    if (sellerContext.priceRange) {
      const { min, max } = sellerContext.priceRange;
      const oMin = Math.max(min, arch.fit.priceFloor);
      const oMax = Math.min(max, arch.fit.priceCeiling);
      if (oMin <= oMax) score += Math.min(5, ((oMax - oMin) / (max - min || 1)) * 5);
    }
    if (sellerContext.brandVibe) {
      for (const word of sellerContext.brandVibe.toLowerCase().split(/\s+/)) {
        if (arch.fit.vibes.some(v => v.includes(word) || word.includes(v))) score += 2;
        if (arch.tags.some(t => t.includes(word) || word.includes(t))) score += 1;
      }
    }
    if (score > bestScore) { bestScore = score; best = arch; }
  }
  return best;
}

export function getArchetypesForVertical(vertical: string): Archetype[] {
  ensureLoaded();
  return _archetypes.filter(a => a.vertical === (vertical === 'homedecor' ? 'home_decor' : vertical));
}

export function getArchetypeById(id: string): Archetype | undefined {
  ensureLoaded();
  return _archetypes.find(a => a.id === id);
}

export function getSectionPattern(archetypeId: string): SectionPattern[] {
  ensureLoaded();
  return _archetypes.find(a => a.id === archetypeId)?.section_pattern || [];
}

export function getRepresentativeComposition(archetypeId: string): Composition | undefined {
  ensureLoaded();
  const arch = _archetypes.find(a => a.id === archetypeId);
  if (!arch) return undefined;
  return _compositions.find(c => c.source_url === arch.representative_source);
}

export function getAllCompositions(): Composition[] {
  ensureLoaded();
  return _compositions;
}

// ============================================================
// Fallback (if composition-library.json is missing)
// ============================================================

const FALLBACK_ARCHETYPES: Archetype[] = [
  {
    id: 'fallback-fashion', name: 'Fashion Default', vertical: 'fashion',
    cluster_size: 1, confidence: 0.5, representative_source: '', quality_score: 80,
    vector: [], member_ids: [],
    tags: ['slideshow', 'tall-hero', 'carousel'],
    palette_centroid: { avg_gold_proportion: 0, avg_maroon_proportion: 0, dark_theme_ratio: 0 },
    section_pattern: [
      { type: 'announcement_bar', position: 0, required: false, background_hint: 'light' },
      { type: 'hero_slideshow', position: 1, variant: 'slide', required: true, background_hint: 'dark' },
      { type: 'trust_bar', position: 2, required: true, background_hint: 'light' },
      { type: 'product_carousel', position: 3, variant: 'full_width', required: true, background_hint: 'light' },
      { type: 'category_grid', position: 4, variant: '3col', required: false, background_hint: 'light' },
      { type: 'featured_products', position: 5, variant: 'grid_minimal', required: true, background_hint: 'light' },
      { type: 'about_brand', position: 6, required: false, background_hint: 'light' },
      { type: 'newsletter', position: 7, required: true, background_hint: 'light' },
    ],
    fit: { audiences: ['women', 'men', 'youth'], priceFloor: 300, priceCeiling: 10000, vibes: ['modern', 'clean'] },
    design: {
      layout: 'magazine',
      palette: { mode: 'generated', seed: '#8B6F47', primary: '#8B6F47', secondary: '#F5EDE3', accent: '#C9956B', background: '#FEFCF9', surface: '#F8F4EF', text: '#2C2420', textMuted: '#7A706A' },
      fonts: { display: 'DM Sans', body: 'Inter', scale: 1.0 },
      hero: { style: 'full_bleed', height: 'full', overlayOpacity: 0.3 },
      productCard: { style: 'hover_reveal', showPrice: true, showRating: false, imageRatio: '3:4' },
      nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
      collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 3 }, pagination: 'infinite_scroll' },
      spacing: 'balanced', radius: 'subtle', imageStyle: 'hover_zoom', animation: 'fade',
    },
  },
  {
    id: 'fallback-general', name: 'General Default', vertical: 'general',
    cluster_size: 1, confidence: 0.5, representative_source: '', quality_score: 70,
    vector: [], member_ids: [],
    tags: ['slideshow', 'carousel'],
    palette_centroid: { avg_gold_proportion: 0, avg_maroon_proportion: 0, dark_theme_ratio: 0 },
    section_pattern: [
      { type: 'hero_slideshow', position: 0, variant: 'slide', required: true, background_hint: 'light' },
      { type: 'trust_bar', position: 1, required: true, background_hint: 'light' },
      { type: 'featured_products', position: 2, variant: 'grid_minimal', required: true, background_hint: 'light' },
      { type: 'about_brand', position: 3, required: false, background_hint: 'light' },
      { type: 'newsletter', position: 4, required: true, background_hint: 'light' },
    ],
    fit: { audiences: [], priceFloor: 0, priceCeiling: 100000, vibes: ['modern', 'clean'] },
    design: {
      layout: 'minimal',
      palette: { mode: 'generated', seed: '#D4356A', primary: '#D4356A', secondary: '#F8E8EE', accent: '#8B1A3A', background: '#FFFAF5', surface: '#FFF5EE', text: '#1A1A2E', textMuted: '#6B6B80' },
      fonts: { display: 'DM Sans', body: 'Inter', scale: 1.0 },
      hero: { style: 'full_bleed', height: 'half', overlayOpacity: 0.3 },
      productCard: { style: 'minimal', showPrice: true, showRating: false, imageRatio: '3:4' },
      nav: { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: true },
      collection: { style: 'uniform_grid', columns: { mobile: 2, desktop: 4 }, pagination: 'infinite_scroll' },
      spacing: 'balanced', radius: 'subtle', imageStyle: 'subtle_shadow', animation: 'fade',
    },
  },
];
