import { env } from '../env.js';
import { selectArchetype, getRepresentativeComposition } from '../lib/archetypes.js';
import type { SectionPattern, Composition } from '../lib/archetypes.js';
import { validateDesignOutput, buildCorrectiveGuidance } from './design-validator.service.js';

// ============================================================
// Store Design AI Service v3 — Two-Pass Director → Stylist
//
// Pass 1 — DIRECTOR (text only, ~400ms): Typography, rhythm, mood
// Pass 2 — STYLIST (with images, ~800ms): Full config constrained by Director
// ============================================================

export interface StoreDesignInput {
  storeName: string;
  vertical: string;
  productImages: string[];
  productInfo?: { names?: string[]; priceRange?: { min: number; max: number }; tags?: string[]; };
  sellerContext?: { audience?: string; priceRange?: { min: number; max: number }; brandVibe?: string; };
  sellerHints?: string;
}

export interface StoreDesignOutput {
  design: Record<string, unknown>;
  storeBio: string;
  heroTagline: string;
  heroSubtext: string;
  archetypeId?: string;
  sectionLayout: SectionPattern[];
  representativeStore?: string;
  directorDecisions?: DirectorOutput;
  processingTimeMs: number;
}

interface DirectorOutput {
  typography: {
    heroFontSize: string;
    heroLineHeight: string;
    heroLetterSpacing: string;
    displayFont: string;
    bodyFont: string;
  };
  rhythm: number[];
  colorMood: string;
  signatureEffect: string;
  accentSectionType: string;
  heroOverlayDirection: string;
  brandPersonality: string;
  ctaShape: string;
  textureHint: string;
}

// ============================================================
// PASS 1 — DIRECTOR SYSTEM PROMPT
// ============================================================

const DIRECTOR_SYSTEM = `You are a Creative Director for Indian e-commerce brands.
Your job: Make ONE set of bold, opinionated design decisions that define a brand's visual identity.
You do NOT pick colors or write CSS. You set the VISION that a stylist will execute.

Return ONLY valid JSON:
{
  "typography": {
    "heroFontSize": "clamp(min, preferred, max)",
    "heroLineHeight": "0.85-1.1",
    "heroLetterSpacing": "-0.06em to 0em",
    "displayFont": "Google Font name for headings",
    "bodyFont": "Google Font name for body"
  },
  "rhythm": [0.2, 1.0, 0.5, 1.5, ...],
  "colorMood": "dark-luxury|warm-earthy|clean-minimal|bold-vibrant|neutral-editorial",
  "signatureEffect": "parallax-drape|sparkle-overlay|organic-reveal|none",
  "accentSectionType": "stats_bar|newsletter|testimonials|collection_banner",
  "heroOverlayDirection": "170deg diagonal|radial-center-offset|horizontal-left|none",
  "brandPersonality": "2-3 words",
  "ctaShape": "sharp|rounded|pill",
  "textureHint": "none|noise-subtle|ethnic-pattern|linen"
}

RULES — BE BOLD, NOT SAFE:

TYPOGRAPHY:
- heroFontSize: use clamp() with max no larger than 4rem. Example: clamp(2rem, 5vw, 3.5rem). Never exceed clamp(2.5rem, 6vw, 4rem).
- Luxury/Heritage: clamp(2rem, 5vw, 3.8rem). Line-height 0.88-0.95. Letter-spacing -0.04em to -0.06em.
- Modern/Minimal: clamp(1.8rem, 5vw, 3.5rem). Line-height 0.98-1.05. Letter-spacing -0.02em to -0.03em.
- Playful/Casual: clamp(1.6rem, 4vw, 3rem). Line-height 1.05-1.15. Letter-spacing 0em.
- displayFont and bodyFont MUST be different fonts. Never use the same font for both.
- For fashion, jewellery, and luxury verticals: prefer serif display fonts like Cormorant Garamond, Playfair Display, EB Garamond, Lora. Use sans-serif display fonts only for streetwear, electronics, or modern/minimal brands.
- Serif display + Sans body = luxury. Sans + Sans = modern. Slab + Rounded = playful.

RHYTHM (vibeWeight array, one per section):
- 0.1-0.3 = Compressed (6-12px). After heroes, between tightly coupled sections.
- 0.4-0.7 = Tight (16-24px). Related content.
- 0.8-1.2 = Normal (32-48px). Default.
- 1.3-1.8 = Expanded (64-96px). Before major mood shifts. Creates "designed" feeling.
- 1.9-2.0 = Maximum (120px). Very rare.
- CRITICAL: Do NOT make all 1.0. At least 3 values < 0.5 and at least 2 > 1.3.

COLOR MOOD (guides the Stylist pass):
- "dark-luxury": Dark bg (#1A1714 range), gold/cream. Jewellery, luxury fashion.
- "warm-earthy": Cream/beige bg, terracotta/rust. Ethnic fashion, artisanal.
- "clean-minimal": Near-white bg, single accent. Beauty, skincare, modern.
- "bold-vibrant": Saturated primary used generously. Youth fashion, FMCG.
- "neutral-editorial": Gray-tinted bg, high-contrast type. Contemporary, electronics.

SIGNATURE EFFECT:
- Fashion: "parallax-drape" | Jewellery: "sparkle-overlay" | Beauty: "organic-reveal" | Others: "none"

CRITICAL: Return ONLY valid JSON. No markdown, no backticks. Be OPINIONATED — safe = boring.`;

