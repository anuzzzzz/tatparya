import { describe, it, expect } from 'vitest';
import { classifyIntent, isPhotoRelated } from '../lib/chat/intent-router';

// ============================================================
// Intent Router Tests
//
// Tests that seller messages get classified into the correct
// intent with proper params. Covers English and Hinglish.
// ============================================================

describe('Intent Router', () => {

  // ── Greetings ──────────────────────────────────────────────
  describe('greetings', () => {
    it.each([
      'hi',
      'Hello',
      'Hey',
      'Good morning',
      'good afternoon',
      'namaste',
    ])('classifies "%s" as greeting', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('greeting');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });
  });

  // ── Help ───────────────────────────────────────────────────
  describe('help', () => {
    it.each([
      'help',
      'What can you do?',
      'how does this work',
      'help me',
    ])('classifies "%s" as help', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('help');
    });
  });

  // ── Product Add ────────────────────────────────────────────
  describe('product.add', () => {
    it.each([
      'add a product',
      'create new listing',
      'I want to sell something',
      'upload product photos',
      'Add new item',
      'create product',
    ])('classifies "%s" as product.add', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('product.add');
    });
  });

  // ── Photo Upload ───────────────────────────────────────────
  describe('product.from_photos', () => {
    it('classifies [photo_upload] marker', () => {
      const intent = classifyIntent('[photo_upload]');
      expect(intent.action).toBe('product.from_photos');
      expect(intent.confidence).toBe(1.0);
    });
  });

  // ── Product List ───────────────────────────────────────────
  describe('product.list', () => {
    it.each([
      'show my products',
      'list all products',
      'view my catalog',
      'my products',
      'how many products do I have',
    ])('classifies "%s" as product.list', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('product.list');
    });
  });

  // ── Price Update ───────────────────────────────────────────
  describe('product.update_price', () => {
    it('classifies "change price to 500"', () => {
      const intent = classifyIntent('change price to 500');
      expect(intent.action).toBe('product.update_price');
      expect(intent.params['price']).toBe(500);
    });

    it('classifies "update the price"', () => {
      const intent = classifyIntent('update the price');
      expect(intent.action).toBe('product.update_price');
    });

    it('extracts price with commas', () => {
      const intent = classifyIntent('set price to 1,499');
      expect(intent.action).toBe('product.update_price');
      expect(intent.params['price']).toBe(1499);
    });
  });

  // ── Publish ────────────────────────────────────────────────
  describe('product.publish', () => {
    it.each([
      'publish the product',
      'make it live',
      'go live',
      'activate this product',
    ])('classifies "%s" as product.publish', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('product.publish');
    });
  });

  // ── Orders ─────────────────────────────────────────────────
  describe('order.list', () => {
    it.each([
      'show my orders',
      'any new orders?',
      'list recent orders',
      'orders today',
      'view pending orders',
    ])('classifies "%s" as order.list', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('order.list');
    });

    it('extracts period = today', () => {
      const intent = classifyIntent('orders today');
      expect(intent.params['period']).toBe('today');
    });

    it('extracts period = week', () => {
      const intent = classifyIntent('orders this week');
      expect(intent.params['period']).toBe('week');
    });

    it('extracts pending status', () => {
      const intent = classifyIntent('show pending orders');
      expect(intent.params['status']).toBe('created');
    });
  });

  // ── Revenue ────────────────────────────────────────────────
  describe('order.revenue', () => {
    it.each([
      'how much did I earn today',
      'revenue',
      'show my earnings',
      "today's sales",
      'how much did I make this week',
    ])('classifies "%s" as order.revenue', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('order.revenue');
    });

    it('defaults period to today', () => {
      const intent = classifyIntent('revenue');
      expect(intent.params['period']).toBe('today');
    });

    it('extracts week period', () => {
      const intent = classifyIntent('how much did I earn this week');
      expect(intent.params['period']).toBe('week');
    });
  });

  // ── Store Create ───────────────────────────────────────────
  describe('store.create', () => {
    it.each([
      'create my store',
      'build a website',
      'make my shop',
      "let's get started",
      'setup my store',
      'start a new store',
    ])('classifies "%s" as store.create', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('store.create');
    });
  });

  // ── Store Link ─────────────────────────────────────────────
  describe('store.link', () => {
    it.each([
      'my store link',
      'what is my store URL',
      'share my store',
      'where is my website',
    ])('classifies "%s" as store.link', (input) => {
      const intent = classifyIntent(input);
      expect(intent.action).toBe('store.link');
    });
  });

  // ── Store Rename ───────────────────────────────────────────
  describe('store.rename', () => {
    it('extracts new name', () => {
      const intent = classifyIntent('change store name to Priya Sarees');
      expect(intent.action).toBe('store.rename');
      expect(intent.params['name']).toBe('Priya Sarees');
    });

    it('handles without name', () => {
      const intent = classifyIntent('rename my store');
      expect(intent.action).toBe('store.rename');
    });
  });

  // ── Unknown / Fallback ─────────────────────────────────────
  describe('unknown', () => {
    it('returns unknown for gibberish', () => {
      const intent = classifyIntent('asdjkfhasdkjfh');
      expect(intent.action).toBe('unknown');
      expect(intent.confidence).toBe(0);
      expect(intent.requiresFollowUp).toBeTruthy();
    });

    it('returns unknown for ambiguous input', () => {
      const intent = classifyIntent('I need to do something');
      expect(intent.action).toBe('unknown');
    });
  });

  // ── Photo Detection Utility ────────────────────────────────
  describe('isPhotoRelated', () => {
    it.each([
      'upload photos',
      'I have a picture',
      'send image',
      'take a photo of my product',
    ])('detects "%s" as photo related', (input) => {
      expect(isPhotoRelated(input)).toBe(true);
    });

    it.each([
      'show my orders',
      'what is my revenue',
    ])('does not detect "%s" as photo related', (input) => {
      expect(isPhotoRelated(input)).toBe(false);
    });
  });
});
