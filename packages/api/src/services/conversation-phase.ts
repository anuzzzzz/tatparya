import type { TatparyaAction, ConversationTurn, StoreSnapshot } from '@tatparya/shared';
import { VALID_ACTION_TYPES } from '@tatparya/shared';

// ============================================================
// Conversation Phase State Machine
//
// Wraps the LLM router with deterministic phase management.
// The server determines which phase the seller is in based on
// the store snapshot, then constrains what Haiku can do.
//
// Key design principle: Haiku is a tool, not the orchestrator.
// The server owns the conversation flow. Haiku fills in the
// natural language and action selection within phase boundaries.
//
// Phases:
//   NO_STORE     → Deterministic (no LLM). Collect name, create store.
//   EMPTY_STORE  → Haiku with design + store management only.
//   HAS_PRODUCTS → Haiku with product management added.
//   OPERATIONAL  → Full Haiku, all action types.
// ============================================================

export type ConversationPhase = 'NO_STORE' | 'EMPTY_STORE' | 'HAS_PRODUCTS' | 'OPERATIONAL';

export interface PhaseConfig {
  phase: ConversationPhase;
  allowedActions: Set<string>;
  systemPromptContext: string;
  suggestionsForPhase: { label: string; description?: string }[];
}

// ── Per-phase action whitelists ──────────────────────────────

const EMPTY_STORE_ACTIONS = new Set([
  'store.delete', 'store.update_name', 'store.update_description', 'store.update_status',
  'store.update_hero_text', 'store.update_bio', 'store.update_hero_cta',
  'store.update_announcement', 'store.update_social_links',
  // Design actions
  'store.update_palette', 'store.update_fonts', 'store.update_hero_style',
  'store.update_product_card_style', 'store.update_nav_style',
  'store.update_collection_style', 'store.update_checkout_style',
  'store.update_layout', 'store.update_spacing', 'store.update_radius',
  'store.update_image_style', 'store.update_animation',
  'store.update_design_bulk', 'store.regenerate_design', 'store.undo_design',
  // Sections
  'section.toggle', 'section.reorder', 'section.update_config',
  // Manual product creation (without photos)
  'product.create',
  // Queries that make sense without products
  'query.store_info', 'query.store_link',
]);

const HAS_PRODUCTS_ACTIONS = new Set([
  ...EMPTY_STORE_ACTIONS,
  'store.regenerate_catalog',
  'product.update', 'product.delete', 'product.publish', 'product.archive',
  'product.bulk_publish', 'product.bulk_update_price',
  'variant.create', 'variant.update', 'variant.delete', 'stock.update',
  'category.create', 'category.update', 'category.delete', 'category.assign_product',
  'collection.create', 'collection.update', 'collection.delete',
  'collection.add_products', 'collection.remove_products',
  'media.set_hero_banner', 'media.set_product_images',
  'media.set_category_image', 'media.set_collection_banner',
  'query.products', 'query.categories', 'query.collections',
  'discount.create', 'discount.deactivate', 'query.discounts',
]);

// OPERATIONAL = full action set
const OPERATIONAL_ACTIONS = VALID_ACTION_TYPES;

// ── Phase determination ──────────────────────────────────────

export function determinePhase(snapshot: StoreSnapshot | null): PhaseConfig {
  if (!snapshot) {
    return {
      phase: 'NO_STORE',
      allowedActions: new Set(['store.create']),
      systemPromptContext: '',
      suggestionsForPhase: [],
    };
  }

  if (snapshot.productCount === 0) {
    return {
      phase: 'EMPTY_STORE',
      allowedActions: EMPTY_STORE_ACTIONS,
      systemPromptContext:
        'The seller has a store but NO products yet. Your primary guidance: encourage them to upload product photos using the attachment button. ' +
        'Don\'t mention orders, discounts, or analytics — they have nothing to sell yet. ' +
        'If they ask about orders or revenue, say "You\'ll see orders here once you publish products and share your store link."',
      suggestionsForPhase: [
        { label: 'Upload Photos', description: 'Add product photos' },
        { label: 'Change Design', description: 'Customize your store look' },
        { label: 'Store Link', description: 'See your store URL' },
        { label: 'Help', description: 'What can I do?' },
      ],
    };
  }

  if (snapshot.activeProductCount === 0) {
    return {
      phase: 'HAS_PRODUCTS',
      allowedActions: HAS_PRODUCTS_ACTIONS,
      systemPromptContext:
        'The seller has products but NONE are published yet. Guide them to review and publish. ' +
        'Suggest "publish all" or let them review individual products. ' +
        'Don\'t mention order management — no orders can come in until products are published.',
      suggestionsForPhase: [
        { label: 'Show Products', description: 'View your product catalog' },
        { label: 'Publish All', description: 'Make all products live' },
        { label: 'Change Design', description: 'Customize your store look' },
        { label: 'Store Link', description: 'See your store URL' },
        { label: 'Help', description: 'What can I do?' },
      ],
    };
  }

  return {
    phase: 'OPERATIONAL',
    allowedActions: OPERATIONAL_ACTIONS,
    systemPromptContext: '',
    suggestionsForPhase: [
      { label: 'Add Products', description: 'Upload more product photos' },
      { label: 'My Orders', description: 'View recent orders' },
      { label: 'Revenue', description: 'Check your sales' },
      { label: 'Store Settings', description: 'Manage your store' },
      { label: 'Help', description: 'What can I do?' },
    ],
  };
}

