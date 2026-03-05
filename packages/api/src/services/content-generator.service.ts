import { env } from '../env.js';

// ============================================================
// Content Generator Service
//
// Single LLM call (GPT-4o-mini / Haiku) to generate:
//   - testimonials (3 Indian customers)
//   - marquee phrases (5 short phrases)
//   - newsletter copy (heading + subtext)
//   - category suggestions (if none exist)
//
// Each field has a deterministic validator + fallback.
// ============================================================

export interface GeneratedContent {
  testimonials: { text: string; name: string; city: string; rating: number }[];
  marquee: string[];
  newsletter: { heading: string; subtext: string };
  categories: string[];
  processingTimeMs: number;
}

interface ContentInput {
  storeName: string;
  vertical: string;
  productNames?: string[];
  brandPersonality?: string;
}

// ============================================================
// System Prompt
// ============================================================

function buildContentPrompt(input: ContentInput): string {
  const products = input.productNames?.slice(0, 5).join(', ') || 'various products';

  return `You are a copywriter for an Indian e-commerce brand.

Brand: "${input.storeName}" in "${input.vertical}" vertical.
Products: ${products}
${input.brandPersonality ? `Brand personality: ${input.brandPersonality}` : ''}

Generate content for the store. Return ONLY valid JSON:
{
  "testimonials": [
    { "text": "1-2 sentence review (authentic Indian buyer voice)", "name": "Indian first name + last initial", "city": "Indian city", "rating": 5 },
    { "text": "...", "name": "...", "city": "...", "rating": 5 },
    { "text": "...", "name": "...", "city": "...", "rating": 4 }
  ],
  "marquee": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
  "newsletter": {
    "heading": "3-5 word heading for WhatsApp signup",
    "subtext": "One line (max 15 words) supporting text"
  },
  "categories": ["category1", "category2", "category3", "category4"]
}

RULES:
- Testimonials: Use realistic Indian names (Priya, Ananya, Rahul, Meera, Arjun, etc.) and cities (Mumbai, Delhi, Bangalore, Jaipur, Pune, Chennai, Kolkata, Hyderabad). Mix ratings (two 5-star, one 4-star). Reviews should feel authentic, not generic.
- Marquee: Short phrases like "Free Shipping on ₹499+", "COD Available", "100% Authentic", "Handpicked Quality", "Easy Returns". Mix functional (shipping/COD) with brand-feel phrases.
- Newsletter: Heading should be evocative, not "Subscribe Now". Examples: "Join the Inner Circle", "Be the First to Know", "Stay in the Loop".
- Categories: Suggest 4 product categories that make sense for this vertical and products. Use title case.

CRITICAL: Return ONLY valid JSON. No markdown, no backticks.`;
}

// ============================================================
// Deterministic Validators
// ============================================================

const FALLBACK_TESTIMONIALS: GeneratedContent['testimonials'] = [
  { text: 'Amazing quality! Will definitely order again.', name: 'Priya S.', city: 'Mumbai', rating: 5 },
  { text: 'Fast delivery and beautiful packaging.', name: 'Rahul M.', city: 'Delhi', rating: 5 },
  { text: 'Exactly as shown in the photos. Love it!', name: 'Anita K.', city: 'Bangalore', rating: 4 },
];

const FALLBACK_MARQUEE = ['Free Shipping on ₹499+', 'COD Available', 'Easy Returns', '100% Authentic', 'Secure Payments'];

const FALLBACK_NEWSLETTER = { heading: 'Get Updates on WhatsApp', subtext: 'New arrivals, exclusive offers & restocks — delivered to you.' };

function validateTestimonials(raw: any[]): GeneratedContent['testimonials'] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_TESTIMONIALS;

  const valid = raw
    .filter(t => t && typeof t.text === 'string' && t.text.length > 5 && typeof t.name === 'string')
    .slice(0, 3)
    .map(t => ({
      text: t.text.slice(0, 200),
      name: (t.name || 'Customer').slice(0, 30),
      city: (t.city || 'India').slice(0, 20),
      rating: Math.min(5, Math.max(3, Number(t.rating) || 5)),
    }));

  return valid.length >= 2 ? valid : FALLBACK_TESTIMONIALS;
}

function validateMarquee(raw: any[]): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_MARQUEE;

  const valid = raw
    .filter(s => typeof s === 'string' && s.length > 2 && s.length < 50)
    .slice(0, 6);

  return valid.length >= 3 ? valid : FALLBACK_MARQUEE;
}

function validateNewsletter(raw: any): GeneratedContent['newsletter'] {
  if (!raw || typeof raw.heading !== 'string' || raw.heading.length < 3) return FALLBACK_NEWSLETTER;
  return {
    heading: raw.heading.slice(0, 60),
    subtext: (raw.subtext || FALLBACK_NEWSLETTER.subtext).slice(0, 120),
  };
}

function validateCategories(raw: any[]): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .filter(s => typeof s === 'string' && s.length > 1 && s.length < 40)
    .slice(0, 6);
}

// ============================================================
// Main: Generate content
// ============================================================

export async function generateStoreContent(input: ContentInput): Promise<GeneratedContent> {
  const startTime = Date.now();
  const provider = env.AI_PROVIDER || 'openai';
  const prompt = buildContentPrompt(input);

  console.log(`[content-gen] Generating store content via ${provider}...`);

  let rawText: string;
  try {
    if (provider === 'anthropic') {
      rawText = await callAnthropicContent(prompt);
    } else {
      rawText = await callOpenAIContent(prompt);
    }
  } catch (err) {
    console.error('[content-gen] LLM call failed, using fallbacks:', err instanceof Error ? err.message : err);
    return {
      testimonials: FALLBACK_TESTIMONIALS,
      marquee: FALLBACK_MARQUEE,
      newsletter: FALLBACK_NEWSLETTER,
      categories: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Parse JSON
  const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    console.error('[content-gen] JSON parse failed, using fallbacks');
    return {
      testimonials: FALLBACK_TESTIMONIALS,
      marquee: FALLBACK_MARQUEE,
      newsletter: FALLBACK_NEWSLETTER,
      categories: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Validate each field independently
  const result: GeneratedContent = {
    testimonials: validateTestimonials(parsed.testimonials),
    marquee: validateMarquee(parsed.marquee),
    newsletter: validateNewsletter(parsed.newsletter),
    categories: validateCategories(parsed.categories),
    processingTimeMs: Date.now() - startTime,
  };

  console.log(`[content-gen] Done in ${result.processingTimeMs}ms — ${result.testimonials.length} testimonials, ${result.marquee.length} marquee, ${result.categories.length} categories`);
  return result;
}

// ============================================================
// Providers
// ============================================================

async function callOpenAIContent(prompt: string): Promise<string> {
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
        { role: 'system', content: 'You are a copywriter for Indian e-commerce brands. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return ((await r.json()) as any).choices?.[0]?.message?.content || '';
}

async function callAnthropicContent(prompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const k = env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not configured');

  const c = new Anthropic({ apiKey: k });
  const r = await c.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: 'You are a copywriter for Indian e-commerce brands. Return ONLY valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const t = r.content.find(b => b.type === 'text');
  if (!t || t.type !== 'text') throw new Error('No text from content generator');
  return t.text;
}
