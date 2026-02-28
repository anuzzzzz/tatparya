import type { Intent } from './intent-router';
import type { ChatMessage } from './types';
import { aiTextMessage, createMessageId } from './types';

// ============================================================
// Response Generator
//
// Takes a classified intent and generates the appropriate
// chat response. Phase B: text responses only.
// Phase C: will call tRPC and return rich cards.
// ============================================================

export function generateResponse(intent: Intent): ChatMessage {
  const handler = RESPONSE_HANDLERS[intent.action] || handleUnknown;
  return handler(intent);
}

type ResponseHandler = (intent: Intent) => ChatMessage;

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
// Handlers
// Phase B: Return helpful text.
// Phase C: These will call tRPC and return rich cards.
// ============================================================

function handleGreeting(_intent: Intent): ChatMessage {
  const greetings = [
    'Hello! What would you like to do today? You can add products, check orders, or manage your store.',
    'Hey there! Ready to work on your store? Upload product photos or ask me anything.',
    'Hi! How can I help? You can upload photos to add products, view orders, or check your revenue.',
  ];
  return aiTextMessage(greetings[Math.floor(Math.random() * greetings.length)]!);
}

function handleHelp(_intent: Intent): ChatMessage {
  return aiTextMessage(
    "Here's what I can help you with:\n\n" +
    '📸 Add Products — Upload photos and I\'ll create listings automatically\n' +
    '📦 Orders — View, ship, or cancel orders\n' +
    '💰 Revenue — Check your earnings for today, this week, or month\n' +
    '🏪 Store — Update your store name, settings, or get your store link\n' +
    '🏷️ Discounts — Create coupon codes\n' +
    '📂 Categories — Organize your products\n\n' +
    'Just tell me what you need, or upload product photos to get started!',
  );
}

function handleProductAdd(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'Ready to add a product! Upload your product photos below — I\'ll analyze them and create a complete listing with name, description, price suggestion, and tags.\n\n' +
    'You can upload one or multiple photos at once. Tap the 📎 icon or drag and drop.',
  );
}

function handleProductFromPhotos(_intent: Intent): ChatMessage {
  // This is triggered when photos are uploaded.
  // Phase C will actually call the catalog AI service here.
  return aiTextMessage(
    'Got your photos! Analyzing them now to create a product listing...\n\n' +
    '⏳ This will take a few seconds. I\'ll generate the name, description, price range, tags, and category.',
  );
}

function handleProductList(_intent: Intent): ChatMessage {
  // Phase C: Will call product.list and return product cards
  return aiTextMessage(
    'Let me fetch your products...\n\n' +
    '📋 (Product list will appear here in Phase C — the API call will be wired up next.)',
  );
}

function handleProductUpdatePrice(intent: Intent): ChatMessage {
  const price = intent.params['price'];
  if (price) {
    return aiTextMessage(
      `I'll update the price to ₹${price}. Which product should I update? Send me the product name or say "the last one" if it's the product we just worked on.`,
    );
  }
  return aiTextMessage(
    'Sure, I can update the price. What\'s the new price, and which product?',
  );
}

function handleProductPublish(_intent: Intent): ChatMessage {
  // Phase C: Will call product.update with status: 'active'
  return aiTextMessage(
    'I\'ll publish that product and make it live on your store.\n\n' +
    '✅ (This will work in Phase C when the API is wired up.)',
  );
}

function handleProductDelete(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'Are you sure you want to delete this product? This action cannot be undone. Reply "yes" to confirm.',
  );
}

function handleOrderList(intent: Intent): ChatMessage {
  const period = intent.params['period'];
  const status = intent.params['status'];

  let msg = 'Let me pull up your orders';
  if (period) msg += ` from ${period}`;
  if (status) msg += ` (${status})`;
  msg += '...';

  // Phase C: Will call order.list and return order cards
  return aiTextMessage(
    msg + '\n\n📦 (Order list will appear here in Phase C.)',
  );
}

function handleOrderRevenue(intent: Intent): ChatMessage {
  const period = (intent.params['period'] as string) || 'today';

  // Phase C: Will call order.revenue and return a stats card
  return aiTextMessage(
    `Fetching your ${period}'s revenue...\n\n💰 (Revenue stats will appear here in Phase C.)`,
  );
}

function handleOrderShip(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'I\'ll mark the order as shipped. Which order? Send me the order number, or say "the latest one".',
  );
}

function handleOrderCancel(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'Which order would you like to cancel? Send me the order number. I\'ll ask for confirmation before cancelling.',
  );
}

function handleStoreSettings(_intent: Intent): ChatMessage {
  // Phase C: Will fetch and display store config
  return aiTextMessage(
    'Here are the things you can update:\n\n' +
    '• Store name\n' +
    '• Store description\n' +
    '• Store category/vertical\n' +
    '• GSTIN and business details\n' +
    '• Theme and design\n\n' +
    'What would you like to change?',
  );
}

function handleStoreRename(intent: Intent): ChatMessage {
  const name = intent.params['name'];
  if (name) {
    // Phase C: Will call store.update with new name
    return aiTextMessage(
      `I'll rename your store to "${name}".\n\n✏️ (This will work in Phase C.)`,
    );
  }
  return aiTextMessage('What would you like to rename your store to?');
}

function handleStoreCreate(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'Let\'s create your store! I need a few things to get started:\n\n' +
    '1. What\'s your store name?\n' +
    '2. What do you sell? (e.g. Fashion, Jewellery, Electronics, Food, Beauty)\n\n' +
    'Tell me the store name first, and we\'ll go from there.',
  );
}

function handleStoreLink(_intent: Intent): ChatMessage {
  // Phase C: Will fetch actual store slug and build URL
  return aiTextMessage(
    'Your store link will be: https://your-store.tatparya.in\n\n' +
    '🔗 (The actual link will show in Phase C once your store is created.)',
  );
}

function handleDiscountCreate(_intent: Intent): ChatMessage {
  return aiTextMessage(
    'Let\'s create a discount code! I need:\n\n' +
    '1. Code name (e.g. WELCOME10)\n' +
    '2. Discount type — percentage or flat amount?\n' +
    '3. Value — how much off?\n\n' +
    'What code would you like to use?',
  );
}

function handleCategoryList(_intent: Intent): ChatMessage {
  // Phase C: Will call category.getTree
  return aiTextMessage(
    'Let me fetch your categories...\n\n' +
    '📂 (Category list will appear here in Phase C.)',
  );
}

function handleUnknown(intent: Intent): ChatMessage {
  if (intent.requiresFollowUp) {
    return aiTextMessage(intent.requiresFollowUp);
  }
  return aiTextMessage(
    'I\'m not sure I understand. Could you try rephrasing?\n\n' +
    'You can upload product photos, ask about orders, check revenue, or type "help" to see everything I can do.',
  );
}
