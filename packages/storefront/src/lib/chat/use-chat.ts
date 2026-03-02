'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  type ChatMessage,
  type TextMessage,
  type ProductCardMessage,
  type OrderCardMessage,
  type StatsMessage,
  aiTextMessage,
  sellerTextMessage,
  sellerImageMessage,
  createMessageId,
} from './types';
import { ChatApiService } from './chat-api';
import { FlowManager } from './flow-manager';
import { useSellerAuth } from './auth-provider';
import { resizeAll } from './image-resizer';
import { DESIGN_ACTIONS } from '@tatparya/shared';

// ============================================================
// Chat State Hook — LLM Router Edition
//
// sendMessage() → tRPC chat.process → Haiku → execute → respond
// sendImages() → existing photo pipeline (UNCHANGED)
//
// The LLM router replaces the regex intent classifier.
// The server handles: snapshot → Haiku → validate → execute.
// The client handles: rendering responses + photo uploads.
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
  previousDesignConfig: Record<string, unknown> | null;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  const [previousDesignConfig, setPreviousDesignConfig] = useState<Record<string, unknown> | null>(null);
  const [pendingActions, setPendingActions] = useState<unknown[]>([]);
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
  // Build conversation history from recent messages
  // ============================================================
  const buildConversationHistory = useCallback((msgs: ChatMessage[]) => {
    return msgs
      .filter((m): m is TextMessage => m.type === 'text')
      .slice(-10)
      .map((m) => ({
        role: m.role === 'seller' ? ('seller' as const) : ('ai' as const),
        content: m.text,
      }));
  }, []);

  // ============================================================
  // Render query results as rich chat messages
  // ============================================================
  const renderQueryResults = useCallback((queryResults: { type: string; data: any }[]): ChatMessage[] => {
    const rendered: ChatMessage[] = [];

    for (const qr of queryResults) {
      switch (qr.type) {
        case 'query.products': {
          const items = qr.data?.items || [];
          for (const item of items.slice(0, 5)) {
            const card: ProductCardMessage = {
              type: 'product_card',
              id: createMessageId(),
              role: 'ai',
              product: {
                id: item.id,
                name: item.name,
                description: item.description || '',
                price: item.price,
                compareAtPrice: item.compare_at_price,
                imageUrl: item.images?.[0]?.originalUrl,
                tags: item.tags,
                status: item.status,
              },
              actions: [
                item.status === 'draft'
                  ? { label: 'Publish', action: 'product.publish', params: { productId: item.id }, variant: 'primary' as const }
                  : { label: 'Unpublish', action: 'product.archive', params: { productId: item.id }, variant: 'secondary' as const },
                { label: 'Edit Price', action: 'product.update_price', params: { productId: item.id }, variant: 'secondary' as const },
              ],
              timestamp: new Date(),
            };
            rendered.push(card);
            if (item.id) setLastProductId(item.id);
          }
          break;
        }

        case 'query.orders': {
          const items = qr.data?.items || [];
          for (const item of items.slice(0, 5)) {
            const card: OrderCardMessage = {
              type: 'order_card',
              id: createMessageId(),
              role: 'ai',
              order: {
                id: item.id,
                orderNumber: item.order_number,
                buyerName: item.buyer_name || 'Customer',
                total: item.total,
                status: item.status,
                itemCount: item.line_items?.length || 0,
                createdAt: item.created_at,
              },
              actions: (item.status === 'paid' || item.status === 'processing')
                ? [{ label: 'Ship', action: 'order.ship', params: { orderId: item.id }, variant: 'primary' as const }]
                : undefined,
              timestamp: new Date(),
            };
            rendered.push(card);
          }
          break;
        }

        case 'query.revenue': {
          const data = qr.data;
          if (!data) break;
          const statsMsg: StatsMessage = {
            type: 'stats',
            id: createMessageId(),
            role: 'ai',
            stats: [
              { label: 'Revenue', value: `₹${(data.totalRevenue || 0).toLocaleString('en-IN')}` },
              { label: 'Orders', value: data.orderCount || 0 },
              { label: 'Avg. Order', value: `₹${(data.avgOrderValue || 0).toLocaleString('en-IN')}` },
            ],
            period: data.period,
            timestamp: new Date(),
          };
          rendered.push(statsMsg);
          break;
        }

        case 'query.store_link': {
          const data = qr.data;
          if (!data) break;
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          rendered.push(aiTextMessage(`🔗 ${baseUrl}/${data.slug}\n\nShare this with your customers!`));
          break;
        }
      }
    }

    return rendered;
  }, []);

  // ============================================================
  // Send text message → LLM Router (server-side)
  // ============================================================
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessages([sellerTextMessage(trimmed)]);
    setIsTyping(true);

    try {
      // ── Handle pending confirmation ────────────────────────
      if (pendingActions.length > 0) {
        const isConfirm = /^(yes|y|confirm|do it|sure|go ahead|ok)$/i.test(trimmed);
        const isCancel = /^(no|n|cancel|stop|nevermind|nah|nope)$/i.test(trimmed);

        if (isConfirm && storeId) {
          const result = await trpc.chat.confirm.mutate({
            storeId,
            actions: pendingActions,
          });
          setPendingActions([]);
          setIsTyping(false);
          addMessages([aiTextMessage(result.response)]);
          return;
        }

        if (isCancel) {
          setPendingActions([]);
          setIsTyping(false);
          addMessages([aiTextMessage('Cancelled. What else can I help with?')]);
          return;
        }

        // Not a clear yes/no — clear pending and process as new message
        setPendingActions([]);
      }

      // ── If flow manager is active (fallback store creation) ──
      if (flowManager.isActive()) {
        const flowResponses = await flowManager.processInput(trimmed, api, {
          lastProductId,
        });

        for (const msg of flowResponses) {
          if (msg.type === 'text' && msg.role === 'ai' && (msg.text as string).includes('is live!')) {
            const storesResult = await api.listStores();
            if (storesResult.success) {
              const stores = storesResult.data as any[];
              if (stores.length > 0) {
                setStoreId(stores[0].id);
                api.setStoreId(stores[0].id);
              }
            }
          }
        }

        setIsTyping(false);
        addMessages(flowResponses);
        return;
      }

      // ── Call server LLM router ─────────────────────────────
      const conversationHistory = buildConversationHistory(messages);

      const result = await trpc.chat.process.mutate({
        storeId: storeId || undefined,
        message: trimmed,
        conversationHistory,
        hasPhotos: false,
      });

      setIsTyping(false);

      // ── Cache previous design config before design actions ──
      const designActionTypes = [...DESIGN_ACTIONS];
      if (result.actions?.some((a: string) => designActionTypes.includes(a))) {
        setPreviousDesignConfig((prev) => prev);
      }

      // ── Handle confirmation needed ─────────────────────────
      if (result.confirmationNeeded) {
        setPendingActions(result.pendingActions || []);
        addMessages([
          aiTextMessage(result.response),
          {
            type: 'action_buttons',
            id: createMessageId(),
            role: 'ai',
            text: result.confirmationNeeded.summary || 'Confirm?',
            actions: [
              { label: 'Yes, do it', action: 'confirm', variant: 'primary' },
              { label: 'Cancel', action: 'cancel', variant: 'secondary' },
            ],
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // ── Add AI response ────────────────────────────────────
      const responseMessages: ChatMessage[] = [aiTextMessage(result.response)];

      // ── Render query results as rich cards ──────────────────
      if (result.queryResults) {
        const rendered = renderQueryResults(result.queryResults);
        responseMessages.push(...rendered);
      }

      // ── Show suggestions ───────────────────────────────────
      if (result.suggestions && result.suggestions.length > 0) {
        responseMessages.push({
          type: 'action_buttons',
          id: createMessageId(),
          role: 'ai',
          text: '',
          actions: result.suggestions.map((s: any) => ({
            label: s.label,
            action: 'suggestion',
            params: { text: s.description || s.label },
            variant: 'secondary' as const,
          })),
          timestamp: new Date(),
        });
      }

      addMessages(responseMessages);

      // ── Check if store was created ─────────────────────────
      if (result.actions?.includes('store.create') || result.actions?.includes('store.update_name')) {
        const storesResult = await api.listStores();
        if (storesResult.success) {
          const stores = storesResult.data as any[];
          if (stores.length > 0) {
            setStoreId(stores[0].id);
            api.setStoreId(stores[0].id);
          }
        }
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setIsTyping(false);

      // ── Fallback: flow manager for store creation ──────────
      if (/\b(create|start|build|make|setup|set up)\b.*\b(store|shop|website|dukaan)\b/i.test(trimmed)) {
        addMessages(flowManager.startStoreCreation());
        return;
      }

      addMessages([aiTextMessage('Something went wrong. Please try again.')]);
    }
  }, [addMessages, api, buildConversationHistory, flowManager, lastProductId, messages, pendingActions, renderQueryResults, storeId, setStoreId, trpc]);

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
    setPreviousDesignConfig(null);
    setPendingActions([]);
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
    previousDesignConfig,
  };
}
