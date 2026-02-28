import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';
import type { AiProductSuggestion } from '@tatparya/shared';

// ============================================================
// Catalog AI Service
// Uses Claude Vision to analyze product photos and generate
// complete product listings. This is the "magic moment".
// ============================================================

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// ============================================================
// Vertical-specific prompts for richer product data
// ============================================================

const VERTICAL_PROMPTS: Record<string, string> = {
  fashion: `For fashion products, also extract:
- fabric (cotton, silk, polyester, etc.)
- occasion (casual, formal, festive, party, etc.)
- pattern (solid, printed, striped, floral, etc.)
- sleeve type (short, long, sleeveless, 3/4th, etc.)
- fit (regular, slim, loose, etc.)
- wash care instructions
- suitable season (summer, winter, all-season)
Put these in verticalAttributes.`,

  jewellery: `For jewellery products, also extract:
- metal type (gold, silver, brass, artificial, etc.)
- gemstones if visible
- jewellery type (necklace, earring, bangle, ring, etc.)
- occasion (daily wear, wedding, festive, etc.)
- approximate weight category (light, medium, heavy)
Put these in verticalAttributes.`,

  beauty: `For beauty products, also extract:
- product type (lipstick, foundation, serum, etc.)
- skin type suitability if apparent
- key ingredients if visible on packaging
- brand name if visible
Put these in verticalAttributes.`,

  food: `For food products, also extract:
- food type (snack, spice, sweet, beverage, etc.)
- dietary info (vegetarian, vegan, gluten-free, etc.)
- shelf life if visible on packaging
- weight/quantity if visible
Put these in verticalAttributes.`,

  electronics: `For electronics products, also extract:
- product category (phone, headphone, charger, etc.)
- brand if visible
- key specs if visible (capacity, wattage, etc.)
- connectivity (bluetooth, USB-C, etc.)
Put these in verticalAttributes.`,

  general: '',
  fmcg: '',
  home_decor: `For home decor products, also extract:
- material (wood, ceramic, metal, fabric, etc.)
- dimensions estimate (small, medium, large)
- room suitability (living room, bedroom, kitchen, etc.)
- style (modern, traditional, bohemian, minimalist, etc.)
Put these in verticalAttributes.`,
};

// ============================================================
// Main: Generate product data from images
// ============================================================

export async function generateProductFromImages(params: {
  imageUrls: string[];
  vertical: string;
  hints?: {
    name?: string;
    category?: string;
    price?: number;
    description?: string;
  };
  language?: string;
}): Promise<{ suggestion: AiProductSuggestion; confidence: number; processingTimeMs: number }> {
  const startTime = Date.now();
  const client = getAnthropicClient();

  const verticalPrompt = VERTICAL_PROMPTS[params.vertical] || '';
  const hintsText = params.hints
    ? `\nSeller provided hints: ${JSON.stringify(params.hints)}`
    : '';

  const systemPrompt = `You are an expert e-commerce product catalog assistant for Indian sellers.
You analyze product photos and generate complete, SEO-optimized product listings.

Your output must be valid JSON matching this exact structure:
{
  "name": "Product name (max 300 chars, title case, include key attributes)",
  "description": "Detailed product description (3-5 paragraphs, max 5000 chars). Mention materials, use cases, care instructions. Write for Indian buyers. Include Hindi keywords naturally if appropriate.",
  "shortDescription": "One-line summary (max 200 chars) for product cards",
  "tags": ["tag1", "tag2", ...],  // 5-15 relevant tags for search
  "suggestedCategory": "Most specific category name",
  "suggestedPrice": {
    "min": 0,     // Minimum reasonable MRP in INR
    "max": 0,     // Maximum reasonable MRP in INR
    "confidence": "low|medium|high"
  },
  "seoMeta": {
    "title": "SEO title (max 70 chars)",
    "description": "SEO meta description (max 160 chars)",
    "keywords": ["keyword1", "keyword2", ...]
  },
  "verticalAttributes": {},  // Vertical-specific attributes
  "imageAlt": ["Alt text for image 1", "Alt text for image 2", ...],
  "hsnCodeSuggestion": "4-8 digit HSN code if identifiable"
}

Rules:
- Product names should be descriptive and include key attributes (color, material, style)
- Descriptions should be written for Indian buyers, mentioning relevant occasions and use cases
- Price suggestions should reflect Indian market pricing (not US/EU pricing)
- Tags should include both English and common Hindi/regional terms buyers might search
- HSN codes should be suggested based on product category (fashion = 6109 for t-shirts, 6204 for sarees, etc.)
- If you cannot determine something with confidence, omit it or mark confidence as "low"

${verticalPrompt}
${hintsText}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

  // Build image content blocks
  const imageContent: Anthropic.Messages.ImageBlockParam[] = params.imageUrls.map((url) => ({
    type: 'image' as const,
    source: {
      type: 'url' as const,
      url,
    },
  }));

  const userMessage: Anthropic.Messages.ContentBlockParam[] = [
    ...imageContent,
    {
      type: 'text' as const,
      text: `Analyze ${params.imageUrls.length === 1 ? 'this product photo' : 'these product photos'} and generate a complete product listing for an Indian e-commerce store. The store vertical is "${params.vertical}".`,
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON — strip any markdown fencing just in case
  const cleanJson = textBlock.text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: AiProductSuggestion;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse Claude response:', cleanJson.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${(e as Error).message}`);
  }

  // Calculate confidence based on response quality
  let confidence = 0.7;
  if (parsed.name && parsed.description && parsed.tags?.length > 3) confidence += 0.1;
  if (parsed.suggestedPrice?.confidence === 'high') confidence += 0.1;
  if (parsed.hsnCodeSuggestion) confidence += 0.05;
  if (parsed.verticalAttributes && Object.keys(parsed.verticalAttributes).length > 2) confidence += 0.05;
  confidence = Math.min(confidence, 1);

  return {
    suggestion: parsed,
    confidence,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================
// Batch: Analyze multiple products from grouped photos
// ============================================================

export async function generateBulkProducts(params: {
  imageGroups: { urls: string[]; hints?: { name?: string; price?: number } }[];
  vertical: string;
}): Promise<{ suggestions: (AiProductSuggestion & { groupIndex: number })[]; totalTimeMs: number }> {
  const startTime = Date.now();
  const results: (AiProductSuggestion & { groupIndex: number })[] = [];

  // Process sequentially to avoid rate limits (parallel with batching later)
  for (let i = 0; i < params.imageGroups.length; i++) {
    const group = params.imageGroups[i]!;
    try {
      const { suggestion } = await generateProductFromImages({
        imageUrls: group.urls,
        vertical: params.vertical,
        hints: group.hints ? { name: group.hints.name, price: group.hints.price } : undefined,
      });
      results.push({ ...suggestion, groupIndex: i });
    } catch (err) {
      console.error(`Failed to generate product for group ${i}:`, err);
      // Continue with other groups
    }
  }

  return {
    suggestions: results,
    totalTimeMs: Date.now() - startTime,
  };
}
