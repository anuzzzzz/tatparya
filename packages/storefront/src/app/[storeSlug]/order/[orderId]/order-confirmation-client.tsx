'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Package, MessageCircle, Copy, Check } from 'lucide-react';
import { useStore } from '@/components/store-provider';
import { formatPrice, imageUrl as resolveImage } from '@/lib/utils';

interface OrderConfirmationClientProps {
  store: any;
  order: any;
  storeSlug: string;
}

export function OrderConfirmationClient({ store, order, storeSlug }: OrderConfirmationClientProps) {
  const { design } = useStore();
  const storeUrl = `/${storeSlug}`;
  const [copied, setCopied] = React.useState(false);

  const lineItems = order.lineItems || [];
  const address = order.shippingAddress;

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappConfig = store.whatsappConfig as any;
  const shareOnWhatsApp = () => {
    if (!whatsappConfig?.businessPhone) return;
    const phone = whatsappConfig.businessPhone.replace(/^\+/, '');
    const text = `Hi! I just placed an order.\nOrder ID: ${order.id}\nName: ${order.buyerName}\nTotal: ${formatPrice(order.totalAmount || order.total || 0)}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div
      className="container-store"
      style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Success banner */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ backgroundColor: `color-mix(in srgb, #16a34a 10%, transparent)` }}
          >
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2" style={{ color: design.palette.text }}>
            Order Confirmed!
          </h1>
          <p className="text-sm" style={{ color: design.palette.textMuted }}>
            Thank you for your order, {order.buyerName}
          </p>
        </div>

        {/* Order ID */}
        <div
          className="flex items-center justify-between p-4 mb-6"
          style={{
            backgroundColor: design.palette.surface,
            borderRadius: 'var(--radius)',
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: design.palette.textMuted }}>
              Order ID
            </p>
            <p className="text-sm font-mono font-medium mt-0.5" style={{ color: design.palette.text }}>
              {order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={copyOrderId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors hover:opacity-70"
            style={{
              borderRadius: 'var(--radius)',
              borderColor: `color-mix(in srgb, ${design.palette.text} 15%, transparent)`,
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Order details */}
        <div
          className="p-5 mb-6"
          style={{
            backgroundColor: design.palette.surface,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h2 className="font-display text-base font-bold mb-4" style={{ color: design.palette.text }}>
            Order Details
          </h2>

          {/* Line items */}
          <div className="space-y-3 mb-4">
            {lineItems.map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div
                  className="w-14 h-14 flex-shrink-0 overflow-hidden"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  <img
                    src={resolveImage(item.imageUrl)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: design.palette.textMuted }}>
                      {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: design.palette.textMuted }}>
                    Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-medium" style={{ color: design.palette.primary }}>
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div
            className="pt-4 border-t space-y-1.5 text-sm"
            style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
          >
            {order.subtotalAmount && (
              <div className="flex justify-between">
                <span style={{ color: design.palette.textMuted }}>Subtotal</span>
                <span>{formatPrice(order.subtotalAmount)}</span>
              </div>
            )}
            {(order.discountAmount || 0) > 0 && (
              <div className="flex justify-between" style={{ color: '#16a34a' }}>
                <span>Discount</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            {(order.taxAmount || 0) > 0 && (
              <div className="flex justify-between">
                <span style={{ color: design.palette.textMuted }}>GST</span>
                <span>{formatPrice(order.taxAmount)}</span>
              </div>
            )}
            <div
              className="flex justify-between font-bold text-base pt-2 border-t"
              style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
            >
              <span>Total</span>
              <span style={{ color: design.palette.primary }}>
                {formatPrice(order.totalAmount || order.total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        {address && (
          <div
            className="p-5 mb-6"
            style={{
              backgroundColor: design.palette.surface,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div className="flex items-start gap-3">
              <Package size={18} className="mt-0.5" style={{ color: design.palette.textMuted }} />
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: design.palette.text }}>
                  Delivery Address
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: design.palette.textMuted }}>
                  {address.name}<br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}<br />
                  {address.city}, {address.state} {address.pincode}<br />
                  {address.phone}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment method */}
        <div
          className="flex items-center gap-3 p-4 mb-6"
          style={{
            backgroundColor: `color-mix(in srgb, ${design.palette.primary} 5%, transparent)`,
            borderRadius: 'var(--radius)',
            border: `1px solid color-mix(in srgb, ${design.palette.primary} 15%, transparent)`,
          }}
        >
          <CheckCircle size={16} style={{ color: design.palette.primary }} />
          <p className="text-sm">
            <span className="font-medium">Payment:</span>{' '}
            <span style={{ color: design.palette.textMuted }}>
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod?.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`${storeUrl}/collections/all`} className="btn-primary flex-1 text-center text-sm">
            Continue Shopping
          </Link>
          {whatsappConfig?.enabled && whatsappConfig?.businessPhone && (
            <button
              onClick={shareOnWhatsApp}
              className="btn-secondary flex-1 text-sm"
              style={{ color: '#25D366', borderColor: '#25D366' }}
            >
              <MessageCircle size={16} />
              Confirm on WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
