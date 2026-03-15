'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSellerAuth } from '@/lib/chat/auth-provider';

const STATUS_BADGE: Record<string, string> = {
  created:         'db-badge--gray',
  payment_pending: 'db-badge--yellow',
  paid:            'db-badge--green',
  processing:      'db-badge--blue',
  shipped:         'db-badge--blue',
  delivered:       'db-badge--green',
  cancelled:       'db-badge--red',
  refunded:        'db-badge--red',
};

function fmtCurrency(n: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type ToastVariant = 'success' | 'error';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const { storeId, trpc } = useSellerAuth();

  const [order, setOrder]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl]       = useState('');
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null);

  const showToast = (msg: string, variant: ToastVariant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOrder = useCallback(() => {
    if (!storeId || !orderId) return;
    setLoading(true);
    trpc.order.get.query({ storeId, orderId })
      .then((o: any) => setOrder(o))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [storeId, orderId, trpc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const updateStatus = async (newStatus: string, extra?: Record<string, string>) => {
    if (!storeId || !orderId) return;
    setUpdating(true);
    try {
      await trpc.order.updateStatus.mutate({
        storeId,
        orderId,
        status: newStatus as any,
        ...extra,
      });
      showToast(`Order marked as ${newStatus}`);
      fetchOrder();
      setShowTracking(false);
    } catch (err: any) {
      showToast(err?.message ?? 'Update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (!storeId) return <div className="db-page-empty">No store selected.</div>;

  if (loading) return <div className="db-loading-inline">Loading order…</div>;

  if (!order) {
    return (
      <div className="db-page">
        <Link href="/dashboard/orders" className="db-back">
          <ArrowLeft size={15} /> Back to Orders
        </Link>
        <p style={{ color: '#9ca3af' }}>Order not found.</p>
      </div>
    );
  }

  const status: string = order.status;
  const lineItems: any[] = order.lineItems ?? [];
  const addr = order.shippingAddress as any;

  return (
    <div className="db-page">
      {toast && (
        <div className={`db-toast db-toast--${toast.variant}`}>{toast.msg}</div>
      )}

      <Link href="/dashboard/orders" className="db-back">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="db-order-header">
        <h1 className="db-order-number">#{order.orderNumber}</h1>
        <span className={`db-badge ${STATUS_BADGE[status] ?? 'db-badge--gray'}`}>
          {status}
        </span>
        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
          {fmtDate(order.createdAt)}
        </span>
      </div>

      <div className="db-two-col">
        {/* Left column */}
        <div>
          {/* Line items */}
          <div className="db-card">
            <div className="db-card-title">Items</div>
            <div className="db-line-items">
              {lineItems.map((item: any, i: number) => {
                const img = (item.imageUrl as string) || null;
                const attrs = item.attributes
                  ? Object.entries(item.attributes as Record<string, string>)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                  : '';
                return (
                  <div key={i} className="db-line-item">
                    {img
                      ? <img src={img} alt={item.productName} className="db-item-img" />
                      : <div className="db-item-img-placeholder">📦</div>
                    }
                    <div style={{ flex: 1 }}>
                      <div className="db-item-name">{item.productName}</div>
                      {attrs && <div className="db-item-attrs">{attrs}</div>}
                      <div className="db-item-attrs">Qty: {item.quantity}</div>
                    </div>
                    <div className="db-item-price">
                      <div style={{ fontWeight: 600 }}>{fmtCurrency(item.totalPrice)}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        {fmtCurrency(item.unitPrice)} each
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="db-totals">
              <div className="db-total-row">
                <span>Subtotal</span>
                <span>{fmtCurrency(order.subtotal ?? 0)}</span>
              </div>
              {(order.discountAmount ?? 0) > 0 && (
                <div className="db-total-row" style={{ color: '#16a34a' }}>
                  <span>Discount</span>
                  <span>−{fmtCurrency(order.discountAmount)}</span>
                </div>
              )}
              {(order.tax ?? 0) > 0 && (
                <div className="db-total-row">
                  <span>Tax</span>
                  <span>{fmtCurrency(order.tax)}</span>
                </div>
              )}
              {(order.shippingCost ?? 0) > 0 && (
                <div className="db-total-row">
                  <span>Shipping</span>
                  <span>{fmtCurrency(order.shippingCost)}</span>
                </div>
              )}
              <div className="db-total-row db-total-row--bold">
                <span>Total</span>
                <span>{fmtCurrency(order.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="db-card">
            <div className="db-card-title">Actions</div>
            <div className="db-status-actions">
              {status === 'paid' && (
                <button
                  className="db-btn-primary"
                  onClick={() => updateStatus('processing')}
                  disabled={updating}
                >
                  Process Order
                </button>
              )}
              {status === 'processing' && !showTracking && (
                <button
                  className="db-btn-primary"
                  onClick={() => setShowTracking(true)}
                >
                  Mark as Shipped
                </button>
              )}
              {status === 'shipped' && (
                <button
                  className="db-btn-primary"
                  onClick={() => updateStatus('delivered')}
                  disabled={updating}
                >
                  Mark Delivered
                </button>
              )}
              {!['delivered', 'cancelled', 'refunded'].includes(status) && (
                <button
                  className="db-btn-danger"
                  onClick={() => updateStatus('cancelled')}
                  disabled={updating}
                >
                  Cancel Order
                </button>
              )}
            </div>

            {/* Tracking form */}
            {showTracking && (
              <div className="db-tracking-form">
                <div className="db-field">
                  <label className="db-label">Tracking Number</label>
                  <input
                    className="db-input"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="e.g. DTDC123456789"
                  />
                </div>
                <div className="db-field">
                  <label className="db-label">Tracking URL (optional)</label>
                  <input
                    className="db-input"
                    value={trackingUrl}
                    onChange={e => setTrackingUrl(e.target.value)}
                    placeholder="https://track.dtdc.com/..."
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="db-btn-primary"
                    onClick={() => updateStatus('shipped', {
                      trackingNumber: trackingNumber || undefined,
                      trackingUrl: trackingUrl || undefined,
                    } as any)}
                    disabled={updating}
                  >
                    Confirm Shipment
                  </button>
                  <button
                    className="db-btn-secondary"
                    onClick={() => setShowTracking(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Customer info */}
          <div className="db-card">
            <div className="db-card-title">Customer</div>
            <div className="db-info-row">
              <span className="db-info-label">Name</span>
              <span className="db-info-value">{order.buyerName || '—'}</span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Phone</span>
              <span className="db-info-value">{order.buyerPhone || '—'}</span>
            </div>
            {order.buyerEmail && (
              <div className="db-info-row">
                <span className="db-info-label">Email</span>
                <span className="db-info-value">{order.buyerEmail}</span>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {addr && (
            <div className="db-card">
              <div className="db-card-title">Shipping Address</div>
              {addr.line1 && <div style={{ fontSize: '0.875rem', color: '#374151' }}>{addr.line1}</div>}
              {addr.line2 && <div style={{ fontSize: '0.875rem', color: '#374151' }}>{addr.line2}</div>}
              <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
              </div>
              {addr.country && <div style={{ fontSize: '0.875rem', color: '#374151' }}>{addr.country}</div>}
            </div>
          )}

          {/* Payment info */}
          <div className="db-card">
            <div className="db-card-title">Payment</div>
            <div className="db-info-row">
              <span className="db-info-label">Method</span>
              <span className="db-info-value" style={{ textTransform: 'uppercase' }}>
                {order.paymentMethod || '—'}
              </span>
            </div>
            <div className="db-info-row">
              <span className="db-info-label">Status</span>
              <span className={`db-badge ${order.paymentStatus === 'captured' ? 'db-badge--green' : 'db-badge--gray'}`}>
                {order.paymentStatus || 'pending'}
              </span>
            </div>
            {order.paymentReference && (
              <div className="db-info-row">
                <span className="db-info-label">Reference</span>
                <span className="db-info-value" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {order.paymentReference}
                </span>
              </div>
            )}
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="db-card">
              <div className="db-card-title">Tracking</div>
              <div className="db-info-row">
                <span className="db-info-label">Number</span>
                <span className="db-info-value">{order.trackingNumber}</span>
              </div>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="db-link"
                  style={{ fontSize: '0.875rem', display: 'inline-block', marginTop: 4 }}
                >
                  Track Shipment →
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="db-card">
              <div className="db-card-title">Notes</div>
              <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
