import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';
import {
  type LLMRouterOutput,
  type StoreSnapshot,
  type ConversationTurn,
  LLMRouterOutput as LLMRouterOutputSchema,
  generateActionSchemaReference,
} from '@tatparya/shared';
import { FONT_PAIRINGS } from '@tatparya/shared';

// ============================================================
// Chat LLM Service
//
// The brain of Tatparya. Takes a seller message + store context,
// calls Claude 3 Haiku, returns structured Action[] + response.
//
// Key design choices:
// - System prompt is cached (cache_control: ephemeral) —
//   the 2,500-token schema reference is identical across calls
// - Full store snapshot injected every call — no multi-turn
//   ambiguity ("which saree?" is resolved by seeing the product list)
// - Model: claude-3-haiku-20240307 for cost efficiency
//   (~₹0.12/call with caching at 10 sellers scale)
// ============================================================

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for the chat LLM router');
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

// ============================================================
// System Prompt (cached across calls)
// ============================================================

function buildSystemPrompt(): string {
  const actionRef = generateActionSchemaReference();

  const fontPairings = FONT_PAIRINGS.map(
    (f) => `  ${f.id}: display="${f.display}", body="${f.body}" (${f.mood})`,
  ).join('\n');

  return `You are the AI brain of Tatparya, an Indian e-commerce store builder. Sellers chat with you in English to create and customize their online stores.

YOUR JOB: Read the seller's message, understand their intent, and return a JSON object with:
1. "actions" — an array of mutations to execute (can be empty for conversational messages)
2. "response" — what to say back to the seller (1-2 sentences, friendly, professional)
3. "followUp" — if you need more information before acting (optional)
4. "confirmationNeeded" — for destructive actions like delete/cancel (optional)
5. "suggestions" — 1-2 suggested next actions (optional)

RESPONSE FORMAT — Return ONLY valid JSON matching this structure:
{
  "actions": [{ "type": "action.type", "payload": { ... } }],
  "response": "Brief response text",
  "followUp": "Question if needed (optional)",
  "confirmationNeeded": { "summary": "...", "actions": [...] } (optional),
  "suggestions": [{ "label": "...", "description": "..." }] (optional)
}

${actionRef}

AVAILABLE FONT PAIRINGS:
${fontPairings}

DESIGN TOKEN OPTIONS:
- layout: minimal, magazine, catalog_grid, single_product_hero, boutique, editorial, marketplace
- spacing: airy, balanced, compact, ultra_minimal
- radius: sharp, subtle, rounded, pill
- imageStyle: raw, subtle_shadow, border_frame, hover_zoom, rounded
- animation: none, fade, slide_up, bounce, staggered
- hero.style: full_bleed, split_image, gradient, carousel, video, minimal_text, parallax
- hero.height: full, half, auto
- productCard.style: minimal, hover_reveal, quick_view, editorial, compact, list, swipe
- productCard.imageRatio: 3:4, 1:1, 4:3, 16:9
- nav.style: top_bar, hamburger, sidebar, bottom_tab, sticky_minimal, mega_menu, search_first
- collection.style: masonry, uniform_grid, list, lookbook, filterable_sidebar

RULES:
- Use ₹ for all prices. Indian context always.
- Keep responses SHORT — 1-2 sentences for simple actions. No essays.
- If the seller asks something you can't handle with actions, respond conversationally with an empty actions array.
- If ambiguous (e.g. "change the price" but no product specified), use "followUp" to ask ONE clarifying question.
- For destructive actions (delete product, cancel order, deactivate discount), ALWAYS set "confirmationNeeded".
- When generating palettes, ALWAYS include all 8 colors: primary, secondary, accent, background, surface, text, textMuted, and set mode to "custom".
- For "make it darker/lighter/more X" — look at the CURRENT palette in the store snapshot and adjust from there.
- When the seller mentions a product by name, find its ID in the recent products list.
- For query actions (query.*), include them in the actions array — the executor will fetch the data and format the response.
- If no store exists yet and the seller wants to create one, guide them: ask for the store name first, then what they sell.
- NEVER invent product IDs, order IDs, or category IDs. Use only IDs from the store snapshot.`;
}

// ============================================================
// Main: Classify and return actions
// ============================================================

