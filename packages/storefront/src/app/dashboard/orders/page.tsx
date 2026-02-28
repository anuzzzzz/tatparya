'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, Filter, Download } from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, StatusBadge, Button, EmptyState, LoadingSpinner, PageHeader } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

function OrdersList() {
  const { trpc, storeId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const input: any = {
        storeId,
        pagination: { page, limit },
      };
      if (statusFilter !== 'all') {
        input.status = statusFilter;
      }
      if (search) {
        input.buyerPhone = search;
      }
      const result = await trpc.order.list.query(input);
      setOrders((result as any).items || []);
      setTotal((result as any).total || 0);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, statusFilter, search, trpc]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 max-w-6xl">
      <PageHeader
        title="Orders"
        description={`${total} total order${total !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-gray-400" />}
          title="No orders found"
          description={statusFilter !== 'all' ? 'Try a different filter' : 'Orders will appear here once customers start buying'}
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Items</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Payment</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 hover:text-orange-500">
                          {order.buyerName || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-500">{order.buyerPhone}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {order.lineItems?.length || 0} item{(order.lineItems?.length || 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">
                      {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatPrice(order.total || 0)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 text-right whitespace-nowrap">
                      {format(new Date(order.createdAt), 'dd MMM, h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {orders.map((order: any) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {order.buyerName || order.buyerPhone || 'Customer'}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPrice(order.total || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Orders">
        <OrdersList />
      </DashboardGuard>
    </DashboardProviders>
  );
}
