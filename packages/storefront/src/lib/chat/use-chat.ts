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
  // Send images → resize → triage → per-group catalog AI → store design
  //
  // Full Pipeline (Phase 6 Orchestration):
  // 1. Resize all photos (OffscreenCanvas Worker, off main thread)
  // 2. Triage (Call 0): Group photos by product, flag quality issues
  //    - If confidence < 0.8 → ask user to confirm groupings
  //    - If single group + high confidence → proceed automatically
  // 3. Per group, fire in parallel:
  //    a. Thumbnails → catalog AI (Call 1) — product listing
  //    b. Full images → R2 presigned URLs — permanent storage
  // 4. First upload: also trigger store design AI (Call 2) with
  //    sellerContext + archetype in background
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

      // ── Step 2: Triage (Call 0) — group photos by product ──
      let photoGroups: { imageIndices: number[]; confidence: number; label: string }[];
      let needsConfirmation = false;

      if (resized.length === 1) {
        // Single photo — skip triage
        photoGroups = [{ imageIndices: [0], confidence: 1.0, label: 'single product' }];
      } else {
        addMessages([aiTextMessage('Analyzing which photos go together...')]);
        const triageResult = await api.triagePhotos(thumbnailDataUrls);

        if (triageResult.success) {
          const triage = triageResult.data as any;
          photoGroups = triage.groups;
          needsConfirmation = triage.needsConfirmation;

          // Show quality warnings if any
          const qualityFlags = triage.qualityFlags?.filter((f: any) => f.issue) || [];
          if (qualityFlags.length > 0) {
            const warnings = qualityFlags.map((f: any) =>
              `Photo ${f.imageIndex + 1}: ${f.issue}`
            ).join('\n');
            addMessages([aiTextMessage(`⚠️ Quality notes:\n${warnings}\n\nI'll still process them, but better photos = better listings.`)]);
          }

          if (needsConfirmation && triage.confirmationMessage) {
            // TODO: Full confirmation flow with action buttons
            // For now, proceed with the AI's groupings
            addMessages([aiTextMessage(triage.confirmationMessage + '\n\nProceeding with these groupings...')]);
          }
        } else {
          // Triage failed — treat each photo as separate product
          photoGroups = resized.map((_, i) => ({
            imageIndices: [i],
            confidence: 0.5,
            label: `product ${i + 1}`,
          }));
        }
      }

      const groupCount = photoGroups.length;
      if (groupCount > 1) {
        addMessages([aiTextMessage(`Found ${groupCount} products in your photos. Creating listings...`)]);
      }

      // ── Step 3: Per-group catalog AI + R2 uploads in parallel ──
      const allProducts: any[] = [];

      // Start R2 uploads for ALL images in parallel (non-blocking)
      const r2UploadPromise = Promise.all(resized.map(async (r) => {
        try {
          const uploadUrlResult = await api.getUploadUrl(r.filename, 'image/jpeg', r.full.size);
          if (!uploadUrlResult.success) return null;
          const { uploadUrl, publicUrl, mediaAssetId } = uploadUrlResult.data as any;
          await fetch(uploadUrl, {
            method: 'PUT',
            body: r.full,
            headers: { 'Content-Type': 'image/jpeg' },
          });
          await api.confirmUpload(mediaAssetId);
          return { mediaId: mediaAssetId, publicUrl, index: resized.indexOf(r) };
        } catch {
          return null;
        }
      }));

      // Run catalog AI for each group (parallel across groups)
      const catalogPromises = photoGroups.map(async (group) => {
        const groupThumbnails = group.imageIndices.map((i) => thumbnailDataUrls[i]!);
        const result = await api.generateFromPhotos(groupThumbnails);
        return { group, result };
      });

      const [catalogResults, uploadResults] = await Promise.all([
        Promise.all(catalogPromises),
        r2UploadPromise,
      ]);

      setIsTyping(false);

      // ── Step 4: Show product cards for each group ──
      const successfulUploads = uploadResults.filter(Boolean) as any[];

      for (const { group, result } of catalogResults) {
        if (!result.success) {
          addMessages([aiTextMessage(
            `Couldn't generate listing for "${group.label}": ${result.error}`,
          )]);
          continue;
        }

        const { suggestion, productId, confidence } = result.data as any;
        if (productId) setLastProductId(productId);
        allProducts.push({ suggestion, productId });

        // Pick best display image: R2 URL > local preview
        const groupUpload = successfulUploads.find((u) =>
          group.imageIndices.includes(u.index)
        );
        const displayImageUrl = groupUpload?.publicUrl || localUrls[group.imageIndices[0]!];

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
          aiTextMessage(
            groupCount > 1
              ? `"${suggestion.name}" created as draft. ${note}`
              : `Product created as draft. ${note} Say "publish" to make it live, or "change price to ___" to adjust.`,
          ),
        ]);
      }

      // Summary for multi-product uploads
      if (allProducts.length > 1) {
        addMessages([aiTextMessage(
          `Created ${allProducts.length} product drafts. Say "publish all" to make them live, or review each one individually.`,
        )]);
      }

      // ── Step 5: Store design AI (Call 2) in background ──
      // Only on first upload (don't redesign on every product add)
      const allNames = allProducts.map((p) => p.suggestion.name);
      const allPrices = allProducts
        .map((p) => p.suggestion.suggestedPrice)
        .filter(Boolean);
      const priceRange = allPrices.length > 0
        ? {
            min: Math.min(...allPrices.map((p: any) => p.min)),
            max: Math.max(...allPrices.map((p: any) => p.max)),
          }
        : undefined;
      const allTags = [...new Set(allProducts.flatMap((p) => p.suggestion.tags || []))];

      api.generateStoreDesign(
        thumbnailDataUrls.slice(0, 3), // Max 3 images for design
        {
          names: allNames,
          priceRange,
          tags: allTags.slice(0, 15),
        },
      ).then((designResult) => {
        if (designResult.success) {
          const data = designResult.data as any;
          addMessages([
            aiTextMessage(
              `✨ Store design updated! ${data.heroTagline ? `"${data.heroTagline}"` : ''}\nVisit your store to see the new look.`,
            ),
          ]);
        }
      }).catch(() => {
        // Design generation is non-critical — don't block flow
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
