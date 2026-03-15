'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSellerAuth } from '@/lib/chat/auth-provider';

const STATUS_BADGE: Record<string, string> = {
  created:         'db-badge--gray',
  payment_pending: 'db-badge--yellow',
  paid:            'db-badge--green',
  processing:      'db-badge--blue',
  shipped:         'db-badge--blue',
  delivered:       'db-badge--green',
  cancelled:       'db-badge--red',
};

function fmtCurrency(n: number) {
  return `₹${Math.round(n ?? 0).toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

/** Build last-7-days buckets from an array of orders */
function buildDailyRevenue(orders: any[]): { day: string; revenue: number }[] {
  const now = new Date();
  const days: { day: string; date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ day: dayLabel(d), date: d.toISOString().slice(0, 10), revenue: 0 });
  }
  for (const order of orders) {
    if (['cancelled', 'refunded'].includes(order.status)) continue;
    const dateKey = (order.createdAt as string).slice(0, 10);
    const bucket = days.find(d => d.date === dateKey);
    if (bucket) bucket.revenue += order.total ?? 0;
  }
  return days.map(({ day, revenue }) => ({ day, revenue }));
}

/** Count product occurrences across order line items */
function topProducts(orders: any[], n = 5): { name: string; count: number }[] {
  const counts: Record<string, { name: string; count: number }> = {};
  for (const order of orders) {
    for (const item of order.lineItems ?? []) {
      const id = item.productId as string;
      if (!counts[id]) counts[id] = { name: item.productName ?? id, count: 0 };
      counts[id]!.count += item.quantity ?? 1;
    }
  }
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, n);
}

export default function AnalyticsPage() {
  const { storeId, trpc } = useSellerAuth();
  const [loading, setLoading] = useState(true);

  const [revMonth, setRevMonth]     = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [activeCount, setActiveCount]   = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; revenue: number }[]>([]);
  const [topProds, setTopProds]     = useState<{ name: string; count: number }[]>([]);

  const fetchAll = useCallback(() => {
    if (!storeId) return;
    setLoading(true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    Promise.all([
      trpc.order.revenue.query({ storeId, period: 'month' }),
      trpc.product.list.query({ storeId, pagination: { page: 1, limit: 1 } }),
      trpc.product.list.query({ storeId, status: 'active' as any, pagination: { page: 1, limit: 1 } }),
      trpc.order.list.query({ storeId, pagination: { page: 1, limit: 50 } }),
    ])
      .then(([month, allProds, activeProds, orders]) => {
        setRevMonth(month);
        setProductCount((allProds as any).total ?? 0);
        setActiveCount((activeProds as any).total ?? 0);

        const orderItems = (orders as any).items ?? [];
        setRecentOrders(orderItems.slice(0, 10));
        setDailyRevenue(buildDailyRevenue(orderItems));
        setTopProds(topProducts(orderItems));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, trpc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!storeId) return <div className="db-page-empty">No store selected.</div>;
  if (loading) return <div className="db-loading-inline">Loading analytics…</div>;

  const totalRevenue    = (revMonth as any)?.totalRevenue ?? 0;
  const totalOrders     = (revMonth as any)?.orderCount ?? 0;
  const avgOrderValue   = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="db-page">
      <div className="db-page-header">
        <h1 className="db-page-title">Analytics</h1>
        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>This month</span>
      </div>

      {/* Top stat cards */}
      <div className="db-stat-grid">
        <div className="db-stat-card">
          <div className="db-stat-label">Monthly Revenue</div>
          <div className="db-stat-amount">{fmtCurrency(totalRevenue)}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Orders</div>
          <div className="db-stat-amount">{totalOrders}</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Active Products</div>
          <div className="db-stat-amount">{activeCount}</div>
          <div className="db-stat-sub">{productCount} total</div>
        </div>
        <div className="db-stat-card">
          <div className="db-stat-label">Avg. Order Value</div>
          <div className="db-stat-amount">{fmtCurrency(avgOrderValue)}</div>
        </div>
      </div>

      {/* Bar chart — last 7 days */}
      <div className="db-card">
        <div className="db-card-title">Revenue — Last 7 Days</div>
        <div className="db-bar-chart-wrap">
          {dailyRevenue.map(({ day, revenue }) => {
            const heightPct = revenue > 0 ? (revenue / maxDailyRevenue) * 100 : 0;
            return (
              <div key={day} className="db-bar-col">
                <div className="db-bar-val">{revenue > 0 ? fmtCurrency(revenue) : ''}</div>
                <div
                  className="db-bar"
                  style={{ height: `${Math.max(heightPct, revenue > 0 ? 4 : 0)}%` }}
                  title={`${day}: ${fmtCurrency(revenue)}`}
                />
                <div className="db-bar-day">{day}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="db-two-col">
        {/* Recent orders */}
        <div className="db-card">
          <div className="db-card-title">Recent Orders</div>
          {recentOrders.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No orders yet</p>
          ) : (
            <table className="db-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="db-table-row">
                    <td>
                      <Link href={`/dashboard/orders/${order.id}`} className="db-link">
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td>{fmtDate(order.createdAt)}</td>
                    <td>{fmtCurrency(order.total)}</td>
                    <td>
                      <span className={`db-badge ${STATUS_BADGE[order.status] ?? 'db-badge--gray'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top products */}
        <div className="db-card">
          <div className="db-card-title">Top Products</div>
          {topProds.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No order data yet</p>
          ) : (
            <table className="db-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                </tr>
              </thead>
              <tbody>
                {topProds.map((p, i) => (
                  <tr key={i} className="db-table-row">
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
