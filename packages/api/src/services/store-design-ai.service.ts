import { env } from '../env.js';
import { selectArchetype } from '../lib/archetypes.js';

// ============================================================
// Store Design AI Service
//
// Takes product photos + store name + vertical and generates
// a complete DesignTokens config that makes the store look
// like it was custom designed for this specific brand.
//
// This is Call 2 of the two-call pipeline:
//   Call 1: Photos → product listings (catalog-ai.service.ts)
//   Call 2: Photos → store design config (this file)
//
// Both calls run in parallel during store creation.
// ============================================================

export interface StoreDesignInput {
  storeName: string;
  vertical: string;
  productImages: string[];  // base64 data URLs or http URLs
  productInfo?: {
    names?: string[];
    priceRange?: { min: number; max: number };
    tags?: string[];
  };
  sellerContext?: {
    audience?: string;
    priceRange?: { min: number; max: number };
    brandVibe?: string;
  };
  sellerHints?: string;  // "I want a luxury feel" or "keep it minimal"
}

export interface StoreDesignOutput {
  design: Record<string, unknown>;
  storeBio: string;
  heroTagline: string;
  heroSubtext: string;
  archetypeId?: string;
  processingTimeMs: number;
}

const SYSTEM_PROMPT = `You are an expert e-commerce store designer for Indian sellers.
You analyze product photos and brand context to generate a complete store design configuration.

Your goal: Make every store look UNIQUE and PROFESSIONAL — like a custom-designed brand website, not a generic template.

You must return ONLY valid JSON matching this exact structure:

{
  "design": {
    "layout": "minimal|magazine|catalog_grid|single_product_hero|boutique|editorial|marketplace",
    "palette": {
      "mode": "generated",
      "seed": "#hexcolor",
      "primary": "#hexcolor",
      "secondary": "#hexcolor",
      "accent": "#hexcolor",
      "background": "#hexcolor",
      "surface": "#hexcolor",
      "text": "#hexcolor",
      "textMuted": "#hexcolor"
    },
    "fonts": {
      "display": "Google Font Name",
      "body": "Google Font Name",
      "scale": 1.0
    },
    "hero": {
      "style": "full_bleed|split_image|gradient|minimal_text|parallax",
      "height": "full|half|auto",
      "overlayOpacity": 0.3
    },
    "productCard": {
      "style": "minimal|hover_reveal|quick_view|editorial|compact",
      "showPrice": true,
      "showRating": false,
      "imageRatio": "3:4|1:1|4:3"
    },
    "nav": {
      "style": "sticky_minimal|top_bar|hamburger|search_first",
      "showSearch": true,
      "showCart": true,
      "showWhatsapp": true
    },
    "collection": {
      "style": "masonry|uniform_grid|lookbook|filterable_sidebar",
      "columns": { "mobile": 2, "desktop": 3 or 4 },
      "pagination": "infinite_scroll|paginated"
    },
    "checkout": {
      "style": "single_page|multi_step|drawer",
      "showTrustBadges": true,
      "whatsappCheckout": false
    },
    "spacing": "airy|balanced|compact|ultra_minimal",
    "radius": "sharp|subtle|rounded|pill",
    "imageStyle": "raw|subtle_shadow|border_frame|hover_zoom|rounded",
    "animation": "none|fade|slide_up|staggered"
  },
  "storeBio": "2-3 sentence store description for the about section. Write for Indian buyers. Mention the brand's unique value. Be specific, not generic.",
  "heroTagline": "Short, punchy hero headline (4-8 words). MUST be specific to this brand — not generic. Examples of GOOD taglines: 'Handwoven Silk, Timeless Grace', 'Bold Accessories for Bold Women', 'Farm to Kitchen, Pure & Fresh'. Examples of BAD taglines: 'Discover Our Collection', 'Welcome to Our Store', 'Shop the Latest'.",
  "heroSubtext": "One line (max 15 words) supporting text under the hero. Should complement the tagline, not repeat it."
}

DESIGN PRINCIPLES:
- EXTRACT colors from the actual product photos. If the products are cream leather with gold hardware, use cream/gold/warm tones. If they're colorful textiles, use vibrant jewel tones.
- Match the font personality to the brand: serif fonts (Playfair Display, Lora, Cormorant) for luxury/traditional. Sans-serif (Inter, DM Sans, Plus Jakarta Sans) for modern/minimal. Display fonts (Outfit, Space Grotesk) for trendy/youth.
- Layout should match product count expectations: boutique for <20 products, catalog_grid for >50, single_product_hero for premium/limited.
- Indian market context: include WhatsApp, COD trust badges, festival-ready designs.
- Never use pure white (#FFFFFF) as background — always slightly tinted to match the palette.
- Ensure sufficient contrast between text and background (WCAG AA).

VERTICAL-SPECIFIC GUIDANCE:
- Fashion: editorial layouts, 3:4 image ratios, serif display fonts, hover_reveal cards
- Jewellery: boutique layout, dark/rich backgrounds, gold accents, sharp radius, 1:1 images
- Beauty: soft gradients, pill radius, pastel palettes, minimal_text hero
- Electronics: catalog_grid, compact spacing, sharp radius, sans-serif everything
- Food: warm earthy palettes, rounded radius, split_image hero, fun body fonts
- Home decor: airy spacing, magazine layout, muted earth tones, masonry collection

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

export async function generateStoreDesign(input: StoreDesignInput): Promise<StoreDesignOutput> {
  const startTime = Date.now();
  const provider = env.AI_PROVIDER || 'openai';

  // Select archetype based on vertical + seller context
  const archetype = selectArchetype(input.vertical, input.sellerContext);
  console.log(`[store-design-ai] Selected archetype: ${archetype.id} for ${input.vertical}`);
  console.log(`[store-design-ai] Using ${provider} for store design generation`);

  const userPrompt = buildUserPrompt(input, archetype);
  let rawText: string;

  if (provider === 'anthropic') {
    rawText = await callAnthropic(input, userPrompt);
  } else {
    rawText = await callOpenAI(input, userPrompt);
  }

  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    console.error('[store-design-ai] Failed to parse:', cleanJson.substring(0, 500));
    // Fallback: use archetype design directly
    console.log('[store-design-ai] Falling back to archetype design');
    return {
      design: archetype.design as any,
      storeBio: `Welcome to ${input.storeName}. Discover our curated collection.`,
      heroTagline: input.storeName,
      heroSubtext: 'Discover our latest collection',
      archetypeId: archetype.id,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Validate and fix palette contrast (WCAG AA)
  if (parsed.design?.palette) {
    parsed.design.palette = validateAndFixPalette(parsed.design.palette);
  }

  return {
    design: parsed.design,
    storeBio: parsed.storeBio || `Welcome to ${input.storeName}. Discover our curated collection.`,
    heroTagline: parsed.heroTagline || input.storeName,
    heroSubtext: parsed.heroSubtext || 'Discover our latest collection',
    archetypeId: archetype.id,
    processingTimeMs: Date.now() - startTime,
  };
}

function buildUserPrompt(input: StoreDesignInput, archetype: { id: string; name: string; design: any }): string {
  let prompt = `Design a store for "${input.storeName}" in the "${input.vertical}" vertical.`;

  // Include seller context
  if (input.sellerContext?.audience) {
    prompt += `\nTarget audience: ${input.sellerContext.audience}`;
  }
  if (input.sellerContext?.priceRange) {
    prompt += `\nPrice range: ₹${input.sellerContext.priceRange.min} - ₹${input.sellerContext.priceRange.max}`;
  }
  if (input.sellerContext?.brandVibe) {
    prompt += `\nBrand vibe: ${input.sellerContext.brandVibe}`;
  }

  if (input.productInfo?.names?.length) {
    prompt += `\n\nProducts include: ${input.productInfo.names.slice(0, 5).join(', ')}`;
  }
  if (input.productInfo?.priceRange) {
    prompt += `\nProduct price range: ₹${input.productInfo.priceRange.min} - ₹${input.productInfo.priceRange.max}`;
  }
  if (input.productInfo?.tags?.length) {
    prompt += `\nProduct tags: ${input.productInfo.tags.slice(0, 15).join(', ')}`;
  }
  if (input.sellerHints) {
    prompt += `\n\nSeller's preferences: "${input.sellerHints}"`;
  }

  // Provide archetype as starting point for the AI
  prompt += `\n\nUse this as a STARTING POINT (archetype: "${archetype.name}"), then customize the palette based on the actual product photos:\n${JSON.stringify(archetype.design, null, 2)}`;

  prompt += `\n\nIMPORTANT: Override the palette colors above with colors extracted from the product photos. Keep the layout, fonts, and spacing from the archetype unless the photos suggest a different aesthetic.`;

  return prompt;
}