// ============================================================
// PASS 2 — STYLIST SYSTEM PROMPT (built from Director output)
// ============================================================

function buildStylistSystem(d: DirectorOutput): string {
  const radiusMap: Record<string, string> = { sharp: 'sharp', pill: 'pill', rounded: 'rounded' };
  const moodRules: Record<string, string> = {
    'dark-luxury': 'Background: #1A1714 to #1E1B16. Surface: slightly lighter. Text: cream/ivory. Primary: gold/champagne. NEVER white backgrounds.',
    'warm-earthy': 'Background: #FAF6F1 to #FFF8F0. Surface: slightly darker cream. Text: dark brown. Primary: terracotta/deep red. Accent: gold/amber.',
    'clean-minimal': 'Background: #FAFCFA to #F8FAFB (barely tinted). Surface: light gray. Text: deep forest/navy. Primary: one strong accent.',
    'bold-vibrant': 'Background: white-ish. Text: near-black. Primary: SATURATED, bold. Use generously.',
    'neutral-editorial': 'Background: cool gray #F5F5F7. Surface: warmer. Text: near-black. Primary: muted, sophisticated.',
  };

  return `You are a UI Stylist for Indian e-commerce stores.
A Creative Director has set the vision. Execute it with exact CSS values.

DIRECTOR DECISIONS (you MUST follow):
- Typography: heroFontSize=${d.typography.heroFontSize}, lineHeight=${d.typography.heroLineHeight}, letterSpacing=${d.typography.heroLetterSpacing}
- Fonts: ${d.typography.displayFont} (display) + ${d.typography.bodyFont} (body)
- Color mood: ${d.colorMood}
- Signature: ${d.signatureEffect} | CTA: ${d.ctaShape} | Overlay: ${d.heroOverlayDirection}
- Personality: ${d.brandPersonality} | Texture: ${d.textureHint}
- Accent section: ${d.accentSectionType} gets primary-color takeover

You CANNOT change typography, fonts, color mood, or signature. You CAN:
- Extract exact hex colors from product photos matching the mood
- Write bespoke CSS gradients using those colors
- Set card hover transforms and shadows
- Fine-tune all design tokens

Return ONLY valid JSON:
{
  "design": {
    "layout": "minimal|magazine|catalog_grid|single_product_hero|boutique|editorial|marketplace",
    "palette": { "mode": "generated", "seed": "#hex", "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "textMuted": "#hex" },
    "fonts": { "display": "${d.typography.displayFont}", "body": "${d.typography.bodyFont}", "scale": 1.0 },
    "hero": { "style": "full_bleed|split_image|gradient|carousel|video|minimal_text|parallax", "height": "full|half|auto", "overlayOpacity": 0.3 },
    "productCard": { "style": "minimal|hover_reveal|quick_view|editorial|compact", "showPrice": true, "showRating": false, "imageRatio": "3:4|1:1|4:3" },
    "nav": { "style": "sticky_minimal|top_bar|hamburger|search_first", "showSearch": true, "showCart": true, "showWhatsapp": true },
    "collection": { "style": "masonry|uniform_grid|lookbook|filterable_sidebar", "columns": { "mobile": 2, "desktop": 3 }, "pagination": "infinite_scroll|paginated" },
    "checkout": { "style": "single_page|multi_step|drawer", "showTrustBadges": true, "whatsappCheckout": false },
    "spacing": "airy|balanced|compact|ultra_minimal",
    "radius": "${radiusMap[d.ctaShape] || 'rounded'}",
    "imageStyle": "raw|subtle_shadow|border_frame|hover_zoom|rounded",
    "animation": "none|fade|slide_up|staggered",
    "heroTokens": { "overlayGradient": "cinematic-bottom|center-vignette|none", "textPlacement": "bottom-left|center|split-left", "showScrollHint": true, "slideTransition": "crossfade|slide|zoom" },
    "cardTokens": { "hoverEffect": "lift|zoom|overlay|none", "showSecondImage": true, "showQuickAdd": true, "badgeStyle": "pill|tag|corner-ribbon", "priceDisplay": "stacked|inline|prominent" },
    "decorativeTokens": { "dividerStyle": "line|gradient-fade|pattern-ethnic|none", "sectionBgVariation": true, "useGlassmorphism": true, "textureOverlay": "${d.textureHint}" },
    "bespokeStyles": {
      "hero": {
        "fontSize": "${d.typography.heroFontSize}",
        "lineHeight": "${d.typography.heroLineHeight}",
        "letterSpacing": "${d.typography.heroLetterSpacing}",
        "overlayGradient": "WRITE unique CSS gradient using extracted palette hex, direction: ${d.heroOverlayDirection}",
        "textShadow": "CSS text-shadow matching mood",
        "ctaStyle": "${d.ctaShape}",
        "accentElement": "underline-brush|glow|none"
      },
      "card": {
        "hoverTransform": "WRITE specific CSS transform (not just lift/zoom)",
        "shadowOnHover": "WRITE specific box-shadow using palette colors"
      },
      "accentSectionCSS": "background: <primary or gradient>; color: <contrasting>;",
      "signatureEffect": "${d.signatureEffect}"
    }
  },
  "storeBio": "2-3 sentence store description for Indian buyers.",
  "heroTagline": "2-5 words, evocative not descriptive. Examples: 'Effortless Korean Elegance', 'Woven in Tradition', 'Seoul Meets Mumbai', 'The Art of Everyday Luxury'. Never use generic phrases like 'Shop Now', 'Await You', 'Discover Our Collection'.",
  "heroSubtext": "One line (max 15 words) supporting text."
}

PALETTE RULES for "${d.colorMood}":
- ${moodRules[d.colorMood] || moodRules['warm-earthy']}
- EXTRACT colors from product photos. Never pure #FFFFFF or #000000. WCAG AA contrast required.

BESPOKE CSS:
- overlayGradient: Use ACTUAL palette hex in stops, not generic rgba. Example: "linear-gradient(170deg, #1C191744 0%, transparent 30%, #9B233522 65%, #1C1917DD 100%)"
- Card hoverTransform: Be SPECIFIC. "translateY(-6px) rotate(0.3deg)" for playful, "scale(1.02)" for minimal.
- Card shadowOnHover: Use palette colors. "0 16px 48px rgba(155,35,53,0.12)" not generic gray.

CRITICAL: Return ONLY valid JSON. Fonts MUST be ${d.typography.displayFont} and ${d.typography.bodyFont}. Hero typography MUST match Director exactly.`;
}

// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildDirectorPrompt(
  input: StoreDesignInput,
  archetype: { id: string; name: string; tags: string[] },
  sectionPattern: SectionPattern[],
  representative: Composition | null | undefined,
): string {
  let p = `Brand: "${input.storeName}" in "${input.vertical}" vertical.`;
  if (input.sellerContext?.audience) p += `\nAudience: ${input.sellerContext.audience}`;
  if (input.sellerContext?.priceRange) p += `\nPrice: Rs.${input.sellerContext.priceRange.min}-${input.sellerContext.priceRange.max}`;
  if (input.sellerContext?.brandVibe) p += `\nVibe: ${input.sellerContext.brandVibe}`;
  if (input.productInfo?.names?.length) p += `\nProducts: ${input.productInfo.names.slice(0, 5).join(', ')}`;
  if (input.productInfo?.priceRange) p += `\nProduct prices: Rs.${input.productInfo.priceRange.min}-${input.productInfo.priceRange.max}`;
  if (input.sellerHints) p += `\nSeller says: "${input.sellerHints}"`;

  const sectionList = sectionPattern
    .map(s => `${s.type}${s.variant ? ` (${s.variant})` : ''}`)
    .join(' > ');
  p += `\n\nSections (${sectionPattern.length}): ${sectionList}`;
  p += `\nGenerate rhythm array with exactly ${sectionPattern.length} numbers.`;

  if (representative?.typography_hint) {
    p += `\nReference fonts: ${representative.typography_hint.heading_font} + ${representative.typography_hint.body_font}. Use or improve.`;
  }

  return p;
}

