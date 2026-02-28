'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, IndianRupee, Package, Camera, TrendingUp, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { StatCard, Card, CardContent, StatusBadge, Button, LoadingSpinner, EmptyState } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function DashboardOverview() {
  const { trpc, storeId } = useAuth();
  const [stats, setStats] = useState<{
    todayRevenue: number;
    todayOrders: number;
    totalProducts: number;
    pendingOrders: number;
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    async function fetchData() {
      try {
        const [revenue, orders, products] = await Promise.all([
          trpc.order.revenue.query({ storeId: storeId!, period: 'today' }),
          trpc.order.list.query({
            storeId: storeId!,
            pagination: { page: 1, limit: 5 },
          }),
          trpc.product.list.query({
            storeId: storeId!,
            pagination: { page: 1, limit: 1 },
          }),
        ]);

        setStats({
          todayRevenue: (revenue as any).totalRevenue || 0,
          todayOrders: (revenue as any).orderCount || 0,
          totalProducts: (products as any).total || 0,
          pendingOrders: (orders as any).items?.filter((o: any) => o.status === 'pending').length || 0,
        });

        setRecentOrders((orders as any).items?.slice(0, 5) || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // Set default stats on error
        setStats({
          todayRevenue: 0,
          todayOrders: 0,
          totalProducts: 0,
          pendingOrders: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [storeId, trpc]);

  if (!storeId) {
    return (
      <EmptyState
        icon={<Package className="w-8 h-8 text-gray-400" />}
        title="No store yet"
        description="Create your first store to get started with Tatparya"
        action={
          <Link href="/dashboard/settings">
            <Button>Create Store</Button>
          </Link>
        }
      />
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={formatPrice(stats?.todayRevenue || 0)}
          icon={<IndianRupee className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          label="Today's Orders"
          value={stats?.todayOrders || 0}
          icon={<ShoppingBag className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          label="Total Products"
          value={stats?.totalProducts || 0}
          icon={<Package className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          label="Pending Orders"
          value={stats?.pendingOrders || 0}
          icon={<Clock className="w-5 h-5 text-orange-500" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/catalog">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                <Camera className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">AI Catalog</h3>
                <p className="text-sm text-gray-500">Upload photos → instant product listings</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/products/new">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">Add Product</h3>
                <p className="text-sm text-gray-500">Manually create a new product listing</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          <Link href="/dashboard/orders" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            View All →
          </Link>
        </div>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.buyerName || order.buyerPhone || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.lineItems?.length || 0} item{(order.lineItems?.length || 0) !== 1 ? 's' : ''} · {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-semibold text-gray-900">
                      {formatPrice(order.total || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Dashboard">
        <DashboardOverview />
      </DashboardGuard>
    </DashboardProviders>
  );
}
