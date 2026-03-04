import { env } from '../env.js';

// ============================================================
// Photo Classifier Service
//
// Classifies uploaded photos into categories and scores quality.
// This runs AFTER the existing photo-triage (grouping) step
// and BEFORE enhancement.
//
// Categories:
//   product       → product cards, catalog images
//   lifestyle     → hero banner, collection banners
//   artisan       → about section, brand story
//   branding      → logo, visiting card → extract brand info
//   junk          → screenshots, blurry, irrelevant → flag
//
// Each photo gets:
//   - category (what it is)
//   - quality score (1-10)
//   - sectionHint (where to use it)
//   - enhancementNeeds (what processing to apply)
//   - retakeSuggestion (if quality is too low)
// ============================================================

export interface PhotoClassification {
  imageIndex: number;
  category: 'product' | 'lifestyle' | 'artisan' | 'branding' | 'junk';
  confidence: number;
  quality: {
    overall: number;        // 1-10
    lighting: number;       // 1-5
    composition: number;    // 1-5
    background: number;     // 1-5 (1=cluttered, 5=clean studio)
    resolution: 'low' | 'adequate' | 'good';
  };
  sectionHint: 'hero' | 'product_card' | 'about' | 'collection_banner' | 'og_image' | 'footer' | 'skip';
  enhancementNeeds: Array<'bg_removal' | 'lighting_fix' | 'white_balance' | 'crop' | 'sharpen' | 'upscale' | 'none'>;
  retakeSuggestion?: string;
  description: string;     // Brief description of what's in the photo
}

export interface ClassificationResult {
  classifications: PhotoClassification[];
  summary: {
    totalPhotos: number;
    usablePhotos: number;
    productPhotos: number;
    lifestylePhotos: number;
    artisanPhotos: number;
    junkPhotos: number;
    averageQuality: number;
    needsMorePhotos: boolean;
    suggestion?: string;
  };
  processingTimeMs: number;
}

