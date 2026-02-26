import { describe, it, expect } from 'vitest';
import { ORDER_TRANSITIONS } from '@tatparya/shared';

describe('Order State Machine', () => {
  describe('Valid transitions', () => {
    const validPaths = [
      // UPI/Card flow
      ['created', 'payment_pending', 'paid', 'processing', 'shipped', 'out_for_delivery', 'delivered'],
      // COD flow
      ['created', 'cod_confirmed', 'cod_otp_verified', 'processing', 'shipped', 'delivered'],
      // Cancellation at various stages
      ['created', 'cancelled'],
      ['payment_pending', 'cancelled'],
      ['paid', 'cancelled'],
      ['processing', 'cancelled'],
      // Refund
      ['paid', 'refunded'],
      ['delivered', 'refunded'],
      // RTO
      ['shipped', 'rto'],
      ['out_for_delivery', 'rto'],
    ];

    for (const path of validPaths) {
      it(`allows: ${path.join(' → ')}`, () => {
        for (let i = 0; i < path.length - 1; i++) {
          const from = path[i]!;
          const to = path[i + 1]!;
          const allowed = ORDER_TRANSITIONS[from];
          expect(allowed, `Missing transitions for "${from}"`).toBeDefined();
          expect(allowed).toContain(to);
        }
      });
    }
  });

  describe('Invalid transitions', () => {
    const invalidTransitions = [
      ['created', 'shipped'],         // Can't skip payment
      ['created', 'delivered'],       // Can't skip everything
      ['payment_pending', 'shipped'], // Can't skip processing
      ['delivered', 'shipped'],       // Can't go backwards
      ['cancelled', 'paid'],          // Terminal state
      ['refunded', 'processing'],     // Terminal state
      ['rto', 'delivered'],           // Terminal state
      ['cod_confirmed', 'paid'],      // COD can't become prepaid
    ];

    for (const [from, to] of invalidTransitions) {
      it(`blocks: ${from} → ${to}`, () => {
        const allowed = ORDER_TRANSITIONS[from!];
        expect(allowed).toBeDefined();
        expect(allowed).not.toContain(to);
      });
    }
  });

  describe('Terminal states', () => {
    const terminalStates = ['cancelled', 'refunded', 'rto'];

    for (const state of terminalStates) {
      it(`${state} has no outgoing transitions`, () => {
        expect(ORDER_TRANSITIONS[state]).toEqual([]);
      });
    }
  });

  describe('Every state is reachable', () => {
    const allStates = Object.keys(ORDER_TRANSITIONS);
    const reachable = new Set<string>(['created']); // Start from 'created'

    // BFS
    const queue = ['created'];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const next = ORDER_TRANSITIONS[current] || [];
      for (const n of next) {
        if (!reachable.has(n)) {
          reachable.add(n);
          queue.push(n);
        }
      }
    }

    for (const state of allStates) {
      it(`state "${state}" is reachable from "created"`, () => {
        expect(reachable.has(state)).toBe(true);
      });
    }
  });
});
