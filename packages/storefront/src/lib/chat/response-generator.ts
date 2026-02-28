import type { Intent } from './intent-router';
import type { ChatMessage, ProductCardMessage, OrderCardMessage, StatsMessage } from './types';
import { aiTextMessage, createMessageId } from './types';
import type { ChatApiService } from './chat-api';

// ============================================================
// Response Generator — Phase C
//
// Now calls real API endpoints via ChatApiService.
// Returns both text messages and rich cards.
// Falls back to helpful text when API calls fail.
// ============================================================

export async function generateResponse(
  intent: Intent,
  api: ChatApiService | null,
): Promise<ChatMessage[]> {
  // If no API available, return text-only fallback
  if (!api) {
    return [generateFallbackResponse(intent)];
  }

  const handler = RESPONSE_HANDLERS[intent.action] || handleUnknown;

  try {
    return await handler(intent, api);
  } catch (err) {
    console.error('Response generation error:', err);
    return [aiTextMessage('Something went wrong. Please try again.')];
  }
}

type ResponseHandler = (intent: Intent, api: ChatApiService) => Promise<ChatMessage[]>;

const RESPONSE_HANDLERS: Record<string, ResponseHandler> = {
  greeting: handleGreeting,
  help: handleHelp,
  'product.add': handleProductAdd,
  'product.from_photos': handleProductFromPhotos,
  'product.list': handleProductList,
  'product.update_price': handleProductUpdatePrice,
  'product.publish': handleProductPublish,
  'product.delete': handleProductDelete,
  'order.list': handleOrderList,
  'order.revenue': handleOrderRevenue,
  'order.ship': handleOrderShip,
  'order.cancel': handleOrderCancel,
  'store.settings': handleStoreSettings,
  'store.rename': handleStoreRename,
  'store.create': handleStoreCreate,
  'store.link': handleStoreLink,
  'discount.create': handleDiscountCreate,
  'category.list': handleCategoryList,
  unknown: handleUnknown,
};

// ============================================================
// Handlers — now async with real API calls
// ============================================================

async function handleGreeting(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  const greetings = [
    'Hello! What would you like to do today? You can add products, check orders, or manage your store.',
    'Hey there! Ready to work on your store? Upload product photos or ask me anything.',
    'Hi! How can I help? Upload photos to add products, check orders, or view your revenue.',
  ];
  return [aiTextMessage(greetings[Math.floor(Math.random() * greetings.length)]!)];
}

async function handleHelp(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    "Here's what I can help you with:\n\n" +
    '📸 Add Products — Upload photos and I\'ll create listings automatically\n' +
    '📦 Orders — View, ship, or cancel orders\n' +
    '💰 Revenue — Check your earnings for today, this week, or month\n' +
    '🏪 Store — Update your store name, settings, or get your store link\n' +
    '🏷️ Discounts — Create coupon codes\n' +
    '📂 Categories — Organize your products\n\n' +
    'Upload product photos to get started!',
  )];
}

async function handleProductAdd(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    'Ready to add a product! Upload your product photos — I\'ll analyze them and create a complete listing with name, description, price suggestion, and tags.\n\n' +
    'Tap the 📎 icon or drag and drop your photos.',
  )];
}

async function handleProductFromPhotos(_intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  // This is called from use-chat when photos are uploaded.
  // The actual API call happens in use-chat which passes imageUrls.
  // This handler returns the "analyzing" message.
  return [aiTextMessage(
    'Got your photos! Analyzing them to create a product listing...\n\nThis takes a few seconds — I\'ll generate the name, description, price range, and tags.',
  )];
}

