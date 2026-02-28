// ============================================================
// Intent Router
//
// Takes a raw text message from the seller and classifies it
// into a structured intent + parameters.
//
// Phase B: Regex/keyword matching for ~20 common patterns.
// Phase F: Upgrade to Claude for ambiguous queries.
//
// All intents map to tRPC calls in Phase C.
// ============================================================

export interface Intent {
  action: string;                      // e.g. 'product.add', 'order.list'
  params: Record<string, unknown>;     // Extracted parameters
  confidence: number;                  // 0-1, how sure we are
  requiresFollowUp?: string;           // If we need more info, what to ask
}

interface PatternRule {
  patterns: RegExp[];
  intent: string;
  extractParams?: (match: RegExpMatchArray, input: string) => Record<string, unknown>;
  confidence: number;
}

// ============================================================
// Pattern Rules
// Order matters — first match wins.
// ============================================================

const RULES: PatternRule[] = [

  // ── Greetings ──────────────────────────────────────────────
  {
    patterns: [
      /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|namaskar)/i,
      /^(yo|sup|what'?s\s*up)/i,
    ],
    intent: 'greeting',
    confidence: 0.95,
  },

  // ── Help ───────────────────────────────────────────────────
  {
    patterns: [
      /\b(help|what can you do|commands|features|how does this work)\b/i,
      /\b(madad|kya kar sakte)\b/i,
    ],
    intent: 'help',
    confidence: 0.95,
  },

  // ── Add Product (photo-based) ──────────────────────────────
  {
    patterns: [
      /\b(add|create|new|upload)\s*(a\s+)?(product|item|listing)/i,
      /\b(want to|wanna)\s*(sell|list|add)\b/i,
      /\b(add|upload)\s*(photos?|images?|pictures?)\b/i,
    ],
    intent: 'product.add',
    confidence: 0.9,
  },

  // ── Photo uploaded (detected separately in chat hook) ──────
  {
    patterns: [
      /^\[photo_upload\]$/i,
    ],
    intent: 'product.from_photos',
    confidence: 1.0,
  },

  // ── Publish Product (before list, since "publish the product" contains "product") ──
  {
    patterns: [
      /\b(publish|activate)\s*(the\s+)?(product|item|listing|it)?\b/i,
      /\bmake\s*(it\s+)?live\b/i,
      /\bgo\s*live\b/i,
    ],
    intent: 'product.publish',
    confidence: 0.9,
  },

  // ── List Products ──────────────────────────────────────────
  {
    patterns: [
      /\b(show|list|view|see|display)\s*(my\s+)?(all\s+)?(products?|items?|listings?|catalog)/i,
      /\b(my\s+)?(products?|catalog)\b/i,
      /\bhow many products?\b/i,
    ],
    intent: 'product.list',
    confidence: 0.85,
  },

  // ── Update Price ───────────────────────────────────────────
  {
    patterns: [
      /\b(change|update|set|modify)\s*(the\s+)?price\b/i,
      /\bprice\s*(change|update|set)\b/i,
      /\bprice\s*(?:to|=|:)\s*(\d+)/i,
    ],
    intent: 'product.update_price',
    extractParams: (_match, input) => {
      const priceMatch = input.match(/(\d[\d,]*\.?\d*)/);
      return priceMatch ? { price: parseFloat(priceMatch[1]!.replace(/,/g, '')) } : {};
    },
    confidence: 0.85,
  },

  // ── Delete Product ─────────────────────────────────────────
  {
    patterns: [
      /\b(delete|remove|trash)\s*(the\s+)?(product|item|listing)\b/i,
    ],
    intent: 'product.delete',
    confidence: 0.85,
  },

  // ── Order List / Summary ───────────────────────────────────
  {
    patterns: [
      /\b(show|list|view|see|any)\s*(my\s+)?(new\s+|recent\s+|pending\s+|today'?s?\s+)?(orders?)\b/i,
      /\bhow many orders?\b/i,
      /\borders?\s*(today|this week|this month)\b/i,
    ],
    intent: 'order.list',
    extractParams: (_match, input) => {
      if (/today/i.test(input)) return { period: 'today' };
      if (/week/i.test(input)) return { period: 'week' };
      if (/month/i.test(input)) return { period: 'month' };
      if (/pending/i.test(input)) return { status: 'created' };
      return {};
    },
    confidence: 0.9,
  },

  // ── Revenue / Earnings ─────────────────────────────────────
  {
    patterns: [
      /\b(revenue|earnings?|income|sales|how much\s*(did\s+)?i\s*(earn|make|sell))\b/i,
      /\b(today'?s?\s+)?sales\b/i,
    ],
    intent: 'order.revenue',
    extractParams: (_match, input) => {
      if (/today/i.test(input)) return { period: 'today' };
      if (/week/i.test(input)) return { period: 'week' };
      if (/month/i.test(input)) return { period: 'month' };
      return { period: 'today' };
    },
    confidence: 0.85,
  },

  // ── Ship Order ─────────────────────────────────────────────
  {
    patterns: [
      /\b(ship|dispatch|send)\s*(the\s+)?(order|it|this)\b/i,
      /\bmark\s*(as\s+)?shipped\b/i,
    ],
    intent: 'order.ship',
    confidence: 0.85,
  },

  // ── Cancel Order ───────────────────────────────────────────
  {
    patterns: [
      /\b(cancel)\s*(the\s+)?(order|it|this)\b/i,
    ],
    intent: 'order.cancel',
    confidence: 0.85,
  },

  // ── Change Store Name (before settings, since "rename store" overlaps) ──
  {
    patterns: [
      /\b(change|rename|update)\s*(the\s+)?(store|shop)\s*name\s*(to\s+)?(.+)?/i,
      /\brename\s*(my\s+)?(store|shop)\b/i,
    ],
    intent: 'store.rename',
    extractParams: (match, _input) => {
      const newName = match[5]?.trim();
      return newName ? { name: newName } : {};
    },
    confidence: 0.85,
  },

  // ── Store Settings ─────────────────────────────────────────
  {
    patterns: [
      /\b(store|shop)\s*(settings?|config|details?|info)\b/i,
      /\b(change|update|edit)\s*(my\s+)?(store|shop)\s*(details?)\b/i,
    ],
    intent: 'store.settings',
    confidence: 0.85,
  },

  // ── Create Store ───────────────────────────────────────────
  {
    patterns: [
      /\b(create|start|setup|build|make)\s*(a\s+|my\s+)?(new\s+)?(store|shop|website|dukaan)\b/i,
      /\blet'?s?\s*(start|begin|get started)\b/i,
    ],
    intent: 'store.create',
    confidence: 0.9,
  },

  // ── Discount / Coupon ──────────────────────────────────────
  {
    patterns: [
      /\b(create|add|set\s*up)\s*(a\s+)?(discount|coupon|promo)\b/i,
    ],
    intent: 'discount.create',
    confidence: 0.85,
  },

  // ── Categories ─────────────────────────────────────────────
  {
    patterns: [
      /\b(show|list|add|create|manage)\s*(my\s+)?(categories|collections)\b/i,
    ],
    intent: 'category.list',
    confidence: 0.8,
  },

  // ── Store Link / URL ───────────────────────────────────────
  {
    patterns: [
      /\b(my\s+)?(store|shop|website)\s*(link|url|address)\b/i,
      /\bwhere\s*(is|can)\s*(my\s+)?(store|shop|site|website)\b/i,
      /\bshare\s*(my\s+)?(store|link)\b/i,
    ],
    intent: 'store.link',
    confidence: 0.9,
  },
];

// ============================================================
// Main: Classify a message
// ============================================================

export function classifyIntent(input: string): Intent {
  const trimmed = input.trim();

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const params = rule.extractParams ? rule.extractParams(match, trimmed) : {};
        return {
          action: rule.intent,
          params,
          confidence: rule.confidence,
        };
      }
    }
  }

  // No match — fallback
  return {
    action: 'unknown',
    params: { rawInput: trimmed },
    confidence: 0,
    requiresFollowUp: "I'm not sure what you mean. Could you try rephrasing, or type 'help' to see what I can do?",
  };
}

// ============================================================
// Detect if message is about photos (for use-chat to call
// product.from_photos instead of text intent)
// ============================================================

export function isPhotoRelated(input: string): boolean {
  return /\b(photo|image|picture|upload|camera|snap|pic)\b/i.test(input);
}
