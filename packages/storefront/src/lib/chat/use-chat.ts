'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  type ChatMessage,
  aiTextMessage,
  sellerTextMessage,
  sellerImageMessage,
  createMessageId,
} from './types';
import { classifyIntent, isPhotoRelated } from './intent-router';
import { generateResponse } from './response-generator';
import { ChatApiService } from './chat-api';
import { FlowManager } from './flow-manager';
import { useSellerAuth } from './auth-provider';
import { resizeAll } from './image-resizer';

// ============================================================
// Chat State Hook — with Flow Manager
//
// Flow manager handles multi-step conversations:
// - "create my store" → ask name → ask vertical → create
// - "change price" → ask which product → ask price → update
// - Photo upload → upload to R2 → catalog AI → product card
// ============================================================

const WELCOME_MESSAGES: ChatMessage[] = [
  {
    type: 'text',
    id: 'welcome-1',
    role: 'ai',
    text: 'Welcome to Tatparya! I\'m your AI store builder.',
    timestamp: new Date(),
  },
  {
    type: 'text',
    id: 'welcome-2',
    role: 'ai',
    text: 'Say "create my store" to get started, or upload product photos and I\'ll build your catalog automatically.',
    timestamp: new Date(),
  },
];

export interface UseChatReturn {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
  sendImages: (files: File[]) => void;
  clearChat: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastProductId: string | null;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const flowManager = useRef(new FlowManager()).current;
  const { trpc, storeId, setStoreId } = useSellerAuth();

  const api = useMemo(() => new ChatApiService(trpc, storeId), [trpc, storeId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const addMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
    scrollToBottom();
  }, [scrollToBottom]);

  // ============================================================
  // Send text message
  // ============================================================
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessages([sellerTextMessage(trimmed)]);
    setIsTyping(true);

