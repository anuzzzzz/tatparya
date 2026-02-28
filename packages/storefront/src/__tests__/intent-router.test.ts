import { describe, it, expect } from 'vitest';
import { classifyIntent, isPhotoRelated } from '../lib/chat/intent-router';

describe('Intent Router', () => {

  // ── Greetings (pure) ───────────────────────────────────────
  describe('greetings', () => {
    it.each([
      'hi', 'Hello', 'Hey', 'Good morning', 'namaste', 'yo',
    ])('classifies pure "%s" as greeting', (input) => {
      expect(classifyIntent(input).action).toBe('greeting');
    });
  });

  // ── Compound messages (greeting + command) ─────────────────
  describe('compound messages', () => {
    it('"hi show my orders" → order.list, not greeting', () => {
      expect(classifyIntent('hi show my orders').action).toBe('order.list');
    });

    it('"hello, create a store" → store.create', () => {
      expect(classifyIntent('hello, create a store').action).toBe('store.create');
    });

    it('"hey show my products" → product.list', () => {
      expect(classifyIntent('hey show my products').action).toBe('product.list');
    });

    it('"good morning, any new orders?" → order.list', () => {
      expect(classifyIntent('good morning, any new orders?').action).toBe('order.list');
    });
  });

  // ── Typo tolerance ─────────────────────────────────────────
  describe('typo tolerance', () => {
    it('"create a tore" → store.create', () => {
      expect(classifyIntent('create a tore').action).toBe('store.create');
    });

    it('"show my produts" → product.list', () => {
      expect(classifyIntent('show my produts').action).toBe('product.list');
    });

    it('"my oders" → order.list', () => {
      expect(classifyIntent('my oders').action).toBe('order.list');
    });

    it('"crate a store" → store.create', () => {
      expect(classifyIntent('crate a store').action).toBe('store.create');
    });
  });

  // ── Orders (broader patterns) ──────────────────────────────
  describe('order.list', () => {
    it.each([
      'show my orders',
      'my orders',
      'my past orders',
      'past orders',
      'recent orders',
      'any new orders?',
      'list recent orders',
      'orders today',
      'view pending orders',
      'order history',
      'check my orders',
    ])('classifies "%s" as order.list', (input) => {
      expect(classifyIntent(input).action).toBe('order.list');
    });

    it('extracts period = today', () => {
      expect(classifyIntent('orders today').params['period']).toBe('today');
    });

    it('extracts period = week', () => {
      expect(classifyIntent('orders this week').params['period']).toBe('week');
    });
  });

  // ── Products ───────────────────────────────────────────────
  describe('product operations', () => {
    it.each([
      'add a product',
      'create new listing',
      'I want to sell something',
      'upload product photos',
    ])('classifies "%s" as product.add', (input) => {
      expect(classifyIntent(input).action).toBe('product.add');
    });

    it.each([
      'show my products',
      'list all products',
      'my products',
      'my catalog',
      'view my catalog',
      'how many products do I have',
      'product list',
    ])('classifies "%s" as product.list', (input) => {
      expect(classifyIntent(input).action).toBe('product.list');
    });
  });

  // ── Store create ───────────────────────────────────────────
  describe('store.create', () => {
    it.each([
      'create my store',
      'build a website',
      'make my shop',
      "let's get started",
      'setup my store',
      'I want a store',
      'make me a website',
      'new store',
      'open a shop',
    ])('classifies "%s" as store.create', (input) => {
      expect(classifyIntent(input).action).toBe('store.create');
    });
  });

  // ── Price update ───────────────────────────────────────────
  describe('product.update_price', () => {
    it('extracts price from "change price to 500"', () => {
      const intent = classifyIntent('change price to 500');
      expect(intent.action).toBe('product.update_price');
      expect(intent.params['price']).toBe(500);
    });

    it('extracts price with commas', () => {
      const intent = classifyIntent('set price to 1,499');
      expect(intent.action).toBe('product.update_price');
      expect(intent.params['price']).toBe(1499);
    });
  });

  // ── Revenue ────────────────────────────────────────────────
  describe('order.revenue', () => {
    it.each([
      'how much did I earn today',
      'revenue',
      'show my earnings',
      'how much did I make this week',
    ])('classifies "%s" as order.revenue', (input) => {
      expect(classifyIntent(input).action).toBe('order.revenue');
    });
  });

  // ── Store link ─────────────────────────────────────────────
  describe('store.link', () => {
    it.each([
      'my store link',
      'what is my store URL',
      'share my store',
      'where is my website',
    ])('classifies "%s" as store.link', (input) => {
      expect(classifyIntent(input).action).toBe('store.link');
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
  });

  // ── Photo detection ────────────────────────────────────────
  describe('isPhotoRelated', () => {
    it.each([
      'upload photos', 'I have a picture', 'send image',
    ])('detects "%s" as photo related', (input) => {
      expect(isPhotoRelated(input)).toBe(true);
    });

    it.each([
      'show my orders', 'what is my revenue',
    ])('"%s" is not photo related', (input) => {
      expect(isPhotoRelated(input)).toBe(false);
    });
  });
});
