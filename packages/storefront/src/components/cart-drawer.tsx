'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { useStore } from './store-provider';
import { formatPrice, imageUrl as resolveImage, getCartId, cn } from '@/lib/utils';

interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string>;
}

interface CartData {
  id: string;
  storeId: string;
  items: CartItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export function CartView() {
  const { store, design, trpc, setCartCount } = useStore();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');

  const storeUrl = `/${store.slug}`;

  const fetchCart = useCallback(async () => {
    try {
      const cartId = getCartId();
      if (!cartId) { setLoading(false); return; }
      const data = await trpc.cart.get.query({ storeId: store.id, cartId });
      setCart(data as unknown as CartData);
      setCartCount(data.items?.length || 0);
    } catch {
      // Cart doesn't exist yet
    } finally {
      setLoading(false);
    }
  }, [trpc, store.id, setCartCount]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQuantity = async (item: CartItem, newQty: number) => {
    const cartId = getCartId();
    const key = `${item.productId}-${item.variantId || ''}`;
    setUpdating(key);
    try {
      if (newQty <= 0) {
        await trpc.cart.removeItem.mutate({
          storeId: store.id, cartId,
          productId: item.productId,
          variantId: item.variantId,
        });
      } else {
        await trpc.cart.updateItem.mutate({
          storeId: store.id, cartId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: newQty,
        });
      }
      await fetchCart();
    } catch {
      // Handle error silently
    } finally {
      setUpdating(null);
    }
  };

  const applyDiscount = async () => {
    if (!discountInput.trim()) return;
    setDiscountError('');
    try {
      const cartId = getCartId();
      await trpc.cart.applyDiscount.mutate({
        storeId: store.id,
        cartId,
        discountCode: discountInput.trim(),
      });
      await fetchCart();
      setDiscountInput('');
    } catch (err: any) {
      setDiscountError(err?.message || 'Invalid discount code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: design.palette.primary }} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-base mb-4" style={{ color: design.palette.textMuted }}>
          Your cart is empty
        </p>
        <Link href={`${storeUrl}/collections/all`} className="btn-primary text-sm">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Cart items */}
      <div className="md:col-span-2 space-y-4">
        {cart.items.map((item) => {
          const key = `${item.productId}-${item.variantId || ''}`;
          const isUpdating = updating === key;
          return (
            <div
              key={key}
              className={cn('flex gap-4 p-4 transition-opacity', isUpdating && 'opacity-50')}
              style={{
                backgroundColor: design.palette.surface,
                borderRadius: 'var(--radius)',
              }}
            >
              <div
                className="w-20 h-20 flex-shrink-0 overflow-hidden"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <img
                  src={resolveImage(item.imageUrl)}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate" style={{ color: design.palette.text }}>
                  {item.name}
                </h3>
                {item.attributes && Object.keys(item.attributes).length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: design.palette.textMuted }}>
                    {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
                <p className="text-sm font-bold mt-1" style={{ color: design.palette.primary }}>
                  {formatPrice(item.price * item.quantity)}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border" style={{ borderRadius: 'var(--radius)', borderColor: `color-mix(in srgb, ${design.palette.text} 15%, transparent)` }}>
                    <button
                      onClick={() => updateQuantity(item, item.quantity - 1)}
                      className="p-1.5 hover:opacity-60 transition-opacity"
                      disabled={isUpdating}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 text-sm font-medium min-w-[32px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item, item.quantity + 1)}
                      className="p-1.5 hover:opacity-60 transition-opacity"
                      disabled={isUpdating}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => updateQuantity(item, 0)}
                    className="p-1.5 hover:opacity-60 transition-opacity"
                    style={{ color: design.palette.textMuted }}
                    disabled={isUpdating}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order summary */}
      <div>
        <div
          className="p-6 sticky top-20"
          style={{
            backgroundColor: design.palette.surface,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h3 className="font-display text-lg font-bold mb-4" style={{ color: design.palette.text }}>
            Order Summary
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: design.palette.textMuted }}>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            {cart.discountAmount > 0 && (
              <div className="flex justify-between" style={{ color: '#16a34a' }}>
                <span>Discount ({cart.discountCode})</span>
                <span>-{formatPrice(cart.discountAmount)}</span>
              </div>
            )}
            {cart.taxAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: design.palette.textMuted }}>GST</span>
                <span>{formatPrice(cart.taxAmount)}</span>
              </div>
            )}
          </div>

          <div
            className="flex justify-between font-bold text-base mt-4 pt-4 border-t"
            style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
          >
            <span>Total</span>
            <span style={{ color: design.palette.primary }}>{formatPrice(cart.total)}</span>
          </div>

          {/* Discount code */}
          {!cart.discountCode && (
            <div className="mt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="text"
                    placeholder="Discount code"
                    value={discountInput}
                    onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(''); }}
                    className="input-field pl-9 !py-2 text-xs"
                  />
                </div>
                <button
                  onClick={applyDiscount}
                  className="px-3 py-2 text-xs font-medium"
                  style={{
                    backgroundColor: design.palette.text,
                    color: design.palette.background,
                    borderRadius: 'var(--radius)',
                  }}
                >
                  Apply
                </button>
              </div>
              {discountError && (
                <p className="text-xs text-red-500 mt-1">{discountError}</p>
              )}
            </div>
          )}

          <Link
            href={`${storeUrl}/cart?checkout=true`}
            className="btn-primary w-full text-center mt-4 text-sm"
          >
            Proceed to Checkout
          </Link>

          <Link
            href={`${storeUrl}/collections/all`}
            className="block text-center text-xs mt-3 hover:opacity-70 transition-opacity"
            style={{ color: design.palette.textMuted }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