    try {
      // ── If a flow is active, feed input to it ──────────────
      if (flowManager.isActive()) {
        const flowResponses = await flowManager.processInput(trimmed, api, {
          lastProductId,
        });

        // Check if store was created (update storeId)
        for (const msg of flowResponses) {
          if (msg.type === 'text' && msg.role === 'ai' && (msg.text as string).includes('is live!')) {
            // Re-fetch stores to get the new storeId
            const storesResult = await api.listStores();
            if (storesResult.success) {
              const stores = storesResult.data as any[];
              if (stores.length > 0) {
                const latest = stores[0];
                setStoreId(latest.id);
                api.setStoreId(latest.id);
              }
            }
          }
        }

        setIsTyping(false);
        addMessages(flowResponses);
        return;
      }

      // ── Classify intent ────────────────────────────────────
      const intent = classifyIntent(trimmed);

      if (isPhotoRelated(trimmed) && intent.action !== 'product.add') {
        intent.action = 'product.add';
        intent.confidence = 0.85;
      }

      // Inject lastProductId for contextual commands
      if (['product.publish', 'product.update_price', 'product.delete'].includes(intent.action)) {
        if (!intent.params['productId'] && lastProductId) {
          intent.params['productId'] = lastProductId;
        }
      }

      // ── Handle intents that start flows ────────────────────
      if (intent.action === 'store.create') {
        setIsTyping(false);
        addMessages(flowManager.startStoreCreation());
        return;
      }

      if (intent.action === 'product.update_price' && !intent.params['price']) {
        setIsTyping(false);
        addMessages(flowManager.startPriceUpdate(
          (intent.params['productId'] as string) || lastProductId || undefined,
        ));
        return;
      }

      if (intent.action === 'order.ship' && !intent.params['orderId']) {
        setIsTyping(false);
        addMessages(flowManager.startOrderShip());
        return;
      }

      // ── Regular intents → API call → response ──────────────
      const responses = await generateResponse(intent, api);

      // Track product IDs
      for (const msg of responses) {
        if (msg.type === 'product_card' && msg.product.id) {
          setLastProductId(msg.product.id);
        }
      }

      setIsTyping(false);
      addMessages(responses);

    } catch (err) {
      console.error('Chat error:', err);
      setIsTyping(false);
      addMessages([aiTextMessage('Something went wrong. Please try again.')]);
    }
  }, [addMessages, api, flowManager, lastProductId, setStoreId]);

  // ============================================================
  // Send images → resize → thumbnail-first upload → catalog AI
  //
  // Flow:
  // 1. Resize all photos (OffscreenCanvas Worker, off main thread)
  // 2. Fire in parallel:
  //    a. Thumbnails as base64 → catalog AI (fast, ~75KB total)
  //    b. Full images → R2 via presigned URLs (heavy, racing AI)
  // 3. Show product card + trigger store design in background
  // ============================================================
  const sendImages = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const localUrls = files.map((f) => URL.createObjectURL(f));
    addMessages([
      sellerImageMessage(localUrls, files.length === 1 ? files[0]!.name : `${files.length} photos`),
    ]);

    setIsTyping(true);
    addMessages([aiTextMessage('Processing your photos...')]);

    try {
      // Check if store exists
      if (!storeId) {
        const storesResult = await api.listStores();
        if (storesResult.success) {
          const stores = storesResult.data as any[];
          if (stores.length === 0) {
            setIsTyping(false);
            addMessages([aiTextMessage(
              'You need a store first before adding products. Say "create my store" to get started!',
            )]);
            return;
          }
          setStoreId(stores[0].id);
          api.setStoreId(stores[0].id);
        }
      }

      // ── Step 1: Resize all images (OffscreenCanvas Worker) ──
      const resized = await resizeAll(files);
      const thumbnailDataUrls = resized.map((r) => r.thumbDataUrl);

      // ── Step 2: Fire AI + R2 uploads in parallel ────────────
      // Thumbnails → AI immediately (75KB total, fast)
      // Full images → R2 presigned URLs (racing the AI call)
      const [catalogResult, uploadResults] = await Promise.all([
        // FAST PATH: Thumbnails as base64 in body → catalog AI
        api.generateFromPhotos(thumbnailDataUrls),

        // SLOW PATH: Full images to R2 via presigned URLs
        Promise.all(resized.map(async (r) => {
          const uploadUrlResult = await api.getUploadUrl(
            r.filename,
            'image/jpeg',
            r.full.size,
          );
          if (!uploadUrlResult.success) {
            console.warn('Upload URL failed:', uploadUrlResult.error);
            return null;
          }
          const { uploadUrl, publicUrl, mediaAssetId } = uploadUrlResult.data as any;

          // Upload full image directly to R2/local via presigned URL
          try {
            await fetch(uploadUrl, {
              method: 'PUT',
              body: r.full,
              headers: { 'Content-Type': 'image/jpeg' },
            });
            // Confirm upload to trigger Sharp processing
            await api.confirmUpload(mediaAssetId);
            return { mediaId: mediaAssetId, publicUrl };
          } catch (err) {
            console.warn('R2 upload failed:', err);
            return null;
          }
        })),
      ]);

      setIsTyping(false);

      // ── Step 3: Handle catalog AI result ────────────────────
      if (!catalogResult.success) {
        addMessages([aiTextMessage(
          `Couldn't generate product listing: ${catalogResult.error}\n\nTry again or add the product manually.`,
        )]);
        return;
      }

      const { suggestion, productId, confidence } = catalogResult.data as any;
      if (productId) setLastProductId(productId);

      // Use R2 URL if upload succeeded, otherwise fall back to thumbnail
      const successfulUploads = uploadResults.filter(Boolean);
      const displayImageUrl = successfulUploads.length > 0
        ? (successfulUploads[0] as any).publicUrl
        : localUrls[0];

      const productCard: ChatMessage = {
        type: 'product_card',
        id: createMessageId(),
        role: 'ai',
        product: {
          id: productId,
          name: suggestion.name,
          description: suggestion.description,
          price: suggestion.suggestedPrice?.min || 0,
          compareAtPrice: suggestion.suggestedPrice?.max,
          imageUrl: displayImageUrl,
          tags: suggestion.tags,
          status: 'draft',
          category: suggestion.suggestedCategory,
        },
        actions: [
          { label: 'Publish', action: 'product.publish', params: { productId }, variant: 'primary' },
          { label: 'Edit Price', action: 'product.update_price', params: { productId }, variant: 'secondary' },
        ],
        timestamp: new Date(),
      };

      const note = confidence > 0.8
        ? 'Looking good!'
        : 'You might want to review the details.';

      addMessages([
        productCard,
        aiTextMessage(`Product created as draft. ${note} Say "publish" to make it live, or "change price to ___" to adjust.`),
      ]);

      // ── Step 4: Trigger store design in background (Call 2) ──
      api.generateStoreDesign(
        thumbnailDataUrls,
        {
          names: [suggestion.name],
          priceRange: suggestion.suggestedPrice
            ? { min: suggestion.suggestedPrice.min, max: suggestion.suggestedPrice.max }
            : undefined,
          tags: suggestion.tags,
        },
      ).then((designResult) => {
        if (designResult.success) {
          addMessages([
            aiTextMessage('✨ I\'ve designed your store to match your brand! Visit your store to see the new look.'),
          ]);
        }
      }).catch(() => {
        // Design generation is optional — don't block the flow
      });

    } catch (err) {
      console.error('Photo processing error:', err);
      setIsTyping(false);
      addMessages([aiTextMessage('Something went wrong while processing your photos. Please try again.')]);
    }
  }, [addMessages, api, storeId, setStoreId]);

  const clearChat = useCallback(() => {
    setMessages(WELCOME_MESSAGES);
    setLastProductId(null);
    flowManager.cancel();
  }, [flowManager]);

  return {
    messages,
    isTyping,
    sendMessage,
    sendImages,
    clearChat,
    messagesEndRef,
    lastProductId,
  };
}
