import { env } from '../env.js';
import type { PhotoClassification } from './photo-classifier.service.js';
import type { EnhancementResult } from './photo-enhancer.service.js';

// ============================================================
// Photo Quality Gate Service
//
// After enhancement, scores the PROCESSED photos for
// e-commerce readiness. This is the final check before
// photos go live on the store.
//
// Two modes:
//   1. Fast gate (no API call) — heuristic based on
//      classification + enhancement metadata
//   2. Vision gate (API call) — re-scores with Claude Vision
//      on the enhanced image. Use for hero/og images only.
//
// The gate does NOT block publishing. It returns:
//   - publishReady: boolean (safe to go live)
//   - score: 1-10
//   - nudge: optional message to seller
//   - tier: 'draft' | 'standard' | 'premium'
// ============================================================

export interface QualityGateResult {
  imageIndex: number;
  publishReady: boolean;
  score: number;           // 1-10
  tier: 'draft' | 'standard' | 'premium';
  nudge?: string;          // Friendly suggestion to seller
}

export interface StoreReadinessResult {
  overallReady: boolean;
  overallScore: number;    // Average of all photo scores
  photoResults: QualityGateResult[];
  heroReady: boolean;
  minimumProductPhotos: boolean;  // At least 3 product photos
  suggestions: string[];
}


// ============================================================
// Fast Gate: Heuristic scoring (no API call)
// ============================================================

export function fastQualityGate(
  classification: PhotoClassification,
  enhancement: EnhancementResult,
): QualityGateResult {
  let score = classification.quality.overall;

  // Bonus for successful enhancement
  if (enhancement.success) {
    const applied = enhancement.metadata?.enhancementsApplied || [];

    // Background removal gives a big quality boost
    if (applied.includes('bg_removal')) {
      score = Math.min(10, score + 2);
    }

    // Lighting fix helps
    if (applied.includes('lighting_fix')) {
      score = Math.min(10, score + 1);
    }

    // Good resolution after processing
    if (enhancement.metadata) {
      const { width, height } = enhancement.metadata;
      if (width >= 1200 && height >= 1200) {
        score = Math.min(10, score + 0.5);
      } else if (width < 400 || height < 400) {
        score = Math.max(1, score - 1);
      }
    }
  } else {
    // Enhancement failed — lower the score
    score = Math.max(1, score - 2);
  }

  // Category-specific adjustments
  if (classification.category === 'lifestyle' && classification.quality.composition >= 4) {
    score = Math.min(10, score + 0.5);  // Good lifestyle photos are valuable
  }

  score = Math.round(score * 10) / 10;

  const tier = score >= 8 ? 'premium' : score >= 5 ? 'standard' : 'draft';
  const publishReady = score >= 4;  // Very generous — don't block sellers

  let nudge: string | undefined;
  if (score < 4) {
    nudge = classification.retakeSuggestion || 'This photo might not look great on your store. Consider retaking with better lighting.';
  } else if (score < 6 && classification.quality.lighting <= 2) {
    nudge = 'Tip: Photos near a window with natural light look much better!';
  } else if (score < 6 && classification.quality.background <= 2 && !enhancement.metadata?.enhancementsApplied.includes('bg_removal')) {
    nudge = 'Tip: A clean, uncluttered background makes your product stand out.';
  }

  return {
    imageIndex: classification.imageIndex,
    publishReady,
    score,
    tier,
    nudge,
  };
}


// ============================================================
// Vision Gate: Claude Vision re-scoring (API call)
//
// Use sparingly — only for hero images and og:image
// where quality really matters for first impression.
// ============================================================

export async function visionQualityGate(
  enhancedImageDataUrl: string,
  classification: PhotoClassification,
): Promise<QualityGateResult> {
  const provider = env.AI_PROVIDER || 'openai';

  const prompt = `Rate this product photo for e-commerce use on a scale of 1-10.
Consider: clarity, lighting quality, product visibility, background cleanliness, overall appeal.

Return ONLY JSON:
{
  "score": 8,
  "strengths": ["good lighting", "clean background"],
  "weaknesses": ["slightly soft focus"],
  "suggestion": "optional short tip if score < 7"
}`;

  try {
    let rawText: string;

    if (provider === 'anthropic') {
      rawText = await callAnthropicGate(enhancedImageDataUrl, prompt);
    } else {
      rawText = await callOpenAIGate(enhancedImageDataUrl, prompt);
    }

    const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(clean);
    const score = Math.min(10, Math.max(1, parsed.score || 5));

    return {
      imageIndex: classification.imageIndex,
      publishReady: score >= 4,
      score,
      tier: score >= 8 ? 'premium' : score >= 5 ? 'standard' : 'draft',
      nudge: score < 7 ? parsed.suggestion : undefined,
    };
  } catch {
    // Fallback to fast gate
    return {
      imageIndex: classification.imageIndex,
      publishReady: true,
      score: classification.quality.overall,
      tier: 'standard',
    };
  }
}


// ============================================================
// Store Readiness: aggregate all photo scores
// ============================================================

export function assessStoreReadiness(
  gateResults: QualityGateResult[],
  heroIndex: number | null,
): StoreReadinessResult {
  const productResults = gateResults.filter(r => r.publishReady);
  const avgScore = productResults.length > 0
    ? productResults.reduce((s, r) => s + r.score, 0) / productResults.length
    : 0;

  const heroResult = heroIndex !== null
    ? gateResults.find(r => r.imageIndex === heroIndex)
    : null;
  const heroReady = heroResult ? heroResult.score >= 5 : false;

  const minProducts = productResults.length >= 3;

  const suggestions: string[] = [];

  if (!heroReady && heroIndex !== null) {
    suggestions.push('Your hero banner image could be better. A lifestyle photo with good lighting would make a stronger first impression.');
  }

  if (!minProducts) {
    suggestions.push(`You have ${productResults.length} usable product photos. Adding more will make your store look fuller and more trustworthy.`);
  }

  if (avgScore < 5) {
    suggestions.push('Overall photo quality is below average. Taking photos near a window with natural light can make a big difference!');
  }

  const premiumCount = gateResults.filter(r => r.tier === 'premium').length;
  if (premiumCount === 0 && productResults.length > 0) {
    suggestions.push('None of your photos scored as premium quality. Consider investing in a few professional product shots for your best sellers.');
  }

  // Always allow publishing — don't gate the seller
  const overallReady = productResults.length >= 1;

  return {
    overallReady,
    overallScore: Math.round(avgScore * 10) / 10,
    photoResults: gateResults,
    heroReady,
    minimumProductPhotos: minProducts,
    suggestions,
  };
}


// ============================================================
// API Providers
// ============================================================

async function callOpenAIGate(imageDataUrl: string, prompt: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',     // Cheap model for scoring
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI gate error: ${response.status}`);
  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '{}';
}

async function callAnthropicGate(imageDataUrl: string, prompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const client = new Anthropic({ apiKey });

  let imageBlock: any;
  if (imageDataUrl.startsWith('data:')) {
    const [header, data] = imageDataUrl.split(',');
    const mediaType = header?.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    imageBlock = { type: 'image', source: { type: 'base64', media_type: mediaType, data: data! } };
  } else {
    imageBlock = { type: 'image', source: { type: 'url', url: imageDataUrl } };
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [imageBlock, { type: 'text', text: prompt }],
    }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text');
  return textBlock.text;
}
