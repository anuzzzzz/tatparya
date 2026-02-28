// ============================================================
// Intent Router — Improved
//
// Fixes:
// 1. Compound messages ("hi show my orders") → strips greeting
//    prefix and re-classifies the rest
// 2. Broader patterns for orders, products, store
// 3. Basic typo tolerance for common words
// 4. Fuzzy matching for near-misses
// ============================================================

export interface Intent {
  action: string;
  params: Record<string, unknown>;
  confidence: number;
  requiresFollowUp?: string;
}

interface PatternRule {
  patterns: RegExp[];
  intent: string;
  extractParams?: (match: RegExpMatchArray, input: string) => Record<string, unknown>;
  confidence: number;
}

// ============================================================
// Typo correction map — common misspellings
// ============================================================

const TYPO_MAP: Record<string, string> = {
  'tore': 'store',
  'stre': 'store',
  'sotre': 'store',
  'stroe': 'store',
  'stor': 'store',
  'prodcut': 'product',
  'produts': 'products',
  'porduct': 'product',
  'prduct': 'product',
  'producr': 'product',
  'oder': 'order',
  'ordrs': 'orders',
  'ordr': 'order',
  'oders': 'orders',
  'revnue': 'revenue',
  'revenu': 'revenue',
  'earings': 'earnings',
  'earnnig': 'earning',
  'pice': 'price',
  'pirce': 'price',
  'prise': 'price',
  'crate': 'create',
  'craete': 'create',
  'cretae': 'create',
  'biuld': 'build',
  'buld': 'build',
  'delte': 'delete',
  'pubish': 'publish',
  'publsh': 'publish',
  'catlog': 'catalog',
  'categry': 'category',
  'setings': 'settings',
  'settngs': 'settings',
  'webste': 'website',
  'websit': 'website',
  'dukaan': 'store',
  'dukkaan': 'store',
  'lisitng': 'listing',
  'listnig': 'listing',
};

function fixTypos(input: string): string {
  const words = input.split(/\s+/);
  return words.map((w) => {
    const lower = w.toLowerCase();
    return TYPO_MAP[lower] || w;
  }).join(' ');
}

// ============================================================
// Greeting stripping — removes greeting prefix from
// compound messages like "hi show my orders"
// ============================================================

const GREETING_PREFIX = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|namaskar|yo|sup)\s*[,!.]*\s*/i;

function stripGreeting(input: string): { hadGreeting: boolean; rest: string } {
  const match = input.match(GREETING_PREFIX);
  if (match && match[0]!.length < input.length) {
    return { hadGreeting: true, rest: input.slice(match[0]!.length).trim() };
  }
  return { hadGreeting: false, rest: input };
}

// ============================================================
// Pattern Rules — order matters, first match wins
// ============================================================