async function handleProductList(_intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const result = await api.listProducts();

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't fetch products: ${result.error}`)];
  }

  const data = result.data as { items: any[]; total: number };

  if (!data.items || data.items.length === 0) {
    return [aiTextMessage(
      'You don\'t have any products yet. Upload photos to create your first listing!',
    )];
  }

  const messages: ChatMessage[] = [
    aiTextMessage(`You have ${data.total} product${data.total === 1 ? '' : 's'}:`),
  ];

  // Return product cards for the first 5
  for (const item of data.items.slice(0, 5)) {
    const card: ProductCardMessage = {
      type: 'product_card',
      id: createMessageId(),
      role: 'ai',
      product: {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        imageUrl: item.images?.[0]?.originalUrl,
        tags: item.tags,
        status: item.status,
        category: item.categoryName,
      },
      actions: [
        item.status === 'draft'
          ? { label: 'Publish', action: 'product.publish', params: { productId: item.id }, variant: 'primary' as const }
          : { label: 'Unpublish', action: 'product.unpublish', params: { productId: item.id }, variant: 'secondary' as const },
        { label: 'Edit Price', action: 'product.update_price', params: { productId: item.id }, variant: 'secondary' as const },
      ],
      timestamp: new Date(),
    };
    messages.push(card);
  }

  if (data.total > 5) {
    messages.push(aiTextMessage(`Showing 5 of ${data.total}. Say "show more products" to see the rest.`));
  }

  return messages;
}

async function handleProductUpdatePrice(intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const price = intent.params['price'] as number | undefined;
  const productId = intent.params['productId'] as string | undefined;

  if (price && productId) {
    const result = await api.updateProduct(productId, { price });
    if (result.success) {
      return [aiTextMessage(`Done! Price updated to ₹${price.toLocaleString('en-IN')}.`)];
    }
    return [aiTextMessage(`Couldn't update price: ${result.error}`)];
  }

  if (price) {
    return [aiTextMessage(
      `I'll set the price to ₹${price.toLocaleString('en-IN')}. Which product? Tell me the name or say "the last one".`,
    )];
  }

  return [aiTextMessage('What\'s the new price, and which product?')];
}

async function handleProductPublish(intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const productId = intent.params['productId'] as string | undefined;

  if (productId) {
    const result = await api.publishProduct(productId);
    if (result.success) {
      const product = result.data as any;
      return [aiTextMessage(`"${product.name}" is now live on your store! 🎉`)];
    }
    return [aiTextMessage(`Couldn't publish: ${result.error}`)];
  }

  return [aiTextMessage('Which product do you want to publish? Tell me the name or say "the last one".')];
}

async function handleProductDelete(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    'Are you sure you want to delete this product? This cannot be undone. Reply "yes, delete it" to confirm.',
  )];
}

async function handleOrderList(intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const period = intent.params['period'] as string | undefined;
  const status = intent.params['status'] as string | undefined;

  const result = await api.listOrders({ status, period });

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't fetch orders: ${result.error}`)];
  }

  const data = result.data as { items: any[]; total: number };

  if (!data.items || data.items.length === 0) {
    const timeMsg = period ? ` for ${period}` : '';
    return [aiTextMessage(`No orders${timeMsg}. They'll show up here as soon as customers start buying!`)];
  }

  const messages: ChatMessage[] = [
    aiTextMessage(`${data.total} order${data.total === 1 ? '' : 's'}${period ? ` (${period})` : ''}:`),
  ];

  for (const item of data.items.slice(0, 5)) {
    const card: OrderCardMessage = {
      type: 'order_card',
      id: createMessageId(),
      role: 'ai',
      order: {
        id: item.id,
        orderNumber: item.orderNumber,
        buyerName: item.buyer?.name || 'Customer',
        total: item.total,
        status: item.status,
        itemCount: item.items?.length || 0,
        createdAt: item.createdAt,
      },
      actions: item.status === 'paid' || item.status === 'processing'
        ? [{ label: 'Ship', action: 'order.ship', params: { orderId: item.id }, variant: 'primary' as const }]
        : undefined,
      timestamp: new Date(),
    };
    messages.push(card);
  }

  return messages;
}

async function handleOrderRevenue(intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const period = (intent.params['period'] as string) || 'today';
  const result = await api.getRevenue(period);

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't fetch revenue: ${result.error}`)];
  }

  const data = result.data as { totalRevenue: number; orderCount: number; avgOrderValue: number };

  const statsMsg: StatsMessage = {
    type: 'stats',
    id: createMessageId(),
    role: 'ai',
    stats: [
      { label: 'Revenue', value: `₹${(data.totalRevenue || 0).toLocaleString('en-IN')}` },
      { label: 'Orders', value: data.orderCount || 0 },
      { label: 'Avg. Order', value: `₹${(data.avgOrderValue || 0).toLocaleString('en-IN')}` },
    ],
    period,
    timestamp: new Date(),
  };

  return [statsMsg];
}

