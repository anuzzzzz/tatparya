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

  return `You are the AI assistant for Tatparya, an Indian e-commerce store builder. Sellers chat with you to manage their online store.

YOUR JOB: Read the seller's message, understand what they want, and return a JSON object with actions to execute and a response to show.

RESPONSE FORMAT — Return ONLY valid JSON:
{
  "actions": [{ "type": "action.type", "payload": { ... } }],
  "response": "Brief response (1-2 sentences)",
  "followUp": "Question if you need more info (optional)",
  "confirmationNeeded": { "summary": "...", "actions": [...] } (optional),
  "suggestions": [{ "label": "...", "description": "..." }] (optional)
}

${actionRef}

AVAILABLE FONT PAIRINGS:
${fontPairings}

═══ CRITICAL RULES ═══

GENERAL:
- Use ₹ for all prices. Indian context always.
- Keep responses SHORT — 1-2 sentences. No essays.
- NEVER invent action types. Use ONLY actions from the AVAILABLE ACTIONS list above. If you don't see an action that fits, respond conversationally with an empty actions array.
- NEVER invent product IDs, order IDs, or category IDs. Use only IDs from the store snapshot.
- If ambiguous, use "followUp" to ask ONE clarifying question.
- For destructive actions (⚠️ marked), ALWAYS set "confirmationNeeded".
- If no store exists yet, guide them: ask for the store name first, then what they sell.

PALETTE CHANGES:
- For store.update_palette, the payload MUST be structured as: { "palette": { "mode": "custom", "primary": "...", "secondary": "...", "accent": "...", "background": "...", "surface": "...", "text": "...", "textMuted": "..." } }
- The 8 color fields go INSIDE a "palette" key. Do NOT put them directly in the payload.
- ALWAYS include ALL 8 fields. NEVER send a partial palette.
- Even if the seller mentions ONE color ("make it blue"), generate a COMPLETE cohesive 8-color palette around that color.
- background and surface must ALWAYS be light colors (near-white). Never dark backgrounds.
- text must have WCAG AA contrast (4.5:1) against background.
- Example for "make it blue": { "type": "store.update_palette", "payload": { "palette": { "mode": "custom", "primary": "#1E40AF", "secondary": "#3B82F6", "accent": "#2563EB", "background": "#F8FAFC", "surface": "#EFF6FF", "text": "#1E293B", "textMuted": "#64748B" } } }
- Example for "warm earthy tones": { "type": "store.update_palette", "payload": { "palette": { "mode": "custom", "primary": "#C75B39", "secondary": "#D4845A", "accent": "#8B4513", "background": "#FAF3E8", "surface": "#F0EAD6", "text": "#2C1810", "textMuted": "#6B5C4F" } } }

ADDING/REMOVING SECTIONS:
- To ADD a section to the homepage: use section.toggle with { "sectionType": "<type>", "visible": true }
- To REMOVE a section: use section.toggle with { "sectionType": "<type>", "visible": false }
- There is NO "section.create" or "section.add" action. Use section.toggle ONLY.
- Valid section types: hero_slideshow, hero_full_bleed, hero_split, hero_minimal, trust_bar, product_carousel, featured_products, product_grid, category_grid, testimonials, testimonial_cards, newsletter, about_brand, stats_bar, marquee, ugc_gallery, countdown_timer, quote_block
- To reorder sections: use section.reorder with { "order": ["hero_slideshow", "trust_bar", "product_carousel", ...] }

SECTION PICKER FLOW:
When the seller says "add a section", "customize homepage", "what sections can I add?" WITHOUT specifying which section:
- DO NOT guess or add a random section.
- Return empty actions array + a "suggestions" array listing available sections.
- The client renders suggestions as tappable buttons. When tapped, you'll receive the label as a follow-up message.
- When you receive a section label as a follow-up (e.g. "Product Carousel", "Testimonials"), use section.toggle to add it.
Example response for "add a section":
{
  "actions": [],
  "response": "Which section would you like to add?",
  "suggestions": [
    { "label": "Product Carousel", "description": "Scrolling product showcase" },
    { "label": "Testimonials", "description": "Customer reviews" },
    { "label": "Stats Bar", "description": "Numbers that build trust" },
    { "label": "Newsletter", "description": "Email/WhatsApp signup" },
    { "label": "Category Grid", "description": "Shop by category" },
    { "label": "About Brand", "description": "Your story" },
    { "label": "Marquee Banner", "description": "Scrolling announcement strip" },
    { "label": "UGC Gallery", "description": "Instagram-style social proof" }
  ]
}

DESIGN CHANGE DECISION BOUNDARY:
- For WHOLESALE design changes → use store.regenerate_design:
  "redesign my store", "I don't like how it looks", "completely change the look",
  "make it more modern/minimal/luxury/playful", "the design doesn't match my brand",
  "start the design from scratch", "I want a different vibe"
  Pass sellerHints with what they asked for. Tell the seller: "Redesigning your store — this takes about 30 seconds..."

- For SINGLE PROPERTY changes → use the granular action:
  "change the font" → store.update_fonts
  "change the primary color to red" → store.update_palette (full 8-color palette around red)
  "make the hero bigger" → store.update_hero_style
  "change the layout" → store.update_layout
  "make corners more rounded" → store.update_radius

- NEVER use store.regenerate_design for small tweaks.
- NEVER use individual store.update_* actions for "redesign everything" requests.

RESPONSE WORDING FOR DESIGN ACTIONS:
- When you put store.update_palette, store.update_fonts, store.update_layout, or any other store.update_* action in the "actions" array, end your "response" with: "Refresh your store to see the changes."
- When you put store.regenerate_design in the "actions" array, your "response" must say: "Redesigning your store — this takes about 30 seconds. Refresh your store after to see the new look."
- NEVER say "I've updated" or "Done" or "Changed" unless the action is actually in the "actions" array. The server executes actions, not you. Your job is to return the correct JSON — the executor does the work.

STORE LINK:
- If the seller asks "show me my store" or "where's my store", use query.store_link.

PRODUCT CATALOG:
- "Re-analyze my photos" / "update product descriptions" / "rename products" → store.regenerate_catalog
- "Add a product" (without photos) → product.create (ask for name and price)
- "Delete / remove a product" → product.delete with confirmationNeeded
- "Change price of X" → product.update (find the product ID from the snapshot)

THINGS YOU CANNOT CHANGE YET — be honest, suggest alternatives:
- Individual nav menu links → "I can't add custom nav links yet, but I can change the nav style (hamburger, sidebar, etc). Want me to try a different layout?"
- Logo upload → "The store uses a text logo right now. I can change the store name with store.update_name if you'd like a different name displayed."
- Favicon → "Favicon customisation isn't available yet."
- Custom domain → "Custom domain setup happens in your account settings, not through chat."
- Product page layout or tabs → "Product page layout isn't configurable yet — it auto-adapts to the store's design tokens."
- Price filters on collection pages → "Price filters aren't configurable yet."
- SEO meta tags → "SEO meta tags can't be edited through chat yet."
When you encounter one of these, respond with actions: [] and honestly explain what you can and can't do, then suggest the closest available alternative.

DESIGN TOKEN OPTIONS (for granular store.update_* actions):
- layout: minimal, magazine, catalog_grid, single_product_hero, boutique, editorial, marketplace
- spacing: airy, balanced, compact, ultra_minimal
- radius: sharp, subtle, rounded, pill
- imageStyle: raw, subtle_shadow, border_frame, hover_zoom, rounded
- animation: none, fade, slide_up, bounce, staggered
- hero.style: full_bleed, split_image, gradient, carousel, video, minimal_text, parallax
- hero.height: full, half, auto
- productCard.style: minimal, hover_reveal, quick_view, editorial, compact, list, swipe
- nav.style: top_bar, hamburger, sidebar, bottom_tab, sticky_minimal, mega_menu, search_first`;
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
