'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Package, MapPin, Phone, User, CreditCard,
  Truck, CheckCircle2, Clock, XCircle, ChevronRight, AlertCircle,
} from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, CardContent, CardHeader, StatusBadge, Button, LoadingSpinner, Badge } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice } from '@/lib/utils';

// Allowed transitions (matches ORDER_TRANSITIONS from shared)
const TRANSITIONS: Record<string, string[]> = {
  created: ['cod_confirmed', 'cancelled'],
  payment_pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  cod_confirmed: ['processing', 'cancelled'],
  cod_otp_verified: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'rto'],
  out_for_delivery: ['delivered', 'rto'],
  delivered: [],
  cancelled: [],
  refunded: [],
  rto: [],
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  created: <Clock className="w-4 h-4" />,
  cod_confirmed: <CheckCircle2 className="w-4 h-4" />,
  paid: <CreditCard className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  out_for_delivery: <Truck className="w-4 h-4" />,
  delivered: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
  refunded: <XCircle className="w-4 h-4" />,
  rto: <XCircle className="w-4 h-4" />,
};

function OrderDetail() {
  const params = useParams();
  const router = useRouter();
  const { trpc, storeId } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const data = await trpc.order.get.query({ storeId, orderId });
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [trpc, storeId, orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function handleStatusUpdate(newStatus: string) {
    if (!storeId || !order) return;

    // If moving to shipped, prompt for tracking number
    if (newStatus === 'shipped' && !showTrackingInput) {
      setShowTrackingInput(true);
      return;
    }

    setUpdating(true);
    try {
      await trpc.order.updateStatus.mutate({
        storeId,
        orderId: order.id,
        status: newStatus as any,
        ...(trackingNumber ? { trackingNumber } : {}),
      });
      setShowTrackingInput(false);
      setTrackingNumber('');
      await fetchOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error && !order) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }
  if (!order) return null;

  const nextStatuses = TRANSITIONS[order.status] || [];
  const address = order.shippingAddress || {};
  const lineItems = order.lineItems || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              Order #{order.orderNumber}
            </h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Status Actions */}
      {nextStatuses.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Update Status</p>
          {showTrackingInput && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Tracking number (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                variant={s === 'cancelled' || s === 'refunded' || s === 'rto' ? 'danger' : 'primary'}
                size="sm"
                loading={updating}
                onClick={() => handleStatusUpdate(s)}
              >
                {STATUS_ICONS[s]}
                {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">
                Items ({lineItems.length})
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {lineItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.attributes && Object.keys(item.attributes).length > 0 && (
                        <p className="text-xs text-gray-500">
                          {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 px-5 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Discount {order.discountCode && <span className="text-xs">({order.discountCode})</span>}
                    </span>
                    <span className="text-green-600">-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                {order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span>{formatPrice(order.shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span>{formatPrice(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Customer + Payment + Shipping */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>{order.buyerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${order.buyerPhone}`} className="text-orange-500 hover:underline">
                  {order.buyerPhone}
                </a>
              </div>
              {order.buyerEmail && (
                <p className="text-sm text-gray-500 pl-6">{order.buyerEmail}</p>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">Shipping Address</h3>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  {address.line1 && <p>{address.line1}</p>}
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <Badge variant="default">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod?.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tracking</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Order Details">
        <OrderDetail />
      </DashboardGuard>
    </DashboardProviders>
  );
}