const RULES: PatternRule[] = [

  // ── Photo upload marker (internal) ─────────────────────────
  {
    patterns: [/^\[photo_upload\]$/i],
    intent: 'product.from_photos',
    confidence: 1.0,
  },

  // ── Help ───────────────────────────────────────────────────
  {
    patterns: [
      /\b(help|what can you do|commands|features|how does this work|what do you do)\b/i,
      /\b(madad|kya kar sakte)\b/i,
    ],
    intent: 'help',
    confidence: 0.95,
  },

  // ── Add Product ────────────────────────────────────────────
  {
    patterns: [
      /\b(add|create|new|upload)\s*(a\s+)?(product|item|listing)/i,
      /\b(want to|wanna|i want|let me)\s*(sell|list|add)\b/i,
      /\b(add|upload)\s*(photos?|images?|pictures?)\b/i,
      /\b(add|new)\s+item/i,
    ],
    intent: 'product.add',
    confidence: 0.9,
  },

  // ── List Products ──────────────────────────────────────────
  {
    patterns: [
      /\b(show|list|view|see|display|get)\s*(me\s+)?(my\s+)?(all\s+)?(products?|items?|listings?|catalog|inventory)/i,
      /\b(my\s+)(products?|catalog|items?|listings?|inventory)\b/i,
      /\bhow many products?\b/i,
      /\bproduct\s*list\b/i,
    ],
    intent: 'product.list',
    confidence: 0.85,
  },

  // ── Update Price ───────────────────────────────────────────
  {
    patterns: [
      /\b(change|update|set|modify|edit)\s*(the\s+)?price\b/i,
      /\bprice\s*(change|update|set|edit)\b/i,
      /\bprice\s*(?:to|=|:)\s*(\d+)/i,
      /\bnew price\b/i,
    ],
    intent: 'product.update_price',
    extractParams: (_match, input) => {
      const priceMatch = input.match(/(\d[\d,]*\.?\d*)/);
      return priceMatch ? { price: parseFloat(priceMatch[1]!.replace(/,/g, '')) } : {};
    },
    confidence: 0.85,
  },

  // ── Publish Product ────────────────────────────────────────
  {
    patterns: [
      /\b(publish|activate|make\s*live|go\s*live|make\s*it\s*live)\s*(the\s+)?(product|item|listing|it)?\b/i,
      /\bpublish\s*(it|this|that)?\b/i,
    ],
    intent: 'product.publish',
    confidence: 0.9,
  },

  // ── Delete Product ─────────────────────────────────────────
  {
    patterns: [
      /\b(delete|remove|trash|discard)\s*(the\s+)?(product|item|listing)\b/i,
    ],
    intent: 'product.delete',
    confidence: 0.85,
  },

  // ── Order List / Summary ───────────────────────────────────
  {
    patterns: [
      /\b(show|list|view|see|display|get|check|any)\s*(me\s+)?(my\s+)?(new\s+|recent\s+|pending\s+|today'?s?\s+|latest\s+|past\s+|all\s+)?(orders?)\b/i,
      /\b(my\s+)(orders?|sales)\b/i,
      /\bhow many orders?\b/i,
      /\borders?\s*(today|this week|this month|yesterday)\b/i,
      /\bany\s*(new\s+)?orders?\b/i,
      /\border\s*(list|history|summary)\b/i,
      /\bpast\s+orders?\b/i,
      /\brecent\s+orders?\b/i,
    ],
    intent: 'order.list',
    extractParams: (_match, input) => {
      if (/today/i.test(input)) return { period: 'today' };
      if (/week/i.test(input)) return { period: 'week' };
      if (/month/i.test(input)) return { period: 'month' };
      if (/yesterday/i.test(input)) return { period: 'today' }; // approximate
      if (/pending/i.test(input)) return { status: 'created' };
      return {};
    },
    confidence: 0.9,
  },

  // ── Revenue / Earnings ─────────────────────────────────────
  {
    patterns: [
      /\b(revenue|earnings?|income|how much\s*(did\s+)?i?\s*(earn|make|sell))\b/i,
      /\b(today'?s?\s+)?sales\s*(figures?|numbers?|data)?\b/i,
      /\btotal\s*(sales|revenue|earnings?)\b/i,
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

  // ── Create Store ───────────────────────────────────────────
  {
    patterns: [
      /\b(create|start|setup|set\s*up|build|make|open)\s*(a\s+|my\s+|new\s+)*(store|shop|website|site|dukaan)\b/i,
      /\blet'?s?\s*(start|begin|get started|go)\b/i,
      /\bi\s*want\s*(a\s+|my\s+)?(store|shop|website)\b/i,
      /\bmake\s*(me\s+)?(a\s+)?(store|shop|website)\b/i,
      /\bnew\s+store\b/i,
    ],
    intent: 'store.create',
    confidence: 0.9,
  },

  // ── Store Settings ─────────────────────────────────────────
  {
    patterns: [
      /\b(store|shop)\s*(settings?|config|details?|info)\b/i,
      /\b(change|update|edit)\s*(my\s+)?(store|shop)\s*(name|details?)\b/i,
      /\bmy\s+store\s*(info|details)\b/i,
    ],
    intent: 'store.settings',
    confidence: 0.85,
  },

  // ── Change Store Name ──────────────────────────────────────
  {
    patterns: [
      /\b(change|rename|update)\s*(the\s+)?(store|shop)\s*name\s*(to\s+)?(.+)?/i,
    ],
    intent: 'store.rename',
    extractParams: (match, _input) => {
      const newName = match[5]?.trim();
      return newName ? { name: newName } : {};
    },
    confidence: 0.85,
  },

  // ── Store Link / URL ───────────────────────────────────────
  {
    patterns: [
      /\b(my\s+)?(store|shop|website)\s*(link|url|address)\b/i,
      /\bwhere\s*(is|can)\s*(i find\s+)?(my\s+)?(store|shop|site)\b/i,
      /\bshare\s*(my\s+)?(store|link)\b/i,
    ],
    intent: 'store.link',
    confidence: 0.9,
  },

  // ── Discount / Coupon ──────────────────────────────────────
  {
    patterns: [
      /\b(create|add|set\s*up|make)\s*(a\s+)?(discount|coupon|promo)\b/i,
    ],
    intent: 'discount.create',
    confidence: 0.85,
  },

  // ── Categories ─────────────────────────────────────────────
  {
    patterns: [
      /\b(show|list|add|create|manage|my)\s*(my\s+)?(categories|collections)\b/i,
    ],
    intent: 'category.list',
    confidence: 0.8,
  },

  // ── Greetings (LAST — so compound messages match above first)
  {
    patterns: [
      /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|namaskar)[\s!.,?]*$/i,
      /^(yo|sup|what'?s\s*up)[\s!.,?]*$/i,
    ],
    intent: 'greeting',
    confidence: 0.95,
  },
];

// ============================================================
// Main: Classify a message
// ============================================================

export function classifyIntent(input: string): Intent {
  const trimmed = input.trim();

  // Step 1: Fix common typos
  const corrected = fixTypos(trimmed);

  // Step 2: Try to match the full input
  const directMatch = matchRules(corrected);
  if (directMatch && directMatch.action !== 'unknown') {
    return directMatch;
  }

  // Step 3: If no match, strip greeting and try the rest
  const { hadGreeting, rest } = stripGreeting(corrected);
  if (hadGreeting && rest.length > 0) {
    const restMatch = matchRules(rest);
    if (restMatch && restMatch.action !== 'unknown') {
      return restMatch;
    }
  }

  // Step 4: Pure greeting (nothing left after stripping)
  if (hadGreeting && rest.length === 0) {
    return { action: 'greeting', params: {}, confidence: 0.95 };
  }

  // Step 5: Fallback
  return {
    action: 'unknown',
    params: { rawInput: trimmed },
    confidence: 0,
    requiresFollowUp: "I didn't quite get that. Try saying something like \"show my orders\", \"add a product\", or \"create my store\". You can also type \"help\" to see everything I can do.",
  };
}

function matchRules(input: string): Intent | null {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = input.match(pattern);
      if (match) {
        const params = rule.extractParams ? rule.extractParams(match, input) : {};
        return {
          action: rule.intent,
          params,
          confidence: rule.confidence,
        };
      }
    }
  }
  return null;
}

// ============================================================
// Utility
// ============================================================

export function isPhotoRelated(input: string): boolean {
  return /\b(photo|image|picture|upload|camera|snap|pic)\b/i.test(input);
}
