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
  // Send images → upload → catalog AI → product card
  // ============================================================
  const sendImages = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const localUrls = files.map((f) => URL.createObjectURL(f));
    addMessages([
      sellerImageMessage(localUrls, files.length === 1 ? files[0]!.name : `${files.length} photos`),
    ]);

    setIsTyping(true);
    addMessages([aiTextMessage(
      'Got your photos! Analyzing them to create a product listing... This takes a few seconds.',
    )]);

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
          // Use the first store
          setStoreId(stores[0].id);
          api.setStoreId(stores[0].id);
        }
      }

      // Upload files
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;

        const uploadResult = await api.getUploadUrl(file.name, file.type, file.size);

        if (!uploadResult.success) {
          console.warn('Media upload not available, using local URL');
          uploadedUrls.push(localUrls[i]!);
          continue;
        }

        const { uploadUrl, publicUrl, mediaAssetId } = uploadResult.data as any;

        try {
          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          await api.confirmUpload(mediaAssetId);
          uploadedUrls.push(publicUrl);
        } catch {
          console.warn('File upload failed, using local URL');
          uploadedUrls.push(localUrls[i]!);
        }
      }

      // Call catalog AI
      const catalogResult = await api.generateFromPhotos(uploadedUrls);

      setIsTyping(false);

      if (!catalogResult.success) {
        addMessages([aiTextMessage(
          `Couldn't generate product listing: ${catalogResult.error}\n\nTry again or add the product manually.`,
        )]);
        return;
      }

      const { suggestion, productId, confidence } = catalogResult.data as any;

      if (productId) setLastProductId(productId);

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
          imageUrl: uploadedUrls[0],
          tags: suggestion.tags,
          status: 'draft',
          category: suggestion.category,
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