async function handleOrderShip(intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  const orderId = intent.params['orderId'] as string | undefined;

  if (orderId) {
    // Phase C+: will call api.updateOrderStatus
    return [aiTextMessage('Enter the tracking number (or say "skip" to ship without tracking):')];
  }

  return [aiTextMessage('Which order should I ship? Send me the order number, or say "the latest one".')];
}

async function handleOrderCancel(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    'Which order would you like to cancel? Send me the order number. I\'ll ask for confirmation before cancelling.',
  )];
}

async function handleStoreSettings(_intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const result = await api.getStore();

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't fetch store details: ${result.error}`)];
  }

  const store = result.data as any;

  return [aiTextMessage(
    `Your store details:\n\n` +
    `Name: ${store.name}\n` +
    `Category: ${store.vertical}\n` +
    `Status: ${store.status}\n` +
    `Slug: ${store.slug}\n` +
    (store.gstin ? `GSTIN: ${store.gstin}\n` : '') +
    (store.businessName ? `Business: ${store.businessName}\n` : '') +
    `\nWhat would you like to change?`,
  )];
}

async function handleStoreRename(intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const name = intent.params['name'] as string | undefined;

  if (name) {
    const result = await api.updateStore({ name });
    if (result.success) {
      return [aiTextMessage(`Done! Your store is now called "${name}".`)];
    }
    return [aiTextMessage(`Couldn't rename store: ${result.error}`)];
  }

  return [aiTextMessage('What would you like to rename your store to?')];
}

async function handleStoreCreate(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    'Let\'s create your store! What should we call it?\n\nJust tell me the store name and I\'ll set it up.',
  )];
}

async function handleStoreLink(_intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const result = await api.getStoreLink();

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't get store link: ${result.error}`)];
  }

  const data = result.data as { slug: string; url: string; name: string };

  return [aiTextMessage(
    `Here's your store link:\n\n🔗 ${data.url}\n\nShare this with your customers!`,
  )];
}

async function handleDiscountCreate(_intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  return [aiTextMessage(
    'Let\'s create a discount code! Tell me:\n\n' +
    '1. Code name (e.g. WELCOME10)\n' +
    '2. Percentage or flat amount?\n' +
    '3. How much off?\n\n' +
    'For example: "Create a 10% discount code called WELCOME10"',
  )];
}

async function handleCategoryList(_intent: Intent, api: ChatApiService): Promise<ChatMessage[]> {
  const result = await api.listCategories();

  if (!result.success) {
    if (result.error?.includes('NO_STORE')) {
      return [aiTextMessage('You don\'t have a store yet. Say "create my store" to get started!')];
    }
    return [aiTextMessage(`Couldn't fetch categories: ${result.error}`)];
  }

  const categories = result.data as any[];

  if (!categories || categories.length === 0) {
    return [aiTextMessage('You don\'t have any categories yet. Products will be auto-categorized when I create them from photos.')];
  }

  const list = categories.map((c: any) => `• ${c.name} (${c.productCount || 0} products)`).join('\n');
  return [aiTextMessage(`Your categories:\n\n${list}`)];
}

async function handleUnknown(intent: Intent, _api: ChatApiService): Promise<ChatMessage[]> {
  if (intent.requiresFollowUp) {
    return [aiTextMessage(intent.requiresFollowUp)];
  }
  return [aiTextMessage(
    'I\'m not sure I understand. Could you rephrase?\n\n' +
    'You can upload product photos, ask about orders, check revenue, or type "help" to see everything I can do.',
  )];
}

// ============================================================
// Fallback when no API is available (used during loading)
// ============================================================

function generateFallbackResponse(intent: Intent): ChatMessage {
  switch (intent.action) {
    case 'greeting':
      return aiTextMessage('Hello! Setting up your connection... please wait a moment.');
    case 'help':
      return aiTextMessage('I can help with products, orders, revenue, and store management. Give me a moment to connect...');
    default:
      return aiTextMessage('Just a moment — connecting to your store...');
  }
}
