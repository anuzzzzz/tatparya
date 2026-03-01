import { env } from '../env.js';

// ============================================================
// Photo Triage AI Service (Call 0)
//
// Given N product photos as thumbnails, determines:
// 1. Which photos show the same physical product (grouping)
// 2. Which photos have quality issues (blurry, dark, etc.)
//
// This runs BEFORE catalog generation (Call 1) and store design
// (Call 2) to correctly group photos into products.
//
// Uses detail:'low' (85 tokens/image) since we only need
// visual similarity, not fine detail.
// Cost: 5 images × 85 tokens = 425 input tokens ≈ $0.005
// ============================================================

export interface TriageGroup {
  imageIndices: number[];
  confidence: number;
  label: string;
}

export interface QualityFlag {
  imageIndex: number;
  issue: 'blurry' | 'dark' | 'too_small' | 'not_product' | null;
}

export interface TriageResult {
  groups: TriageGroup[];
  qualityFlags: QualityFlag[];
  needsConfirmation: boolean;
  confirmationMessage?: string;
  processingTimeMs: number;
}

const SYSTEM_PROMPT = `You are a product photo analyst for an Indian e-commerce platform.

Given N product photos, determine:
1. Which photos show the SAME physical product (different angles/lighting of one item)
2. Which photos show DIFFERENT products
3. Any quality issues with individual photos

Return ONLY valid JSON:
{
  "groups": [
    {
      "imageIndices": [0, 1],
      "confidence": 0.95,
      "label": "cream leather crossbody bag"
    },
    {
      "imageIndices": [2, 3, 4],
      "confidence": 0.9,
      "label": "brown tote bag with gold hardware"
    }
  ],
  "qualityFlags": [
    { "imageIndex": 2, "issue": "blurry" }
  ]
}

Rules:
- imageIndices are 0-based, matching the order images were provided
- confidence: 0-1, how sure you are that the photos in a group are the same product
- label: brief description of the product in that group
- qualityFlags.issue: "blurry" | "dark" | "too_small" | "not_product" | null
- If ALL photos are clearly one product, return a single group
- If ALL photos are clearly different products, return one group per photo
- When uncertain, err on the side of splitting (safer than wrong merging)

CRITICAL: Return ONLY valid JSON. No markdown, no backticks.`;

// ============================================================
// Main: Triage photos
// ============================================================

export async function triagePhotos(
  thumbnailDataUrls: string[],
): Promise<TriageResult> {
  const startTime = Date.now();

  // Single photo — no grouping needed
  if (thumbnailDataUrls.length === 1) {
    return {
      groups: [{ imageIndices: [0], confidence: 1.0, label: 'single product' }],
      qualityFlags: [],
      needsConfirmation: false,
      processingTimeMs: Date.now() - startTime,
    };
  }

  const provider = env.AI_PROVIDER || 'openai';
  let rawText: string;

  if (provider === 'anthropic') {
    rawText = await callAnthropicTriage(thumbnailDataUrls);
  } else {
    rawText = await callOpenAITriage(thumbnailDataUrls);
  }

  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: { groups: TriageGroup[]; qualityFlags: QualityFlag[] };
  try {
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    console.error('[photo-triage] Failed to parse:', cleanJson.substring(0, 500));
    // Fallback: treat each photo as a separate product
    return {
      groups: thumbnailDataUrls.map((_, i) => ({
        imageIndices: [i],
        confidence: 0.5,
        label: `product ${i + 1}`,
      })),
      qualityFlags: [],
      needsConfirmation: true,
      confirmationMessage: 'I couldn\'t analyze the photos clearly. Are these all separate products, or are some photos of the same item?',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Validate and normalize
  const groups = (parsed.groups || []).map((g) => ({
    imageIndices: g.imageIndices || [],
    confidence: Math.min(1, Math.max(0, g.confidence || 0)),
    label: g.label || 'unknown product',
  }));

  const qualityFlags = (parsed.qualityFlags || []).map((f) => ({
    imageIndex: f.imageIndex,
    issue: f.issue,
  }));

  // Determine if we need user confirmation
  const needsConfirmation = determineIfConfirmationNeeded(groups, thumbnailDataUrls.length);
  const confirmationMessage = needsConfirmation
    ? buildConfirmationMessage(groups)
    : undefined;

  return {
    groups,
    qualityFlags,
    needsConfirmation,
    confirmationMessage,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================
// Confirmation Logic
// ============================================================

function determineIfConfirmationNeeded(groups: TriageGroup[], totalImages: number): boolean {
  // Any group with low confidence
  if (groups.some((g) => g.confidence < 0.8)) return true;

  // All images in one group but more than 3 photos — could be multiple products
  if (groups.length === 1 && totalImages > 3) return true;

  // No groups returned
  if (groups.length === 0) return true;

  return false;
}

function buildConfirmationMessage(groups: TriageGroup[]): string {
  if (groups.length === 1) {
    return `I see ${groups[0]!.imageIndices.length} photos. Are these all different angles of one product ("${groups[0]!.label}"), or are some of them separate products?`;
  }

  const descriptions = groups
    .map((g, i) => `${i + 1}. ${g.label} (${g.imageIndices.length} photo${g.imageIndices.length > 1 ? 's' : ''})`)
    .join('\n');

  return `I think I see ${groups.length} different products:\n${descriptions}\n\nDoes this look right?`;
}

// ============================================================
// OpenAI Provider
// ============================================================

async function callOpenAITriage(thumbnailDataUrls: string[]): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const content: any[] = thumbnailDataUrls.map((url, i) => ({
    type: 'image_url',
    image_url: { url, detail: 'low' },  // Low detail — 85 tokens/image
  }));

  content.push({
    type: 'text',
    text: `I have ${thumbnailDataUrls.length} product photos. Analyze which photos show the same product and which show different products. Also flag any quality issues.`,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI triage error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// ============================================================
// Anthropic Provider
// ============================================================

async function callAnthropicTriage(thumbnailDataUrls: string[]): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text' as const,
          text: `I have ${thumbnailDataUrls.length} product photos. Analyze which photos show the same product and which show different products. Also flag any quality issues.`,
        },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text response');
  return textBlock.text;
}