function buildStylistPrompt(
  input: StoreDesignInput,
  archetype: { id: string; name: string; design: any; tags: string[] },
  director: DirectorOutput,
): string {
  let p = `Generate complete design for "${input.storeName}" in "${input.vertical}".`;
  if (input.sellerContext?.audience) p += `\nAudience: ${input.sellerContext.audience}`;
  if (input.sellerContext?.brandVibe) p += `\nVibe: ${input.sellerContext.brandVibe}`;
  if (input.productInfo?.names?.length) p += `\nProducts: ${input.productInfo.names.slice(0, 5).join(', ')}`;
  if (input.productInfo?.priceRange) p += `\nPrices: Rs.${input.productInfo.priceRange.min}-${input.productInfo.priceRange.max}`;
  if (input.sellerHints) p += `\nSeller: "${input.sellerHints}"`;

  p += `\n\nArchetype starting point:\n${JSON.stringify(archetype.design, null, 2)}`;
  p += `\n\nDirector personality: "${director.brandPersonality}", mood: ${director.colorMood}`;
  p += `\nEXTRACT colors from product photos to match "${director.colorMood}" mood.`;

  return p;
}

// ============================================================
// MAIN PIPELINE — Two-Pass Orchestration
// ============================================================

export async function generateStoreDesign(input: StoreDesignInput): Promise<StoreDesignOutput> {
  const startTime = Date.now();
  const provider = env.AI_PROVIDER || 'openai';

  // Select archetype from composition library
  const archetype = selectArchetype(input.vertical, input.sellerContext);
  console.log(`[design-ai] Archetype: ${archetype.id} (${archetype.name}) | Provider: ${provider} | Pipeline: Director>Stylist`);

  const rawSectionPattern = archetype.section_pattern || [];
  const sectionPattern = sanitizeSectionPattern(rawSectionPattern);
  console.log(`[design-ai] Sections: ${rawSectionPattern.length} raw → ${sectionPattern.length} sanitized`);
  const representative = getRepresentativeComposition(archetype.id);

  // ── PASS 1: DIRECTOR (no images — text only, fast) ──
  const directorPrompt = buildDirectorPrompt(input, archetype, sectionPattern, representative);
  console.log('[design-ai] Pass 1: Director starting...');
  const t1 = Date.now();

  let directorRaw: string;
  if (provider === 'anthropic') {
    directorRaw = await callAnthropicText(DIRECTOR_SYSTEM, directorPrompt);
  } else {
    directorRaw = await callOpenAIText(DIRECTOR_SYSTEM, directorPrompt);
  }

  let director: DirectorOutput;
  try {
    const clean = directorRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    director = JSON.parse(clean);
    console.log(`[design-ai] Pass 1 OK (${Date.now() - t1}ms): font=${director.typography?.heroFontSize}, mood=${director.colorMood}, sig=${director.signatureEffect}`);
    console.log(`[design-ai] Rhythm: [${director.rhythm?.slice(0, 6).map(v => v.toFixed(1)).join(', ')}${(director.rhythm?.length || 0) > 6 ? '...' : ''}]`);
  } catch (e) {
    console.error('[design-ai] Director parse failed, using vertical defaults');
    director = getDefaultDirector(input.vertical, sectionPattern.length);
  }
  director = validateDirector(director, sectionPattern.length);

  // ── PASS 2: STYLIST (with product images) ──
  const stylistSystem = buildStylistSystem(director);
  const stylistPrompt = buildStylistPrompt(input, archetype, director);
  console.log('[design-ai] Pass 2: Stylist starting...');
  const t2 = Date.now();

  let stylistRaw: string;
  if (provider === 'anthropic') {
    stylistRaw = await callAnthropic(input, stylistPrompt, stylistSystem);
  } else {
    stylistRaw = await callOpenAI(input, stylistPrompt, stylistSystem);
  }

  let parsed: any;
  try {
    const clean = stylistRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(clean);
    console.log(`[design-ai] Pass 2 OK (${Date.now() - t2}ms)`);
  } catch (e) {
    console.error('[design-ai] Stylist parse failed, falling back to archetype design');
    return {
      design: archetype.design as any,
      storeBio: `Welcome to ${input.storeName}. Discover our curated collection.`,
      heroTagline: input.storeName,
      heroSubtext: 'Discover our latest collection',
      archetypeId: archetype.id,
      sectionLayout: sectionPattern,
      representativeStore: archetype.representative_source,
      directorDecisions: director,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // ── ENFORCE DIRECTOR DECISIONS (Stylist cannot override) ──
  if (parsed.design?.bespokeStyles?.hero) {
    parsed.design.bespokeStyles.hero.fontSize = director.typography.heroFontSize;
    parsed.design.bespokeStyles.hero.lineHeight = director.typography.heroLineHeight;
    parsed.design.bespokeStyles.hero.letterSpacing = director.typography.heroLetterSpacing;
  }
  if (parsed.design?.fonts) {
    parsed.design.fonts.display = director.typography.displayFont;
    parsed.design.fonts.body = director.typography.bodyFont;
  }

  // ── PASS 3: VALIDATOR (no API call — pure logic) ──
  const validation = validateDesignOutput(parsed.design, director);
  console.log(`[design-ai] Pass 3 Validator: score=${validation.score}/100 passed=${validation.passed}`);
  if (validation.corrections.length > 0) {
    console.log(`[design-ai] Corrections: ${validation.corrections.map(c => `${c.severity}:${c.field}`).join(', ')}`);
  }
  if (validation.autoFixed.length > 0) {
    console.log(`[design-ai] Auto-fixed: ${validation.autoFixed.join(', ')}`);
  }

  // Apply auto-fixed palette from validator
  if (parsed.design?.palette) {
    parsed.design.palette = validation.palette;
  }

  // If validation fails hard and we have budget for a re-run, log the corrective guidance
  // (Optional: uncomment to enable Stylist re-run on failure)
  // if (!validation.passed) {
  //   const guidance = buildCorrectiveGuidance(validation);
  //   console.warn(`[design-ai] Validator FAILED (${validation.score}). Corrective guidance:\n${guidance}`);
  //   // Could re-run Stylist here with `guidance` appended to the prompt
  // }

  // Merge Director rhythm into section layout
  const rhythm = director.rhythm || [];
  const enrichedLayout = sectionPattern.map((section, i) => ({
    ...section,
    vibeWeight: rhythm[i] ?? 1.0,
    colorIntensity: section.type === director.accentSectionType
      ? 'high' as const
      : undefined,
  }));

  // Fallback: if no section matched accent type, find closest
  if (!enrichedLayout.some(s => s.colorIntensity === 'high')) {
    const idx = findAccentSectionIndex(sectionPattern, rhythm);
    if (enrichedLayout[idx]) {
      enrichedLayout[idx] = { ...enrichedLayout[idx], colorIntensity: 'high' as const };
    }
  }

  const totalMs = Date.now() - startTime;
  const dirMs = t2 - t1;
  const styMs = Date.now() - t2;
  console.log(`[design-ai] Pipeline complete: ${totalMs}ms total (Director: ${dirMs}ms + Stylist: ${styMs}ms)`);

  return {
    design: parsed.design,
    storeBio: parsed.storeBio || `Welcome to ${input.storeName}. Discover our curated collection.`,
    heroTagline: parsed.heroTagline || input.storeName,
    heroSubtext: parsed.heroSubtext || 'Discover our latest collection',
    archetypeId: archetype.id,
    sectionLayout: enrichedLayout,
    representativeStore: archetype.representative_source,
    directorDecisions: director,
    processingTimeMs: totalMs,
  };
}

// ============================================================
// DEFAULTS & VALIDATION
// ============================================================

function getDefaultDirector(vertical: string, sectionCount: number): DirectorOutput {
  const defs: Record<string, Partial<DirectorOutput>> = {
    fashion: {
      typography: { heroFontSize: 'clamp(2.8rem, 9vw, 6rem)', heroLineHeight: '0.92', heroLetterSpacing: '-0.05em', displayFont: 'Playfair Display', bodyFont: 'DM Sans' },
      colorMood: 'warm-earthy', signatureEffect: 'parallax-drape', brandPersonality: 'elegant traditional', ctaShape: 'rounded', textureHint: 'none',
    },
    jewellery: {
      typography: { heroFontSize: 'clamp(3rem, 10vw, 7rem)', heroLineHeight: '0.88', heroLetterSpacing: '-0.06em', displayFont: 'Cormorant Garamond', bodyFont: 'Nunito Sans' },
      colorMood: 'dark-luxury', signatureEffect: 'sparkle-overlay', brandPersonality: 'luxurious heritage', ctaShape: 'sharp', textureHint: 'none',
    },
    beauty: {
      typography: { heroFontSize: 'clamp(2.2rem, 7vw, 4.5rem)', heroLineHeight: '1.0', heroLetterSpacing: '-0.03em', displayFont: 'Fraunces', bodyFont: 'Plus Jakarta Sans' },
      colorMood: 'clean-minimal', signatureEffect: 'organic-reveal', brandPersonality: 'clean natural', ctaShape: 'pill', textureHint: 'none',
    },
  };
  const d = defs[vertical] || defs.fashion!;
  return {
    typography: d.typography as DirectorOutput['typography'],
    rhythm: genDefaultRhythm(sectionCount),
    colorMood: d.colorMood || 'warm-earthy',
    signatureEffect: d.signatureEffect || 'none',
    accentSectionType: 'stats_bar',
    heroOverlayDirection: vertical === 'jewellery' ? 'radial-center-offset' : vertical === 'beauty' ? 'none' : '170deg diagonal',
    brandPersonality: d.brandPersonality || 'professional modern',
    ctaShape: d.ctaShape || 'rounded',
    textureHint: d.textureHint || 'none',
  };
}

function genDefaultRhythm(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) r.push(0.2);
    else if (i === 1) r.push(0.4);
    else if (i % 4 === 0) r.push(1.5);
    else if (i % 3 === 0) r.push(0.3);
    else r.push(Math.round((0.8 + Math.random() * 0.4) * 10) / 10);
  }
  return r;
}

