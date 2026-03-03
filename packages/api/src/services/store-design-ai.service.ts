import { env } from '../env.js';
import { selectArchetype, getRepresentativeComposition } from '../lib/archetypes.js';
import type { SectionPattern, Composition } from '../lib/archetypes.js';

// ============================================================
// Store Design AI Service v2 — Composition Library Powered
//
// Now includes real section patterns from 106 analyzed stores.
// The AI gets both design tokens AND section ordering.
//
// Pipeline:
//   1. selectArchetype() picks best match (75 data-driven archetypes)
//   2. Section pattern from real stores feeds into the prompt
//   3. AI customizes palette from product photos
//   4. Returns DesignTokens + section config for dynamic rendering
// ============================================================

export interface StoreDesignInput {
  storeName: string;
  vertical: string;
  productImages: string[];
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
  sellerHints?: string;
}

export interface StoreDesignOutput {
  design: Record<string, unknown>;
  storeBio: string;
  heroTagline: string;
  heroSubtext: string;
  archetypeId?: string;
  /** Section layout from composition library — drives dynamic homepage */
  sectionLayout: SectionPattern[];
  /** Representative store URL for reference */
  representativeStore?: string;
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
      "style": "full_bleed|split_image|gradient|carousel|video|minimal_text|parallax",
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
    "animation": "none|fade|slide_up|staggered",
    "heroTokens": {
      "overlayGradient": "cinematic-bottom|center-vignette|none",
      "textPlacement": "bottom-left|center|split-left",
      "showScrollHint": true,
      "slideTransition": "crossfade|slide|zoom"
    },
    "cardTokens": {
      "hoverEffect": "lift|zoom|overlay|none",
      "showSecondImage": true,
      "showQuickAdd": true,
      "badgeStyle": "pill|tag|corner-ribbon",
      "priceDisplay": "stacked|inline|prominent"
    },
    "decorativeTokens": {
      "dividerStyle": "line|gradient-fade|pattern-ethnic|none",
      "sectionBgVariation": true,
      "useGlassmorphism": true,
      "textureOverlay": "none|noise-subtle|linen|ethnic-pattern"
    },
    "bespokeStyles": {
      "hero": {
        "fontSize": "clamp(...)",
        "lineHeight": "0.92-1.05",
        "letterSpacing": "-0.04em to 0em",
        "overlayGradient": "full CSS gradient for THIS specific hero",
        "textShadow": "CSS text-shadow for hero heading",
        "ctaStyle": "rounded-full|sharp|pill",
        "accentElement": "underline-brush|glow|none"
      },
      "card": {
        "hoverTransform": "CSS transform on hover",
        "shadowOnHover": "CSS box-shadow for card hover"
      },
      "accentSectionCSS": "background: <primary>; color: #fff; (for one bold section)",
      "signatureEffect": "parallax-drape|sparkle-overlay|organic-reveal|none"
    }
  },
  "storeBio": "2-3 sentence store description for the about section. Write for Indian buyers.",
  "heroTagline": "Short, punchy hero headline (4-8 words). MUST be specific to this brand.",
  "heroSubtext": "One line (max 15 words) supporting text under the hero.",
  "sectionVibeWeights": [0.2, 1.0, 0.5, 1.5, 0.8, 1.0, 0.3, 1.2]
}