export async function classifyAndAct(params: {
  message: string;
  conversationHistory: ConversationTurn[];
  storeSnapshot: StoreSnapshot | null;
  hasPhotos: boolean;
}): Promise<LLMRouterOutput> {
  const ai = getClient();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(params);

  try {
    const response = await ai.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return fallbackResponse('I had trouble processing that. Could you try again?');
    }

    // Parse JSON — strip markdown fences if present
    const jsonStr = textBlock.text
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[chat-llm] Failed to parse Haiku response:', jsonStr.substring(0, 500));
      return fallbackResponse("I didn't quite catch that. Could you rephrase?");
    }

    // Validate against schema
    const result = LLMRouterOutputSchema.safeParse(parsed);
    if (!result.success) {
      console.error('[chat-llm] Haiku response failed schema validation:', result.error.issues);
      // Try to salvage — if there's a response field, use it
      const partial = parsed as any;
      if (partial?.response && typeof partial.response === 'string') {
        return {
          actions: [],
          response: partial.response,
          suggestions: partial.suggestions,
        };
      }
      return fallbackResponse("I didn't quite catch that. Could you rephrase?");
    }

    return result.data;
  } catch (err: any) {
    console.error('[chat-llm] Haiku API error:', err.message);

    // If API is down, return a helpful fallback
    if (err.status === 529 || err.status === 503) {
      return fallbackResponse("I'm experiencing heavy traffic. Please try again in a moment.");
    }

    return fallbackResponse("Something went wrong on my end. Please try again.");
  }
}

// ============================================================
// User prompt construction
// ============================================================

function buildUserPrompt(params: {
  message: string;
  conversationHistory: ConversationTurn[];
  storeSnapshot: StoreSnapshot | null;
  hasPhotos: boolean;
}): string {
  const parts: string[] = [];

  // Store context
  if (params.storeSnapshot) {
    const s = params.storeSnapshot;
    parts.push(`CURRENT STORE STATE:
Store: "${s.name}" (${s.vertical}, ${s.status})
URL: /${s.slug}
Products: ${s.productCount} total (${s.activeProductCount} active, ${s.draftProductCount} drafts)
Categories: ${s.categoryCount} | Collections: ${s.collectionCount}
Orders: ${s.orderCount} total (${s.pendingOrderCount} pending)`);

    // Current design config (condensed)
    const config = s.storeConfig as any;
    if (config?.design) {
      const d = config.design;
      parts.push(`\nCURRENT DESIGN:
Palette: bg=${d.palette?.background}, text=${d.palette?.text}, primary=${d.palette?.primary}, accent=${d.palette?.accent}
Fonts: display="${d.fonts?.display}", body="${d.fonts?.body}"
Layout: ${d.layout} | Spacing: ${d.spacing} | Radius: ${d.radius} | Animation: ${d.animation}
Hero: ${d.hero?.style}, height=${d.hero?.height}
Product cards: ${d.productCard?.style}, ratio=${d.productCard?.imageRatio}`);
    }

    if (s.heroTagline) parts.push(`Hero tagline: "${s.heroTagline}"`);
    if (s.heroSubtext) parts.push(`Hero subtext: "${s.heroSubtext}"`);
    if (s.storeBio) parts.push(`Store bio: "${s.storeBio}"`);

    // Recent products
    if (s.recentProducts && s.recentProducts.length > 0) {
      const productLines = s.recentProducts.map(
        (p) => `  - "${p.name}" (₹${p.price}, ${p.status}, id:${p.id})`,
      ).join('\n');
      parts.push(`\nRECENT PRODUCTS:\n${productLines}`);
    }

    // Categories
    if (s.categories && s.categories.length > 0) {
      const catLines = s.categories.map(
        (c) => `  - "${c.name}" (${c.productCount || 0} products, id:${c.id})`,
      ).join('\n');
      parts.push(`\nCATEGORIES:\n${catLines}`);
    }

    // Collections
    if (s.collections && s.collections.length > 0) {
      const colLines = s.collections.map(
        (c) => `  - "${c.name}" (${c.type}, ${c.productCount || 0} products, id:${c.id})`,
      ).join('\n');
      parts.push(`\nCOLLECTIONS:\n${colLines}`);
    }

    // Recent orders
    if (s.recentOrders && s.recentOrders.length > 0) {
      const orderLines = s.recentOrders.map(
        (o) => `  - #${o.orderNumber}: ${o.buyerName}, ₹${o.total}, ${o.status} (id:${o.id})`,
      ).join('\n');
      parts.push(`\nRECENT ORDERS:\n${orderLines}`);
    }
  } else {
    parts.push('NO STORE EXISTS YET. The seller needs to create a store first.');
  }

  // Conversation history
  if (params.conversationHistory.length > 0) {
    const historyLines = params.conversationHistory.map(
      (turn) => `${turn.role === 'seller' ? 'Seller' : 'AI'}: ${turn.content}`,
    ).join('\n');
    parts.push(`\nCONVERSATION HISTORY:\n${historyLines}`);
  }

  // Current message
  parts.push(`\nSELLER MESSAGE: ${params.message}`);

  // Photo flag
  if (params.hasPhotos) {
    parts.push('\nNOTE: The seller has attached photos. Respond directing them to upload — the photo pipeline handles image processing separately. Do NOT return media actions for this.');
  }

  parts.push('\nRespond with ONLY valid JSON. No markdown, no backticks, no explanation.');

  return parts.join('\n');
}

// ============================================================
// Fallback
// ============================================================

function fallbackResponse(message: string): LLMRouterOutput {
  return {
    actions: [],
    response: message,
  };
}