// ── Action filtering ─────────────────────────────────────────

export function filterActionsByPhase(
  actions: TatparyaAction[],
  phaseConfig: PhaseConfig,
): { allowed: TatparyaAction[]; blocked: string[] } {
  const allowed: TatparyaAction[] = [];
  const blocked: string[] = [];

  for (const action of actions) {
    if (phaseConfig.allowedActions.has(action.type)) {
      allowed.push(action);
    } else {
      blocked.push(action.type);
      console.warn(`[phase-filter] Blocked ${action.type} — not allowed in ${phaseConfig.phase}`);
    }
  }

  return { allowed, blocked };
}

// ── NO_STORE deterministic handler ───────────────────────────
//
// Handles the store creation flow WITHOUT calling Haiku.
// Two-turn flow:
//   Turn 1: Detect name or ask for it
//   Turn 2: Receive name, signal creation
//
// Returns either:
//   { action: 'ask_name', response: string }  — show this to seller
//   { action: 'create_store', storeName: string } — execute store.create
// ============================================================

const COMMAND_WORDS = new Set([
  'create', 'build', 'start', 'make', 'new', 'setup', 'set', 'begin',
  'want', 'need', 'let', 'lets', "let's", 'can', 'could', 'would',
  'please', 'help', 'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'yeah',
  'sure', 'store', 'shop', 'sell', 'selling', 'open', 'launch',
  'get', 'started', 'going', 'ready', 'my', 'a', 'an', 'the', 'i',
  "i'm", 'me', 'up', 'for', 'to', 'it', 'do', 'so', 'now',
]);

const NAME_ASKED_SIGNALS = [
  'what would you like to name',
  'what should we call',
  "what's your store name",
  'name your store',
  'name your new store',
  'what would you like to call',
  'i need a name for your store',
];

const EXTRACTION_PHRASES = ['called', 'named', 'name it', 'call it', 'name is', 'name:'];

export type NoStoreResult =
  | { action: 'ask_name'; response: string }
  | { action: 'create_store'; storeName: string };

export function handleNoStorePhase(
  message: string,
  conversationHistory: ConversationTurn[],
): NoStoreResult {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. Did we already ask for the name in recent history?
  const recentHistory = conversationHistory.slice(-6);
  const alreadyAsked = recentHistory.some(
    (turn) =>
      turn.role === 'ai' &&
      NAME_ASKED_SIGNALS.some((signal) => turn.content.toLowerCase().includes(signal)),
  );

  if (alreadyAsked) {
    // Current message should BE the name — unless it's pure command words
    const words = lower.split(/\s+/).filter((w) => w.length > 0);
    const isAllCommands = words.length > 0 && words.every((w) => COMMAND_WORDS.has(w));

    if (!isAllCommands && trimmed.length >= 2 && trimmed.length <= 100) {
      // Clean up: remove quotes, trailing punctuation
      const cleaned = trimmed.replace(/^["']+|["'.!?]+$/g, '').trim();
      if (cleaned.length >= 2) {
        return { action: 'create_store', storeName: cleaned };
      }
    }

    // They replied with another command instead of a name
    return {
      action: 'ask_name',
      response: "I need a name for your store to get started. What would you like to call it?",
    };
  }

  // 2. Check for extraction phrases: "create a store called Silk Route"
  for (const phrase of EXTRACTION_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const afterPhrase = trimmed.substring(idx + phrase.length).trim();
      const cleaned = afterPhrase.replace(/^["']+|["'.!?]+$/g, '').trim();
      if (cleaned.length >= 2 && cleaned.length <= 100) {
        return { action: 'create_store', storeName: cleaned };
      }
    }
  }

  // 3. Check if message is mostly command words (no name embedded)
  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  const commandWordCount = words.filter((w) => COMMAND_WORDS.has(w)).length;
  const commandRatio = words.length > 0 ? commandWordCount / words.length : 0;

  // High command ratio OR very short with any command word → it's a command, not a name
  if (commandRatio >= 0.6 || (words.length <= 3 && commandWordCount > 0)) {
    return {
      action: 'ask_name',
      response: "Hi! Let's build your store. What would you like to name it?",
    };
  }

  // 4. Short non-command phrase — treat AS the name
  if (words.length <= 8 && trimmed.length >= 2 && trimmed.length <= 100) {
    return { action: 'create_store', storeName: trimmed };
  }

  // 5. Long or ambiguous message — ask for name
  return {
    action: 'ask_name',
    response: "What would you like to name your store?",
  };
}
