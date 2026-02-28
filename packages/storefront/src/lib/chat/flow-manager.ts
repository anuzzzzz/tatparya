// ============================================================
// Conversation Flow Manager
//
// Handles multi-step interactions where the AI needs to
// collect multiple pieces of info before taking action.
//
// Active flow takes priority over intent classification.
// When a flow is active, user input feeds into the flow
// instead of being classified as a new intent.
// ============================================================

import type { ChatMessage } from './types';
import { aiTextMessage, createMessageId } from './types';
import type { ChatApiService } from './chat-api';

export type FlowType =
  | 'store_creation'
  | 'product_price_update'
  | 'product_delete_confirm'
  | 'order_ship';

export interface FlowState {
  type: FlowType;
  step: string;
  data: Record<string, unknown>;
  startedAt: Date;
}

export class FlowManager {
  private currentFlow: FlowState | null = null;

  isActive(): boolean {
    return this.currentFlow !== null;
  }

  getFlow(): FlowState | null {
    return this.currentFlow;
  }

  cancel() {
    this.currentFlow = null;
  }

  // ============================================================
  // Start a flow
  // ============================================================

  startStoreCreation(): ChatMessage[] {
    this.currentFlow = {
      type: 'store_creation',
      step: 'ask_name',
      data: {},
      startedAt: new Date(),
    };
    return [aiTextMessage(
      "Let's create your store! What would you like to call it?",
    )];
  }

  startPriceUpdate(productId?: string): ChatMessage[] {
    this.currentFlow = {
      type: 'product_price_update',
      step: productId ? 'ask_price' : 'ask_product',
      data: productId ? { productId } : {},
      startedAt: new Date(),
    };

    if (productId) {
      return [aiTextMessage('What should the new price be?')];
    }
    return [aiTextMessage('Which product? Tell me the name, or say "the last one".')];
  }

  startDeleteConfirm(productId: string, productName: string): ChatMessage[] {
    this.currentFlow = {
      type: 'product_delete_confirm',
      step: 'confirm',
      data: { productId, productName },
      startedAt: new Date(),
    };
    return [aiTextMessage(
      `Are you sure you want to delete "${productName}"? This cannot be undone. Say "yes" to confirm or "no" to cancel.`,
    )];
  }

  startOrderShip(orderId?: string): ChatMessage[] {
    this.currentFlow = {
      type: 'order_ship',
      step: orderId ? 'ask_tracking' : 'ask_order',
      data: orderId ? { orderId } : {},
      startedAt: new Date(),
    };

    if (orderId) {
      return [aiTextMessage('Enter a tracking number, or say "skip" to ship without tracking.')];
    }
    return [aiTextMessage('Which order? Send me the order number.')];
  }

  // ============================================================
  // Process input within an active flow
  // Returns messages to show, or null if flow completed
  // ============================================================

  async processInput(
    input: string,
    api: ChatApiService,
    context: { lastProductId?: string | null },
  ): Promise<ChatMessage[]> {
    if (!this.currentFlow) return [];

    const trimmed = input.trim();

    // Allow cancellation from any flow
    if (/^(cancel|stop|nevermind|never\s*mind|nah|nope)$/i.test(trimmed)) {
      this.currentFlow = null;
      return [aiTextMessage('Cancelled. What else can I help with?')];
    }

    switch (this.currentFlow.type) {
      case 'store_creation':
        return this.processStoreCreation(trimmed, api);
      case 'product_price_update':
        return this.processPriceUpdate(trimmed, api, context);
      case 'product_delete_confirm':
        return this.processDeleteConfirm(trimmed, api);
      case 'order_ship':
        return this.processOrderShip(trimmed, api);
      default:
        this.currentFlow = null;
        return [aiTextMessage('Something went wrong. Let\'s start over — what would you like to do?')];
    }
  }

  // ============================================================
  // Store Creation Flow
  // Steps: ask_name → ask_vertical → creating → done
  // ============================================================

  private async processStoreCreation(input: string, api: ChatApiService): Promise<ChatMessage[]> {
    const flow = this.currentFlow!;

    if (flow.step === 'ask_name') {
      // Validate name
      if (input.length < 2) {
        return [aiTextMessage('Store name should be at least 2 characters. Try again:')];
      }
      if (input.length > 100) {
        return [aiTextMessage('That\'s too long — keep it under 100 characters. Try again:')];
      }

      flow.data['name'] = input;
      flow.step = 'ask_vertical';

      return [{
        type: 'action_buttons',
        id: createMessageId(),
        role: 'ai',
        text: `Great name — "${input}"! What type of products will you sell?`,
        actions: [
          { label: '👗 Fashion', action: 'fashion' },
          { label: '💍 Jewellery', action: 'jewellery' },
          { label: '💄 Beauty', action: 'beauty' },
          { label: '📱 Electronics', action: 'electronics' },
          { label: '🍔 Food', action: 'food' },
          { label: '🏠 Home Decor', action: 'home_decor' },
          { label: '📦 Other', action: 'general' },
        ],
        timestamp: new Date(),
      }];
    }

    if (flow.step === 'ask_vertical') {
      // Map user input to vertical enum
      const vertical = mapVertical(input);

      flow.data['vertical'] = vertical;
      flow.step = 'creating';

      // Actually create the store
      const result = await api.createStore({
        name: flow.data['name'] as string,
        vertical,
      });

      this.currentFlow = null; // Flow complete

      if (!result.success) {
        return [aiTextMessage(`Couldn't create the store: ${result.error}\n\nPlease try again.`)];
      }

      const store = result.data as any;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const storeUrl = `${baseUrl}/${store.slug}`;

      return [
        aiTextMessage(
          `Your store "${store.name}" is live! 🎉\n\n` +
          `🔗 ${storeUrl}\n\n` +
          `Now let's add your first product — upload some photos and I'll create the listing for you.`,
        ),
      ];
    }

    // Shouldn't reach here
    this.currentFlow = null;
    return [aiTextMessage('Something went wrong. Let\'s try again — say "create my store".')];
  }

