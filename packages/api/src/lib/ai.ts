import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

// ============================================================
// Claude AI Client
//
// Uses Claude's vision capabilities to analyze product photos
// and generate complete product listings.
// ============================================================

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI catalog generation');
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

// ============================================================
// Product Analysis from Images
// ============================================================

export interface ProductAnalysisResult {
  name: string;
  description: string;
  shortDescription: string;
  suggestedPrice: number | null;
  suggestedCompareAtPrice: number | null;
  category: string;
  subcategory: string | null;
  tags: string[];
  hsnCode: string | null;
  gstRate: number | null;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  variantSuggestions: Array<{
    attributes: Record<string, string>;
    priceAdjustment?: number;
  }>;
  verticalData: Record<string, unknown>;
  altText: string;
  confidence: number;
}

export async function analyzeProductPhotos(params: {
  imageUrls: string[];
  vertical?: string;
  sellerHints?: string;
  storeName?: string;
  language?: string;
}): Promise<ProductAnalysisResult> {
  const ai = getClient();

  const verticalContext = getVerticalContext(params.vertical || 'general');

  const systemPrompt = `You are a world-class Indian e-commerce product listing expert. You specialize in creating compelling, SEO-optimized product listings for Indian online stores.

Your job: Analyze product photos and generate a COMPLETE, ready-to-publish product listing.

CRITICAL RULES:
- All prices in INR (₹)
- HSN codes must be valid 4-8 digit Indian Harmonized System codes
- GST rates must be one of: 0, 5, 12, 18, 28
- Descriptions should be engaging, detailed, and SEO-friendly (200-400 words)
- Tags should include material, occasion, style, color, pattern — 10-15 tags
- For fashion: ALWAYS suggest size variants (S, M, L, XL, XXL at minimum)
- For food/FMCG: suggest weight/quantity variants
- Category names should match Indian e-commerce conventions
- SEO title max 70 chars, SEO description max 160 chars

${verticalContext}

RESPOND ONLY WITH VALID JSON. No markdown, no backticks, no explanation.`;

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  // Add images
  for (const url of params.imageUrls) {
    userContent.push({
      type: 'image',
      source: { type: 'url', url },
    });
  }

  // Add text prompt
  let textPrompt = 'Analyze the product photo(s) above and generate a complete product listing.';

  if (params.sellerHints) {
    textPrompt += `\n\nSeller notes: "${params.sellerHints}"`;
  }
  if (params.storeName) {
    textPrompt += `\nStore: ${params.storeName}`;
  }
  if (params.language && params.language !== 'en') {
    textPrompt += `\nGenerate description in ${params.language === 'hi' ? 'Hindi' : 'Hinglish (Hindi-English mix)'}. Keep tags and SEO in English.`;
  }

  textPrompt += `

Return this EXACT JSON structure:
{
  "name": "Product Name (concise, compelling, max 100 chars)",
  "description": "Detailed description 200-400 words, SEO-optimized, highlight features/materials/occasions",
  "shortDescription": "One-liner for product cards, max 150 chars",
  "suggestedPrice": 999,
  "suggestedCompareAtPrice": 1499,
  "category": "Main Category",
  "subcategory": "Subcategory or null",
  "tags": ["tag1", "tag2", "...up to 15"],
  "hsnCode": "6204",
  "gstRate": 12,
  "seoTitle": "SEO Title max 70 chars",
  "seoDescription": "SEO meta description max 160 chars",
  "seoKeywords": ["keyword1", "keyword2", "...up to 10"],
  "variantSuggestions": [
    {"attributes": {"size": "S"}, "priceAdjustment": 0},
    {"attributes": {"size": "M"}, "priceAdjustment": 0}
  ],
  "verticalData": {},
  "altText": "Descriptive alt text for accessibility",
  "confidence": 0.85
}`;

  userContent.push({ type: 'text', text: textPrompt });

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  // Extract text from response
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON — strip any markdown fences just in case
  const jsonStr = textBlock.text
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const result = JSON.parse(jsonStr) as ProductAnalysisResult;

    // Sanitize/validate
    result.confidence = Math.min(1, Math.max(0, result.confidence || 0.5));
    result.tags = (result.tags || []).slice(0, 20);
    result.seoKeywords = (result.seoKeywords || []).slice(0, 10);
    result.seoTitle = (result.seoTitle || result.name).slice(0, 70);
    result.seoDescription = (result.seoDescription || result.shortDescription || '').slice(0, 160);

    return result;
  } catch (err) {
    console.error('Failed to parse AI response:', jsonStr);
    throw new Error(`AI returned invalid JSON: ${(err as Error).message}`);
  }
}