const CLASSIFIER_PROMPT = `You are a product photo analyst for an Indian e-commerce store builder.

Given seller-uploaded photos, classify EACH photo and assess its quality for e-commerce use.

For EACH photo, return:
1. "category": What type of photo is this?
   - "product" — Clear shot of a product (even if background is messy)
   - "lifestyle" — Product being used/worn/displayed in context (person wearing jewellery, food on table, room with decor)
   - "artisan" — Behind-the-scenes: workshop, hands crafting, making process, raw materials
   - "branding" — Logo, visiting card, business card, brand label, packaging
   - "junk" — Screenshot, meme, WhatsApp forward, duplicate, completely blurry, not related to business

2. "quality": Score each dimension
   - "overall": 1-10 (below 4 = suggest retake)
   - "lighting": 1-5 (1=very dark/yellow tubelight, 5=natural/studio light)
   - "composition": 1-5 (1=product barely visible, 5=well framed)
   - "background": 1-5 (1=messy bedsheet/cluttered room, 5=clean white/solid)
   - "resolution": "low" (<500px), "adequate" (500-1200px), "good" (>1200px)

3. "sectionHint": Where should this photo be used on the store?
   - "hero" — Best lifestyle/context shot → main hero banner
   - "product_card" — Product photos → product grid cards
   - "about" — Artisan/workshop shots → about brand section
   - "collection_banner" — Good lifestyle shot → collection/category banners
   - "og_image" — Best overall product photo → social sharing preview
   - "footer" — Brand logo → footer section
   - "skip" — Junk or too low quality to use

4. "enhancementNeeds": What processing does this photo need?
   - "bg_removal" — Product on cluttered/messy background
   - "lighting_fix" — Yellow/dim lighting needs correction
   - "white_balance" — Color cast needs correction
   - "crop" — Product is too small in frame, needs cropping
   - "sharpen" — Slightly soft/out of focus (still usable)
   - "upscale" — Low resolution but usable content
   - "none" — Photo is already good enough

5. "retakeSuggestion": ONLY if overall quality < 4. Give a SHORT, friendly tip in simple English.
   Example: "This photo is too dark. Try taking it near a window with natural light."

6. "description": Brief description of what's in the photo (e.g., "gold necklace on red velvet cloth")

Return ONLY valid JSON:
{
  "classifications": [
    {
      "imageIndex": 0,
      "category": "product",
      "confidence": 0.95,
      "quality": { "overall": 7, "lighting": 4, "composition": 3, "background": 2, "resolution": "good" },
      "sectionHint": "product_card",
      "enhancementNeeds": ["bg_removal", "lighting_fix"],
      "description": "gold temple necklace on bedsheet"
    }
  ]
}

RULES:
- Be generous with "product" classification — a phone photo of jewellery on a bedsheet IS a product photo, just needs bg_removal
- A selfie wearing a product is "lifestyle", not "product"
- Visiting cards / business cards are "branding" — extract the business name in description
- If quality.overall >= 6, do NOT add retakeSuggestion
- Most Indian seller photos will need bg_removal + lighting_fix — that's fine and expected
- Don't be harsh. A decent phone photo with good natural light is quality 7+.
- CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;


export async function classifyPhotos(
  thumbnailDataUrls: string[],
  vertical?: string,
): Promise<ClassificationResult> {
  const startTime = Date.now();

  if (thumbnailDataUrls.length === 0) {
    return {
      classifications: [],
      summary: {
        totalPhotos: 0, usablePhotos: 0, productPhotos: 0,
        lifestylePhotos: 0, artisanPhotos: 0, junkPhotos: 0,
        averageQuality: 0, needsMorePhotos: true,
        suggestion: 'Please upload at least 3 product photos to get started.',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  const provider = env.AI_PROVIDER || 'openai';
  let rawText: string;

  const verticalHint = vertical
    ? `\nContext: This seller is in the "${vertical}" vertical. Classify accordingly.`
    : '';

  if (provider === 'anthropic') {
    rawText = await callAnthropicClassifier(thumbnailDataUrls, verticalHint);
  } else {
    rawText = await callOpenAIClassifier(thumbnailDataUrls, verticalHint);
  }

  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: { classifications: PhotoClassification[] };
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    console.error('[photo-classifier] Parse failed:', cleanJson.substring(0, 500));
    // Fallback: mark everything as product needing enhancement
    return {
      classifications: thumbnailDataUrls.map((_, i) => ({
        imageIndex: i,
        category: 'product' as const,
        confidence: 0.5,
        quality: { overall: 5, lighting: 3, composition: 3, background: 2, resolution: 'adequate' as const },
        sectionHint: 'product_card' as const,
        enhancementNeeds: ['bg_removal' as const, 'lighting_fix' as const],
        description: 'unclassified photo',
      })),
      summary: buildSummary(thumbnailDataUrls.map((_, i) => ({
        imageIndex: i, category: 'product' as const, confidence: 0.5,
        quality: { overall: 5, lighting: 3, composition: 3, background: 2, resolution: 'adequate' as const },
        sectionHint: 'product_card' as const, enhancementNeeds: ['bg_removal' as const, 'lighting_fix' as const],
        description: 'unclassified',
      }))),
      processingTimeMs: Date.now() - startTime,
    };
  }

  const classifications = normalizeClassifications(parsed.classifications, thumbnailDataUrls.length);
  const summary = buildSummary(classifications);

  return {
    classifications,
    summary,
    processingTimeMs: Date.now() - startTime,
  };
}


// ============================================================
// Post-classification: pick best photo for each section
// ============================================================

export interface SectionPhotoAssignment {
  hero: number | null;              // Best lifestyle or high-quality product
  productCards: number[];           // All product photos, quality-sorted
  about: number | null;             // Best artisan photo
  collectionBanner: number | null;  // Second-best lifestyle
  ogImage: number | null;           // Highest quality overall
  footer: number | null;            // Brand logo if available
  skipped: number[];                // Junk / too low quality
}

export function assignPhotosToSections(
  classifications: PhotoClassification[],
): SectionPhotoAssignment {
  const result: SectionPhotoAssignment = {
    hero: null,
    productCards: [],
    about: null,
    collectionBanner: null,
    ogImage: null,
    footer: null,
    skipped: [],
  };

  // Sort by quality descending for each category
  const byCategory = (cat: string) =>
    classifications
      .filter(c => c.category === cat)
      .sort((a, b) => b.quality.overall - a.quality.overall);

  const products = byCategory('product');
  const lifestyle = byCategory('lifestyle');
  const artisan = byCategory('artisan');
  const branding = byCategory('branding');
  const junk = byCategory('junk');

  // Hero: best lifestyle shot, or best product if no lifestyle
  if (lifestyle.length > 0) {
    result.hero = lifestyle[0]!.imageIndex;
  } else if (products.length > 0 && products[0]!.quality.overall >= 6) {
    result.hero = products[0]!.imageIndex;
  }

  // Product cards: all product photos with quality >= 3
  result.productCards = products
    .filter(p => p.quality.overall >= 3)
    .map(p => p.imageIndex);

  // About: best artisan photo
  if (artisan.length > 0) {
    result.about = artisan[0]!.imageIndex;
  }

  // Collection banner: second lifestyle, or second-best product
  if (lifestyle.length > 1) {
    result.collectionBanner = lifestyle[1]!.imageIndex;
  } else if (lifestyle.length === 1 && products.length > 0) {
    // If lifestyle is used for hero, use best product for collection
    result.collectionBanner = products[0]!.imageIndex;
  }

  // OG image: highest quality across all usable photos
  const allUsable = [...products, ...lifestyle, ...artisan]
    .sort((a, b) => b.quality.overall - a.quality.overall);
  if (allUsable.length > 0) {
    result.ogImage = allUsable[0]!.imageIndex;
  }

  // Footer: brand logo
  if (branding.length > 0) {
    result.footer = branding[0]!.imageIndex;
  }

  // Skipped: junk + very low quality
  result.skipped = [
    ...junk.map(j => j.imageIndex),
    ...classifications
      .filter(c => c.category !== 'junk' && c.quality.overall < 3)
      .map(c => c.imageIndex),
  ];

  return result;
}


// ============================================================
// Helpers
// ============================================================

function normalizeClassifications(
  raw: PhotoClassification[],
  totalPhotos: number,
): PhotoClassification[] {
  return raw.map(c => ({
    imageIndex: c.imageIndex ?? 0,
    category: (['product', 'lifestyle', 'artisan', 'branding', 'junk'] as const)
      .includes(c.category) ? c.category : 'product',
    confidence: Math.min(1, Math.max(0, c.confidence ?? 0.5)),
    quality: {
      overall: Math.min(10, Math.max(1, c.quality?.overall ?? 5)),
      lighting: Math.min(5, Math.max(1, c.quality?.lighting ?? 3)),
      composition: Math.min(5, Math.max(1, c.quality?.composition ?? 3)),
      background: Math.min(5, Math.max(1, c.quality?.background ?? 2)),
      resolution: (['low', 'adequate', 'good'] as const)
        .includes(c.quality?.resolution) ? c.quality.resolution : 'adequate',
    },
    sectionHint: c.sectionHint || 'product_card',
    enhancementNeeds: Array.isArray(c.enhancementNeeds) ? c.enhancementNeeds : ['bg_removal', 'lighting_fix'],
    retakeSuggestion: c.retakeSuggestion || undefined,
    description: c.description || 'photo',
  }));
}

function buildSummary(classifications: PhotoClassification[]): ClassificationResult['summary'] {
  const total = classifications.length;
  const junkCount = classifications.filter(c => c.category === 'junk').length;
  const productCount = classifications.filter(c => c.category === 'product').length;
  const lifestyleCount = classifications.filter(c => c.category === 'lifestyle').length;
  const artisanCount = classifications.filter(c => c.category === 'artisan').length;
  const usable = total - junkCount;
  const avgQuality = usable > 0
    ? classifications
        .filter(c => c.category !== 'junk')
        .reduce((s, c) => s + c.quality.overall, 0) / usable
    : 0;

  const needsMore = productCount < 2;
  let suggestion: string | undefined;

  if (productCount === 0) {
    suggestion = 'I don\'t see any clear product photos. Could you upload some photos of your products?';
  } else if (productCount < 3) {
    suggestion = `I found ${productCount} product photo${productCount === 1 ? '' : 's'}. Your store would look better with at least 3-4 photos per product.`;
  } else if (lifestyleCount === 0 && avgQuality < 6) {
    suggestion = 'Tip: A lifestyle photo (someone wearing/using your product) makes a great hero banner!';
  }

  return {
    totalPhotos: total,
    usablePhotos: usable,
    productPhotos: productCount,
    lifestylePhotos: lifestyleCount,
    artisanPhotos: artisanCount,
    junkPhotos: junkCount,
    averageQuality: Math.round(avgQuality * 10) / 10,
    needsMorePhotos: needsMore,
    suggestion,
  };
}


// ============================================================
// OpenAI Provider
// ============================================================

async function callOpenAIClassifier(thumbnailDataUrls: string[], verticalHint: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const content: any[] = thumbnailDataUrls.map((url) => ({
    type: 'image_url',
    image_url: { url, detail: 'low' },
  }));

  content.push({
    type: 'text',
    text: `Classify these ${thumbnailDataUrls.length} seller-uploaded photos for an Indian e-commerce store.${verticalHint}`,
  });

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
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI classifier error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}


// ============================================================
// Anthropic Provider
// ============================================================

async function callAnthropicClassifier(thumbnailDataUrls: string[], verticalHint: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey });

  const imageContent = thumbnailDataUrls.map((url) => {
    if (url.startsWith('data:')) {
      const [header, data] = url.split(',');
      const mediaType = header?.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mediaType as any, data: data! },
      };
    }
    return {
      type: 'image' as const,
      source: { type: 'url' as const, url },
    };
  });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: CLASSIFIER_PROMPT,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text' as const,
          text: `Classify these ${thumbnailDataUrls.length} seller-uploaded photos for an Indian e-commerce store.${verticalHint}`,
        },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
  return textBlock.text;
}