function validateDirector(d: DirectorOutput, n: number): DirectorOutput {
  // Ensure rhythm array matches section count
  if (!d.rhythm || !d.rhythm.length) {
    d.rhythm = genDefaultRhythm(n);
  }
  while (d.rhythm.length < n) d.rhythm.push(1.0);
  if (d.rhythm.length > n) d.rhythm = d.rhythm.slice(0, n);
  d.rhythm = d.rhythm.map(v => Math.max(0.1, Math.min(2.0, v)));

  // Ensure typography
  if (!d.typography?.heroFontSize) {
    d.typography = { heroFontSize: 'clamp(2rem, 6vw, 3.5rem)', heroLineHeight: '1.0', heroLetterSpacing: '-0.03em', displayFont: 'Inter', bodyFont: 'Inter' };
  }

  // Validate signature effect
  const valid = ['parallax-drape', 'sparkle-overlay', 'organic-reveal', 'none'];
  if (!valid.includes(d.signatureEffect)) d.signatureEffect = 'none';

  return d;
}

/**
 * Sanitize archetype section patterns:
 * 1. Move hero sections to the top
 * 2. Deduplicate consecutive same-type sections
 * 3. Cap at 12 sections max
 * 4. Ensure sensible ordering (hero → content → social proof → footer-adjacent)
 */