// ============================================================
// OpenAI Provider
// ============================================================

async function callOpenAI(input: StoreDesignInput, userPrompt: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  // Build content: images first, then text
  const content: any[] = [];

  // Send up to 3 product images for design analysis
  const imagesToSend = input.productImages.slice(0, 3);
  for (const img of imagesToSend) {
    content.push({
      type: 'image_url',
      image_url: { url: img, detail: 'low' },  // low detail is enough for color/style extraction
    });
  }

  content.push({ type: 'text', text: userPrompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '';
}

// ============================================================
// Anthropic Provider
// ============================================================

async function callAnthropic(input: StoreDesignInput, userPrompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const client = new Anthropic({ apiKey });

  const imagesToSend = input.productImages.slice(0, 3);
  const imageContent = imagesToSend.map((img) => {
    if (img.startsWith('data:')) {
      const [header, data] = img.split(',');
      const mediaType = header?.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mediaType as any, data: data! },
      };
    }
    return {
      type: 'image' as const,
      source: { type: 'url' as const, url: img },
    };
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text' as const, text: userPrompt },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
  return textBlock.text;
}

// ============================================================
// WCAG Contrast Validator
//
// AI-generated palettes occasionally produce low-contrast
// combinations (yellow-on-white, light-gray-on-cream).
// This catches them before the store goes live.
//
// WCAG AA requirements:
// - Normal text on background: 4.5:1 minimum
// - Large text / UI components on background: 3:1 minimum
// ============================================================

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darken or lighten a hex color to reach a target contrast ratio
 * against the given background color.
 */
function adjustForContrast(color: string, background: string, targetRatio: number): string {
  const bgLum = relativeLuminance(background);
  const isLightBg = bgLum > 0.5;

  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  // Adjust in steps toward black (light bg) or white (dark bg)
  for (let i = 0; i < 50; i++) {
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (contrastRatio(hex, background) >= targetRatio) return hex;

    if (isLightBg) {
      // Darken
      r = Math.max(0, r - 5);
      g = Math.max(0, g - 5);
      b = Math.max(0, b - 5);
    } else {
      // Lighten
      r = Math.min(255, r + 5);
      g = Math.min(255, g + 5);
      b = Math.min(255, b + 5);
    }
  }

  // Fallback if we couldn't reach the target
  return isLightBg ? '#1A1A2E' : '#F5F5F5';
}

export function validateAndFixPalette(palette: any): any {
  const fixed = { ...palette };

  // Ensure we have valid hex colors to work with
  if (!fixed.text || !fixed.background) return fixed;

  // Text on background: WCAG AA (4.5:1)
  if (contrastRatio(fixed.text, fixed.background) < 4.5) {
    const bgLum = relativeLuminance(fixed.background);
    fixed.text = bgLum > 0.5 ? '#1A1A2E' : '#F5F5F5';
  }

  // Muted text on background: 3:1 minimum (large text standard)
  if (fixed.textMuted && contrastRatio(fixed.textMuted, fixed.background) < 3.0) {
    const bgLum = relativeLuminance(fixed.background);
    fixed.textMuted = bgLum > 0.5 ? '#6B6B80' : '#B0B0B0';
  }

  // Primary on background: 3:1 minimum (for buttons, links)
  if (fixed.primary && contrastRatio(fixed.primary, fixed.background) < 3.0) {
    fixed.primary = adjustForContrast(fixed.primary, fixed.background, 3.0);
  }

  return fixed;
}
