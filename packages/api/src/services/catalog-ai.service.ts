import { env } from '../env.js';
import type { AiProductSuggestion } from '@tatparya/shared';

// ============================================================
// Catalog AI Service
//
// Analyzes product photos and generates complete listings.
// Supports two providers:
//   - openai  (GPT-4o) — default
//   - anthropic (Claude Sonnet)
//
// Set AI_PROVIDER=openai or AI_PROVIDER=anthropic in .env.local
// ============================================================

// ============================================================
// Vertical-specific prompts
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
// Shared system prompt (same for both providers)
// ============================================================

function buildSystemPrompt(vertical: string, hints?: Record<string, unknown>): string {
  const verticalPrompt = VERTICAL_PROMPTS[vertical] || '';
  const hintsText = hints
    ? `\nSeller provided hints: ${JSON.stringify(hints)}`
    : '';

  return `You are an expert e-commerce product catalog assistant for Indian sellers.
You analyze product photos and generate complete, SEO-optimized product listings.

Your output must be valid JSON matching this exact structure:
{
  "name": "Product name (max 300 chars, title case, include key attributes)",
  "description": "Detailed product description (3-5 paragraphs, max 5000 chars). Mention materials, use cases, care instructions. Write for Indian buyers.",
  "shortDescription": "One-line summary (max 200 chars) for product cards",
  "tags": ["tag1", "tag2", ...],
  "suggestedCategory": "Most specific category name",
  "suggestedPrice": {
    "min": 0,
    "max": 0,
    "confidence": "low|medium|high"
  },
  "seoMeta": {
    "title": "SEO title (max 70 chars)",
    "description": "SEO meta description (max 160 chars)",
    "keywords": ["keyword1", "keyword2", ...]
  },
  "verticalAttributes": {},
  "imageAlt": ["Alt text for image 1", "Alt text for image 2", ...],
  "hsnCodeSuggestion": "4-8 digit HSN code if identifiable"
}

Rules:
- Product names should be descriptive and include key attributes (color, material, style)
- Descriptions should be written for Indian buyers, mentioning relevant occasions and use cases
- Price suggestions should reflect Indian market pricing (not US/EU pricing)
- Tags should include both English and common Hindi/regional terms buyers might search
- HSN codes should be suggested based on product category
- If you cannot determine something with confidence, omit it or mark confidence as "low"

${verticalPrompt}
${hintsText}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.`;
}

// ============================================================
// OpenAI Provider (GPT-4o with vision)
// ============================================================

async function generateWithOpenAI(params: {
  imageUrls: string[];
  vertical: string;
  hints?: Record<string, unknown>;
}): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Add it to .env.local');
  }

  const systemPrompt = buildSystemPrompt(params.vertical, params.hints);

  // Build content array with images
  const content: any[] = params.imageUrls.map((url) => ({
    type: 'image_url',
    image_url: { url, detail: 'high' },
  }));

  content.push({
    type: 'text',
    text: `Analyze ${params.imageUrls.length === 1 ? 'this product photo' : 'these product photos'} and generate a complete product listing for an Indian e-commerce store. The store vertical is "${params.vertical}".`,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ============================================================
// Anthropic Provider (Claude Sonnet with vision)
// ============================================================

async function generateWithAnthropic(params: {
  imageUrls: string[];
  vertical: string;
  hints?: Record<string, unknown>;
}): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to .env.local');
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(params.vertical, params.hints);

  const imageContent = params.imageUrls.map((url) => ({
    type: 'image' as const,
    source: { type: 'url' as const, url },
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text' as const,
          text: `Analyze ${params.imageUrls.length === 1 ? 'this product photo' : 'these product photos'} and generate a complete product listing for an Indian e-commerce store. The store vertical is "${params.vertical}".`,
        },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }
  return textBlock.text;
}

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
  const provider = env.AI_PROVIDER || 'openai';

  console.log(`[catalog-ai] Using ${provider} provider for ${params.imageUrls.length} images`);

  let rawText: string;

  if (provider === 'anthropic') {
    rawText = await generateWithAnthropic(params);
  } else {
    rawText = await generateWithOpenAI(params);
  }

  // Parse JSON — strip any markdown fencing just in case
  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: AiProductSuggestion;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse AI response:', cleanJson.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${(e as Error).message}`);
  }

  // Calculate confidence
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
    }
  }

  return {
    suggestions: results,
    totalTimeMs: Date.now() - startTime,
  };
}