function sanitizeSectionPattern(sections: SectionPattern[]): SectionPattern[] {
  if (!sections.length) return sections;

  // Separate hero and non-hero sections
  const heroes = sections.filter(s => s.type.startsWith('hero_'));
  const nonHeroes = sections.filter(s => !s.type.startsWith('hero_'));

  // Keep only the first hero (best one)
  const bestHero = heroes[0];

  // Deduplicate: keep max 1 of each type (except product sections which can repeat)
  const repeatAllowed = new Set(['product_carousel', 'featured_products', 'product_grid', 'collection_banner']);
  const seen = new Set<string>();
  const deduped: SectionPattern[] = [];
  for (const s of nonHeroes) {
    if (s.type === 'announcement_bar') continue; // Skip empty announcement bars
    if (!repeatAllowed.has(s.type) && seen.has(s.type)) continue;
    seen.add(s.type);
    deduped.push(s);
  }

  // Prioritize section ordering
  const topSections = ['trust_bar'];
  const midSections = ['category_grid', 'product_carousel', 'featured_products', 'product_grid', 'collection_banner'];
  const bottomSections = ['testimonials', 'testimonial_cards', 'stats_bar', 'newsletter', 'about_brand', 'ugc_gallery', 'logo_bar', 'video_section', 'quote_block'];

  const top = deduped.filter(s => topSections.includes(s.type));
  const mid = deduped.filter(s => midSections.includes(s.type));
  const bottom = deduped.filter(s => bottomSections.includes(s.type));
  const rest = deduped.filter(s => !topSections.includes(s.type) && !midSections.includes(s.type) && !bottomSections.includes(s.type));

  // Assemble: hero → trust → products/categories → social proof → rest
  const ordered = [
    ...(bestHero ? [bestHero] : []),
    ...top,
    ...mid,
    ...rest,
    ...bottom,
  ];

  // Cap at 12 sections
  const capped = ordered.slice(0, 12);

  // Re-assign positions
  return capped.map((s, i) => ({ ...s, position: i }));
}