  // ============================================================
  // Price Update Flow
  // Steps: ask_product → ask_price → updating → done
  // ============================================================

  private async processPriceUpdate(
    input: string,
    api: ChatApiService,
    context: { lastProductId?: string | null },
  ): Promise<ChatMessage[]> {
    const flow = this.currentFlow!;

    if (flow.step === 'ask_product') {
      if (/\b(last|latest|recent|previous)\b/i.test(input) && context.lastProductId) {
        flow.data['productId'] = context.lastProductId;
      } else {
        // For now, treat input as a search term
        // TODO: Search products by name and pick the match
        return [aiTextMessage(
          "I can't search by name yet. Say \"the last one\" to update the most recent product, or upload a new photo.",
        )];
      }

      flow.step = 'ask_price';
      return [aiTextMessage('What should the new price be?')];
    }

    if (flow.step === 'ask_price') {
      const priceMatch = input.match(/(\d[\d,]*\.?\d*)/);
      if (!priceMatch) {
        return [aiTextMessage('I need a number. What price do you want to set? (e.g. 599, 1499)')];
      }

      const price = parseFloat(priceMatch[1]!.replace(/,/g, ''));
      const productId = flow.data['productId'] as string;

      this.currentFlow = null;

      const result = await api.updateProduct(productId, { price });
      if (!result.success) {
        return [aiTextMessage(`Couldn't update price: ${result.error}`)];
      }

      const product = result.data as any;
      return [aiTextMessage(`Done! "${product.name}" is now ₹${price.toLocaleString('en-IN')}.`)];
    }

    this.currentFlow = null;
    return [];
  }

  // ============================================================
  // Delete Confirmation Flow
  // ============================================================

  private async processDeleteConfirm(input: string, api: ChatApiService): Promise<ChatMessage[]> {
    const flow = this.currentFlow!;

    if (/^(yes|y|confirm|do it|sure|go ahead|delete)$/i.test(input)) {
      const productId = flow.data['productId'] as string;
      this.currentFlow = null;

      const result = await api.deleteProduct(productId);
      if (!result.success) {
        return [aiTextMessage(`Couldn't delete: ${result.error}`)];
      }

      return [aiTextMessage(`"${flow.data['productName']}" has been deleted.`)];
    }

    this.currentFlow = null;
    return [aiTextMessage('Cancelled — the product was not deleted.')];
  }

  // ============================================================
  // Order Ship Flow
  // ============================================================

  private async processOrderShip(input: string, api: ChatApiService): Promise<ChatMessage[]> {
    const flow = this.currentFlow!;

    if (flow.step === 'ask_order') {
      flow.data['orderId'] = input;
      flow.step = 'ask_tracking';
      return [aiTextMessage('Enter a tracking number, or say "skip" to ship without tracking.')];
    }

    if (flow.step === 'ask_tracking') {
      const orderId = flow.data['orderId'] as string;
      const tracking = /^(skip|no|none)$/i.test(input) ? undefined : input;

      this.currentFlow = null;

      const result = await api.updateOrderStatus(orderId, 'shipped', {
        trackingNumber: tracking,
      });

      if (!result.success) {
        return [aiTextMessage(`Couldn't ship order: ${result.error}`)];
      }

      return [aiTextMessage(
        tracking
          ? `Order shipped! Tracking: ${tracking}`
          : 'Order marked as shipped!',
      )];
    }

    this.currentFlow = null;
    return [];
  }
}

// ============================================================
// Helpers
// ============================================================

function mapVertical(input: string): string {
  const lower = input.toLowerCase().trim();

  const map: Record<string, string> = {
    'fashion': 'fashion',
    'clothing': 'fashion',
    'clothes': 'fashion',
    'apparel': 'fashion',
    'garments': 'fashion',
    'jewellery': 'jewellery',
    'jewelry': 'jewellery',
    'ornaments': 'jewellery',
    'beauty': 'beauty',
    'cosmetics': 'beauty',
    'skincare': 'beauty',
    'makeup': 'beauty',
    'electronics': 'electronics',
    'gadgets': 'electronics',
    'phones': 'electronics',
    'food': 'food',
    'snacks': 'food',
    'grocery': 'fmcg',
    'fmcg': 'fmcg',
    'home': 'home_decor',
    'home decor': 'home_decor',
    'home_decor': 'home_decor',
    'decor': 'home_decor',
    'furniture': 'home_decor',
    'general': 'general',
    'other': 'general',
  };

  return map[lower] || 'general';
}
