import type { TatparyaAction, StoreSnapshot } from '@tatparya/shared';
import { DESIGN_ACTIONS } from '@tatparya/shared';
import { ORDER_TRANSITIONS } from '@tatparya/shared';
import {
  validateAndFixPalette,
  contrastRatio,
} from './store-design-ai.service.js';

// ============================================================
// Action Validators
//
// Runs AFTER Zod structural validation, BEFORE execution.
// Three groups:
//   1. Design — WCAG contrast, auto-fix palettes
//   2. Product — price sanity checks
//   3. Order — state machine transitions
//
// Returns { valid: true, fixed? } or { valid: false, error }
// If fixable (bad contrast), auto-fixes and returns the
// corrected action. If unfixable (invalid state transition),
// returns a human-readable error for the chat response.
// ============================================================

export interface ValidationResult {
  valid: boolean;
  fixed?: TatparyaAction;
  error?: string;
}

export function validateAction(
  action: TatparyaAction,
  snapshot: StoreSnapshot | null,
): ValidationResult {
  // Design actions — WCAG validation
  if (DESIGN_ACTIONS.has(action.type)) {
    return validateDesignAction(action);
  }

  // Product actions — price sanity
  if (action.type.startsWith('product.')) {
    return validateProductAction(action, snapshot);
  }

  // Order actions — state machine
  if (action.type.startsWith('order.')) {
    return validateOrderAction(action, snapshot);
  }

  // All other actions pass through
  return { valid: true };
}

// ============================================================
// Design Validators
// ============================================================

function validateDesignAction(action: TatparyaAction): ValidationResult {
  // Only palette actions need WCAG checking
  if (action.type === 'store.update_palette') {
    const palette = (action.payload as any).palette;
    if (!palette) return { valid: true };

    const fixed = validateAndFixPalette({ ...palette });

    // Check if anything was changed
    const wasFixed =
      fixed.text !== palette.text ||
      fixed.textMuted !== palette.textMuted ||
      fixed.primary !== palette.primary;

    if (wasFixed) {
      return {
        valid: true,
        fixed: {
          type: 'store.update_palette',
          payload: { palette: fixed },
        } as TatparyaAction,
      };
    }

    return { valid: true };
  }

  if (action.type === 'store.update_design_bulk') {
    const design = (action.payload as any).design;
    if (!design?.palette) return { valid: true };

    const fixed = validateAndFixPalette({ ...design.palette });
    const wasFixed =
      fixed.text !== design.palette.text ||
      fixed.textMuted !== design.palette.textMuted ||
      fixed.primary !== design.palette.primary;

    if (wasFixed) {
      return {
        valid: true,
        fixed: {
          type: 'store.update_design_bulk',
          payload: { design: { ...design, palette: fixed } },
        } as TatparyaAction,
      };
    }

    return { valid: true };
  }

  // Font validation — just check non-empty
  if (action.type === 'store.update_fonts') {
    const fonts = (action.payload as any).fonts;
    if (!fonts?.display || !fonts?.body) {
      return { valid: false, error: 'Font names cannot be empty.' };
    }
    return { valid: true };
  }

  return { valid: true };
}

// ============================================================
// Product Validators
// ============================================================

const MAX_PRICE = 10_00_000; // ₹10 lakh

function validateProductAction(
  action: TatparyaAction,
  snapshot: StoreSnapshot | null,
): ValidationResult {
  if (action.type === 'product.create') {
    const p = action.payload as any;
    if (p.price !== undefined) {
      if (p.price <= 0) return { valid: false, error: 'Price must be greater than ₹0.' };
      if (p.price > MAX_PRICE) return { valid: false, error: `Price can't exceed ₹${MAX_PRICE.toLocaleString('en-IN')}.` };
    }
    if (p.compareAtPrice !== undefined && p.price !== undefined && p.compareAtPrice <= p.price) {
      return { valid: false, error: 'Compare-at price must be higher than the selling price.' };
    }
    return { valid: true };
  }

  if (action.type === 'product.update') {
    const p = action.payload as any;
    if (p.price !== undefined) {
      if (p.price <= 0) return { valid: false, error: 'Price must be greater than ₹0.' };
      if (p.price > MAX_PRICE) return { valid: false, error: `Price can't exceed ₹${MAX_PRICE.toLocaleString('en-IN')}.` };
    }

    // Verify product exists in snapshot
    if (p.productId && snapshot?.recentProducts) {
      const exists = snapshot.recentProducts.some((pr) => pr.id === p.productId);
      if (!exists && snapshot.recentProducts.length > 0) {
        // Product might exist but not be in recent 10 — allow but warn
        // Don't block; the DB will reject if truly missing
      }
    }

    return { valid: true };
  }

  if (action.type === 'product.bulk_update_price') {
    const p = action.payload as any;
    if (p.adjustmentType === 'percentage' && p.adjustmentValue <= -100) {
      return { valid: false, error: "Can't reduce prices by 100% or more — that would make them free or negative." };
    }
    if (p.adjustmentType === 'flat' && snapshot?.recentProducts) {
      // Check if any known product would go negative
      const wouldGoNegative = snapshot.recentProducts.some(
        (pr) => pr.price + p.adjustmentValue <= 0,
      );
      if (wouldGoNegative) {
        return { valid: false, error: 'This adjustment would make some products free or negative. Try a smaller reduction.' };
      }
    }
    return { valid: true };
  }

  return { valid: true };
}

// ============================================================
// Order Validators
// ============================================================

function validateOrderAction(
  action: TatparyaAction,
  snapshot: StoreSnapshot | null,
): ValidationResult {
  if (action.type === 'order.update_status') {
    const p = action.payload as any;
    return validateOrderTransition(p.orderId, p.status, snapshot);
  }

  if (action.type === 'order.ship') {
    const p = action.payload as any;
    return validateOrderTransition(p.orderId, 'shipped', snapshot);
  }

  if (action.type === 'order.cancel') {
    const p = action.payload as any;
    return validateOrderTransition(p.orderId, 'cancelled', snapshot);
  }

  return { valid: true };
}

function validateOrderTransition(
  orderId: string,
  targetStatus: string,
  snapshot: StoreSnapshot | null,
): ValidationResult {
  if (!snapshot?.recentOrders) return { valid: true }; // Can't check, let DB handle it

  const order = snapshot.recentOrders.find((o) => o.id === orderId);
  if (!order) return { valid: true }; // Order not in recent list, let DB handle it

  const currentStatus = order.status;
  const allowed = ORDER_TRANSITIONS[currentStatus];

  if (!allowed) {
    return { valid: false, error: `Order #${order.orderNumber} has status "${currentStatus}" which can't be changed.` };
  }

  if (!allowed.includes(targetStatus)) {
    const friendlyStatus: Record<string, string> = {
      created: 'just created',
      payment_pending: 'waiting for payment',
      paid: 'paid',
      cod_confirmed: 'COD confirmed',
      processing: 'being processed',
      shipped: 'already shipped',
      out_for_delivery: 'out for delivery',
      delivered: 'already delivered',
      cancelled: 'already cancelled',
      refunded: 'already refunded',
      rto: 'returned to origin',
    };

    return {
      valid: false,
      error: `Can't change order #${order.orderNumber} to "${targetStatus}" — it's ${friendlyStatus[currentStatus] || currentStatus}.`,
    };
  }

  return { valid: true };
}