function findAccentSectionIndex(sections: SectionPattern[], weights: number[]): number {
  const prefs = ['stats_bar', 'newsletter', 'testimonials', 'testimonial_cards', 'about_brand'];
  for (const t of prefs) {
    const i = sections.findIndex(s => s.type === t);
    if (i >= 0) return i;
  }
  let mx = Math.floor(sections.length / 2), mw = 0;
  weights.forEach((w, i) => { if (w > mw && i > 2) { mw = w; mx = i; } });
  return mx;
}

// ============================================================
// PROVIDERS — OpenAI
// ============================================================

async function callOpenAIText(sys: string, user: string): Promise<string> {
  const k = env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY not configured');

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return ((await r.json()) as any).choices?.[0]?.message?.content || '';
}

async function callOpenAI(input: StoreDesignInput, user: string, sys: string): Promise<string> {
  const k = env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY not configured');

  const content: any[] = input.productImages.slice(0, 3).map(img => ({
    type: 'image_url', image_url: { url: img, detail: 'low' },
  }));
  content.push({ type: 'text', text: user });

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content },
      ],
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return ((await r.json()) as any).choices?.[0]?.message?.content || '';
}

// ============================================================
// PROVIDERS — Anthropic
// ============================================================

async function callAnthropicText(sys: string, user: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const k = env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not configured');

  const c = new Anthropic({ apiKey: k });
  const r = await c.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });

  const t = r.content.find(b => b.type === 'text');
  if (!t || t.type !== 'text') throw new Error('No text from Director');
  return t.text;
}

async function callAnthropic(input: StoreDesignInput, user: string, sys: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const k = env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not configured');

  const c = new Anthropic({ apiKey: k });
  const imgs = input.productImages.slice(0, 3).map(img => {
    if (img.startsWith('data:')) {
      const [h, d] = img.split(',');
      const mt = h?.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      return { type: 'image' as const, source: { type: 'base64' as const, media_type: mt as any, data: d! } };
    }
    return { type: 'image' as const, source: { type: 'url' as const, url: img } };
  });

  const r = await c.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: sys,
    messages: [{ role: 'user', content: [...imgs, { type: 'text' as const, text: user }] }],
  });

  const t = r.content.find(b => b.type === 'text');
  if (!t || t.type !== 'text') throw new Error('No text from Stylist');
  return t.text;
}

// ============================================================
// WCAG CONTRAST VALIDATION
// ============================================================

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function adjustForContrast(color: string, background: string, target: number): string {
  const isLight = relativeLuminance(background) > 0.5;
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);

  for (let i = 0; i < 50; i++) {
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (contrastRatio(hex, background) >= target) return hex;
    if (isLight) { r = Math.max(0, r - 5); g = Math.max(0, g - 5); b = Math.max(0, b - 5); }
    else { r = Math.min(255, r + 5); g = Math.min(255, g + 5); b = Math.min(255, b + 5); }
  }
  return isLight ? '#1A1A2E' : '#F5F5F5';
}

export function validateAndFixPalette(palette: any): any {
  const f = { ...palette };
  if (!f.text || !f.background) return f;

  if (contrastRatio(f.text, f.background) < 4.5) {
    f.text = relativeLuminance(f.background) > 0.5 ? '#1A1A2E' : '#F5F5F5';
  }
  if (f.textMuted && contrastRatio(f.textMuted, f.background) < 3.0) {
    f.textMuted = relativeLuminance(f.background) > 0.5 ? '#6B6B80' : '#B0B0B0';
  }
  if (f.primary && contrastRatio(f.primary, f.background) < 3.0) {
    f.primary = adjustForContrast(f.primary, f.background, 3.0);
  }
  return f;
}
