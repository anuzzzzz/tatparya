'use client';

import { useState, useCallback, useRef } from 'react';
import {
  type ChatMessage,
  aiTextMessage,
  sellerTextMessage,
  sellerImageMessage,
  createMessageId,
} from './types';
import { classifyIntent, isPhotoRelated } from './intent-router';
import { generateResponse } from './response-generator';

// ============================================================
// Chat State Hook
//
// Phase A: Placeholder responses (done)
// Phase B: Intent router → response generator (current)
// Phase C: Will wire to tRPC for real data
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
    text: 'Upload product photos and I\'ll create your listings automatically. Or tell me what you need — I can help with orders, pricing, and store setup.',
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
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // ============================================================
  // Send text message → classify intent → generate response
  // ============================================================
  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Add seller message
    const sellerMsg = sellerTextMessage(trimmed);
    setMessages((prev) => [...prev, sellerMsg]);
    scrollToBottom();

    // Classify intent
    const intent = classifyIntent(trimmed);

    // If they're asking about photos, prompt them to upload
    if (isPhotoRelated(trimmed) && intent.action !== 'product.add') {
      intent.action = 'product.add';
      intent.confidence = 0.85;
    }

    // Show typing indicator
    setIsTyping(true);

    // Simulate processing delay (makes it feel natural)
    const delay = intent.confidence > 0.8 ? 400 + Math.random() * 300 : 600 + Math.random() * 500;

    setTimeout(() => {
      setIsTyping(false);
      const response = generateResponse(intent);
      setMessages((prev) => [...prev, response]);
      scrollToBottom();
    }, delay);
  }, [scrollToBottom]);

  // ============================================================
  // Send images → trigger product creation flow
  // Phase C: Will call catalog.generateFromImages
  // ============================================================
  const sendImages = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Create local preview URLs
    const imageUrls = files.map((f) => URL.createObjectURL(f));

    const imageMsg = sellerImageMessage(
      imageUrls,
      files.length === 1 ? files[0]!.name : `${files.length} photos`,
    );
    setMessages((prev) => [...prev, imageMsg]);
    scrollToBottom();

    // Show typing
    setIsTyping(true);

    // Classify as photo upload intent
    const intent = classifyIntent('[photo_upload]');

    setTimeout(() => {
      setIsTyping(false);
      const response = generateResponse(intent);
      setMessages((prev) => [...prev, response]);
      scrollToBottom();
    }, 1000 + Math.random() * 500);
  }, [scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages(WELCOME_MESSAGES);
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    sendImages,
    clearChat,
    messagesEndRef,
  };
}