// ============================================================
// Vertical-Specific Context
// ============================================================

function getVerticalContext(vertical: string): string {
  const contexts: Record<string, string> = {
    fashion: `FASHION VERTICAL CONTEXT:
- Indian fashion categories: Sarees, Kurtis, Lehengas, Salwar Suits, Western Wear, Ethnic Wear, Fusion Wear
- Important attributes: Fabric (cotton, silk, georgette, chiffon, crepe, linen, rayon), Occasion (casual, festive, wedding, party, office), Work type (embroidered, printed, handloom, block print, bandhani, chikankari, zari)
- Common HSN codes: 6204 (women's suits), 6206 (women's blouses), 6201 (men's overcoats), 6203 (men's suits), 6205 (men's shirts), 5208 (cotton fabrics), 5407 (synthetic fabrics)
- Fashion GST is typically 5% (below ₹1000) or 12% (₹1000 and above)
- ALWAYS suggest size variants: XS, S, M, L, XL, XXL, 3XL
- For sarees, suggest blouse piece as included/not included`,

    fmcg: `FMCG VERTICAL CONTEXT:
- Categories: Spices, Snacks, Beverages, Personal Care, Home Care, Dairy, Packaged Foods
- Important: Shelf life, Net weight, Ingredients list, FSSAI license number reference
- Suggest weight/quantity variants (100g, 250g, 500g, 1kg)
- Common HSN: 0904 (pepper/chili), 0910 (ginger/turmeric), 2106 (food preparations)
- GST rates vary: 0% (fresh), 5% (packaged), 12% (processed), 18% (premium)`,

    electronics: `ELECTRONICS VERTICAL CONTEXT:
- Categories: Mobile Accessories, Audio, Wearables, Computer Peripherals, Home Appliances
- Important: Warranty info, specifications, compatibility, power rating
- HSN codes: 8518 (audio), 8517 (mobile accessories), 8528 (monitors)
- Most electronics at 18% GST
- Suggest color/storage variants where applicable`,

    jewellery: `JEWELLERY VERTICAL CONTEXT:
- Categories: Necklaces, Earrings, Bangles, Rings, Anklets, Nose Pins, Mangalsutra
- Important: Material (gold, silver, artificial, oxidized, kundan, meenakari), Weight, Purity (if applicable)
- HSN codes: 7113 (articles of precious metal), 7117 (imitation jewellery)
- Gold jewellery: 3% GST, Imitation: 5-12% GST
- Include care instructions in description`,

    beauty: `BEAUTY VERTICAL CONTEXT:
- Categories: Skincare, Haircare, Makeup, Fragrances, Ayurvedic, Natural/Organic
- Important: Ingredients, Skin type, Volume/weight, Usage instructions
- HSN codes: 3304 (beauty preparations), 3305 (hair preparations), 3307 (perfumery)
- Typically 18% GST for cosmetics, 12% for Ayurvedic
- Suggest size variants (travel/regular/family size)`,

    food: `FOOD VERTICAL CONTEXT:
- Categories: Homemade, Pickles, Sweets, Snacks, Organic, Regional Specialties
- FSSAI compliance is critical — mention in description
- HSN codes: 2008 (preserved fruits), 2103 (sauces/condiments), 1704 (sweets)
- GST: 0% unbranded/unpackaged, 5% branded/packaged
- Shelf life and storage instructions are essential
- Suggest quantity variants`,

    home_decor: `HOME DECOR VERTICAL CONTEXT:
- Categories: Wall Art, Cushions, Rugs, Candles, Vases, Handicrafts, Furniture
- Important: Dimensions, Material, Care instructions, Style (modern, traditional, boho, minimalist)
- HSN codes: 9403 (furniture), 5805 (tapestries), 6302 (bed/table linen), 9405 (lamps)
- GST varies: 12% (handicrafts), 18% (furniture, lamps)
- Emphasize Indian craftsmanship and artisan stories`,

    general: `GENERAL VERTICAL:
- Use your best judgment for category, HSN code, and GST rate
- Focus on clear, compelling descriptions
- Suggest relevant variants based on the product type`,
  };

  return contexts[vertical] || contexts['general']!;
}