DESIGN PRINCIPLES:
- EXTRACT colors from the actual product photos. If the products are cream leather with gold hardware, use cream/gold/warm tones.
- Match font personality to brand: serif fonts for luxury/traditional, sans-serif for modern/minimal.
- Indian market context: include WhatsApp, COD trust badges, festival-ready designs.
- Never use pure white (#FFFFFF) as background — always slightly tinted.
- Ensure sufficient contrast between text and background (WCAG AA).

BESPOKE STYLES — THE "DESIGNED" FEELING:
These make each store feel like it was touched by a human designer, not assembled from parts.

1. HERO TYPOGRAPHY: Be BOLD. Use aggressive clamp() for font-size. Fashion/Jewellery heroes should hit 80px+ on desktop. Use tight line-height (0.92-0.98) for the "high fashion" look. Negative letter-spacing for large headings.
   - Luxury: fontSize="clamp(2.8rem, 9vw, 6rem)", lineHeight="0.92", letterSpacing="-0.05em"
   - Modern: fontSize="clamp(2.2rem, 7vw, 4.5rem)", lineHeight="1.0", letterSpacing="-0.03em"
   - Playful: fontSize="clamp(2rem, 6vw, 3.5rem)", lineHeight="1.1", letterSpacing="0em"

2. HERO OVERLAY: Write a UNIQUE gradient for this store. Don't use generic rgba overlays. Use the store's actual palette colors in the gradient stops. Example for a warm fashion brand: "linear-gradient(170deg, #1A1A2E44 0%, transparent 30%, #C2185B33 70%, #1A1A2EDD 100%)"

3. SIGNATURE EFFECTS: Pick based on vertical:
   - Fashion: "parallax-drape" (hero image moves slower than text on scroll)
   - Jewellery: "sparkle-overlay" (subtle shimmer SVG follows mouse on product cards)
   - Beauty: "organic-reveal" (section dividers use wavy/blob masks instead of straight lines)
   - Others: "none"

4. SECTION VIBE WEIGHTS (sectionVibeWeights array):
   These control the gap BEFORE each section. This creates the irregular rhythm that separates "designed" from "template."
   - 0.2 = Compressed (24px gap). Use after hero, between trust bar and content.
   - 0.5 = Tight (32px gap). Between related sections.
   - 1.0 = Normal (48px gap). Default.
   - 1.5 = Expanded (96px gap). Before "Our Story" or major content shifts. Creates breathing room.
   - One section should have colorIntensity="high" — this is the "Surprise" moment where the primary color takes over as background.

5. CARD HOVER: Write a specific CSS transform, not just "lift" or "zoom". Example: "translateY(-6px) rotate(0.5deg)" for a playful brand, or "scale(1.02)" for minimal.

TIER 3 TOKEN GUIDELINES:
- Fashion: heroTokens.overlayGradient="cinematic-bottom", cardTokens.hoverEffect="zoom", imageRatio="3:4", decorativeTokens.dividerStyle="gradient-fade"
- Jewellery: heroTokens.overlayGradient="center-vignette", cardTokens.hoverEffect="lift", imageRatio="1:1", dark backgrounds, decorativeTokens.useGlassmorphism=true
- Beauty: heroTokens.textPlacement="split-left", cardTokens.hoverEffect="none", imageRatio="1:1", clean white backgrounds
- Electronics: heroTokens.textPlacement="center", cardTokens.priceDisplay="prominent", decorativeTokens.sectionBgVariation=true
- Food/FMCG: heroTokens.overlayGradient="none", warm tones, cardTokens.badgeStyle="tag"

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

export async function generateStoreDesign(input: StoreDesignInput): Promise<StoreDesignOutput> {
  const startTime = Date.now();
  const provider = env.AI_PROVIDER || 'openai';

  // Select archetype from composition library (75 data-driven archetypes)
  const archetype = selectArchetype(input.vertical, input.sellerContext);
  console.log(`[store-design-ai] Selected archetype: ${archetype.id} (${archetype.name}) for ${input.vertical}`);
  console.log(`[store-design-ai] Cluster size: ${archetype.cluster_size}, Quality: ${archetype.quality_score}`);
  console.log(`[store-design-ai] Representative: ${archetype.representative_source}`);
  console.log(`[store-design-ai] Using ${provider} for generation`);

  // Get section pattern and representative composition
  const sectionPattern = archetype.section_pattern || [];
  const representative = getRepresentativeComposition(archetype.id);

  const userPrompt = buildUserPrompt(input, archetype, sectionPattern, representative);
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
    console.log('[store-design-ai] Falling back to archetype design');
    return {
      design: archetype.design as any,
      storeBio: `Welcome to ${input.storeName}. Discover our curated collection.`,
      heroTagline: input.storeName,
      heroSubtext: 'Discover our latest collection',
      archetypeId: archetype.id,
      sectionLayout: sectionPattern,
      representativeStore: archetype.representative_source,
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (parsed.design?.palette) {
    parsed.design.palette = validateAndFixPalette(parsed.design.palette);
  }

  // V3: Merge sectionVibeWeights into sectionLayout
  const vibeWeights: number[] = parsed.sectionVibeWeights || [];
  const enrichedLayout = sectionPattern.map((section, i) => ({
    ...section,
    vibeWeight: vibeWeights[i] ?? 1.0,
    // V3: Mark one section as high-intensity color takeover
    colorIntensity: (vibeWeights[i] !== undefined && i === findAccentSectionIndex(sectionPattern, vibeWeights))
      ? 'high' as const
      : undefined,
  }));

  return {
    design: parsed.design,
    storeBio: parsed.storeBio || `Welcome to ${input.storeName}. Discover our curated collection.`,
    heroTagline: parsed.heroTagline || input.storeName,
    heroSubtext: parsed.heroSubtext || 'Discover our latest collection',
    archetypeId: archetype.id,
    sectionLayout: enrichedLayout,
    representativeStore: archetype.representative_source,
    processingTimeMs: Date.now() - startTime,
  };
}

/** V3: Find the best section for the "bold primary color takeover" moment */
function findAccentSectionIndex(sections: SectionPattern[], weights: number[]): number {
  // Prefer stats_bar, newsletter, or testimonials for the accent section
  const preferredTypes = ['stats_bar', 'newsletter', 'testimonials', 'testimonial_cards', 'about_brand'];
  for (const pref of preferredTypes) {
    const idx = sections.findIndex(s => s.type === pref);
    if (idx >= 0) return idx;
  }
  // Fallback: pick the section with highest vibeWeight (most "expanded" gap = good place for surprise)
  let maxIdx = Math.floor(sections.length / 2);
  let maxWeight = 0;
  weights.forEach((w, i) => {
    if (w > maxWeight && i > 2) { maxWeight = w; maxIdx = i; }
  });
  return maxIdx;
}

function buildUserPrompt(
  input: StoreDesignInput,
  archetype: { id: string; name: string; design: any; tags: string[] },
  sectionPattern: SectionPattern[],
  representative: Composition | null | undefined,
): string {
  let prompt = `Design a store for "${input.storeName}" in the "${input.vertical}" vertical.`;

  if (input.sellerContext?.audience) prompt += `\nTarget audience: ${input.sellerContext.audience}`;
  if (input.sellerContext?.priceRange) prompt += `\nPrice range: ₹${input.sellerContext.priceRange.min} - ₹${input.sellerContext.priceRange.max}`;
  if (input.sellerContext?.brandVibe) prompt += `\nBrand vibe: ${input.sellerContext.brandVibe}`;
  if (input.productInfo?.names?.length) prompt += `\n\nProducts include: ${input.productInfo.names.slice(0, 5).join(', ')}`;
  if (input.productInfo?.priceRange) prompt += `\nProduct price range: ₹${input.productInfo.priceRange.min} - ₹${input.productInfo.priceRange.max}`;
  if (input.productInfo?.tags?.length) prompt += `\nProduct tags: ${input.productInfo.tags.slice(0, 15).join(', ')}`;
  if (input.sellerHints) prompt += `\n\nSeller's preferences: "${input.sellerHints}"`;

  // Provide archetype as starting point
  prompt += `\n\nUse this as a STARTING POINT (archetype: "${archetype.name}"), then customize the palette based on the actual product photos:\n${JSON.stringify(archetype.design, null, 2)}`;

  // Add section pattern context from real stores
  if (sectionPattern.length > 0) {
    const sectionSummary = sectionPattern
      .map(s => `${s.type}${s.variant ? ` (${s.variant})` : ''}`)
      .join(' → ');
    prompt += `\n\nThis archetype's homepage section layout (from ${archetype.tags.join(', ')} pattern):\n${sectionSummary}`;
    prompt += `\nThis pattern was derived from analyzing ${representative?.source_url || 'real stores'} and similar high-performing stores.`;
  }

  // Add real font pairing from composition data
  if (representative?.typography_hint) {
    prompt += `\n\nReal-world font pairing from this archetype: ${representative.typography_hint.heading_font} (headings) + ${representative.typography_hint.body_font} (body). Use these as the default unless the brand vibe suggests otherwise.`;
  }

  prompt += `\n\nIMPORTANT: Override the palette colors above with colors extracted from the product photos. Keep the layout structure and fonts from the archetype unless the photos suggest a different aesthetic.`;

  return prompt;
}

// ============================================================
// OpenAI Provider
// ============================================================

async function callOpenAI(input: StoreDesignInput, userPrompt: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const content: any[] = [];
  for (const img of input.productImages.slice(0, 3)) {
    content.push({ type: 'image_url', image_url: { url: img, detail: 'low' } });
  }
  content.push({ type: 'text', text: userPrompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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
  const imageContent = input.productImages.slice(0, 3).map((img) => {
    if (img.startsWith('data:')) {
      const [header, data] = img.split(',');
      const mediaType = header?.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType as any, data: data! } };
    }
    return { type: 'image' as const, source: { type: 'url' as const, url: img } };
  });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [...imageContent, { type: 'text' as const, text: userPrompt }] }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
  return textBlock.text;
}

// ============================================================
// WCAG Contrast Validator
// ============================================================

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function adjustForContrast(color: string, background: string, targetRatio: number): string {
  const bgLum = relativeLuminance(background);
  const isLightBg = bgLum > 0.5;
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  for (let i = 0; i < 50; i++) {
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (contrastRatio(hex, background) >= targetRatio) return hex;
    if (isLightBg) { r = Math.max(0, r - 5); g = Math.max(0, g - 5); b = Math.max(0, b - 5); }
    else { r = Math.min(255, r + 5); g = Math.min(255, g + 5); b = Math.min(255, b + 5); }
  }
  return isLightBg ? '#1A1A2E' : '#F5F5F5';
}

export function validateAndFixPalette(palette: any): any {
  const fixed = { ...palette };
  if (!fixed.text || !fixed.background) return fixed;

  if (contrastRatio(fixed.text, fixed.background) < 4.5) {
    fixed.text = relativeLuminance(fixed.background) > 0.5 ? '#1A1A2E' : '#F5F5F5';
  }
  if (fixed.textMuted && contrastRatio(fixed.textMuted, fixed.background) < 3.0) {
    fixed.textMuted = relativeLuminance(fixed.background) > 0.5 ? '#6B6B80' : '#B0B0B0';
  }
  if (fixed.primary && contrastRatio(fixed.primary, fixed.background) < 3.0) {
    fixed.primary = adjustForContrast(fixed.primary, fixed.background, 3.0);
  }
  return fixed;
}
