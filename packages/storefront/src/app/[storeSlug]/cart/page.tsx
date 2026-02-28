'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/components/store-provider';
import { CartView } from '@/components/cart-drawer';
import { CheckoutForm } from '@/components/checkout-form';
import { formatPrice, imageUrl as resolveImage } from '@/lib/utils';

export default function CartPage() {
  const { store, design } = useStore();
  const searchParams = useSearchParams();
  const storeUrl = `/${store.slug}`;
  const showCheckout = searchParams.get('checkout') === 'true';

  return (
    <div
      className="container-store"
      style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}
    >
      {/* Back nav */}
      <Link
        href={showCheckout ? `${storeUrl}/cart` : `${storeUrl}/collections/all`}
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 hover:opacity-70 transition-opacity"
        style={{ color: design.palette.textMuted }}
      >
        <ArrowLeft size={14} />
        {showCheckout ? 'Back to Cart' : 'Continue Shopping'}
      </Link>

      <h1
        className="font-display text-2xl md:text-3xl font-bold mb-8"
        style={{ color: design.palette.text }}
      >
        {showCheckout ? 'Checkout' : 'Your Cart'}
      </h1>

      {showCheckout ? (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <CheckoutForm />
          </div>
          <div>
            <CartSummaryMini />
          </div>
        </div>
      ) : (
        <CartView />
      )}
    </div>
  );
}

/**
 * Compact cart summary shown next to the checkout form.
 */
function CartSummaryMini() {
  const { store, design, trpc } = useStore();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cartId = localStorage.getItem('tatparya_cart_id');
        if (!cartId) { setLoading(false); return; }
        const data = await trpc.cart.get.query({ storeId: store.id, cartId });
        setCart(data);
      } catch {
        // Cart doesn't exist
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [trpc, store.id]);

  if (loading || !cart || !cart.items?.length) return null;

  return (
    <div
      className="p-5 sticky top-20"
      style={{
        backgroundColor: design.palette.surface,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <h3
        className="font-display text-base font-bold mb-4"
        style={{ color: design.palette.text }}
      >
        Order Summary
      </h3>

      <div className="space-y-3 mb-4">
        {cart.items.map((item: any) => (
          <div key={`${item.productId}-${item.variantId || ''}`} className="flex gap-3">
            <div
              className="w-12 h-12 flex-shrink-0 overflow-hidden"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <img
                src={resolveImage(item.imageUrl)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-xs" style={{ color: design.palette.textMuted }}>
                Qty: {item.quantity}
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: design.palette.primary }}>
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="pt-3 border-t space-y-1.5 text-sm"
        style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
      >
        <div className="flex justify-between">
          <span style={{ color: design.palette.textMuted }}>Subtotal</span>
          <span>{formatPrice(cart.subtotal)}</span>
        </div>
        {cart.discountAmount > 0 && (
          <div className="flex justify-between" style={{ color: '#16a34a' }}>
            <span>Discount</span>
            <span>-{formatPrice(cart.discountAmount)}</span>
          </div>
        )}
        {cart.taxAmount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: design.palette.textMuted }}>GST</span>
            <span>{formatPrice(cart.taxAmount)}</span>
          </div>
        )}
        <div
          className="flex justify-between font-bold pt-2 border-t"
          style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
        >
          <span>Total</span>
          <span style={{ color: design.palette.primary }}>{formatPrice(cart.total)}</span>
        </div>
      </div>
    </div>
  );
}
