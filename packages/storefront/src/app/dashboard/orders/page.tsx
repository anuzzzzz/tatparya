'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSellerAuth } from '@/lib/chat/auth-provider';

const STATUS_BADGE: Record<string, string> = {
  created:          'db-badge--gray',
  payment_pending:  'db-badge--yellow',
  paid:             'db-badge--green',
  processing:       'db-badge--blue',
  shipped:          'db-badge--blue',
  delivered:        'db-badge--green',
  cancelled:        'db-badge--red',
  refunded:         'db-badge--red',
};

const ALL_STATUSES = [
  'created', 'payment_pending', 'paid',
  'processing', 'shipped', 'delivered', 'cancelled',
];

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function OrdersPage() {
  const { storeId, trpc } = useSellerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<{ today?: any; week?: any; month?: any }>({});

  const fetchData = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      trpc.order.list.query({
        storeId,
        status: (status || undefined) as any,
        pagination: { page, limit: 20 },
      }),
      trpc.order.revenue.query({ storeId, period: 'today' }),
      trpc.order.revenue.query({ storeId, period: 'week' }),
      trpc.order.revenue.query({ storeId, period: 'month' }),
    ])
      .then(([res, today, week, month]) => {
        const r = res as any;
        setOrders(r.items ?? []);
        setTotal(r.total ?? 0);
        setRevenue({ today, week, month });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, trpc, page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!storeId) return <div className="db-page-empty">No store selected.</div>;

  const STATS = [
    { label: "Today's Revenue", data: revenue.today },
    { label: 'This Week',       data: revenue.week  },
    { label: 'This Month',      data: revenue.month },
  ];

  return (
    <div className="db-page">
      <div className="db-page-header">
        <h1 className="db-page-title">Orders</h1>
      </div>

      {/* Revenue stat cards */}
      <div className="db-stat-grid">
        {STATS.map(({ label, data }) => (
          <div key={label} className="db-stat-card">
            <div className="db-stat-label">{label}</div>
            <div className="db-stat-amount">
              {data ? fmtCurrency((data as any).totalRevenue ?? 0) : '—'}
            </div>
            <div className="db-stat-sub">
              {data ? `${(data as any).orderCount ?? 0} orders` : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="db-filters">
        <select
          className="db-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="db-loading-inline">Loading orders…</div>
      ) : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="db-table-empty">No orders found</td>
                </tr>
              ) : orders.map((order: any) => (
                <tr key={order.id} className="db-table-row">
                  <td>
                    <Link href={`/dashboard/orders/${order.id}`} className="db-link">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td>{fmtDate(order.createdAt)}</td>
                  <td>
                    <div>{order.buyerName || '—'}</div>
                    <div className="db-cell-sub">{order.buyerPhone || ''}</div>
                  </td>
                  <td>{(order.lineItems ?? []).length}</td>
                  <td>{fmtCurrency(order.total ?? 0)}</td>
                  <td>
                    <span className={`db-badge ${order.paymentMethod === 'cod' ? 'db-badge--amber' : 'db-badge--blue'}`}>
                      {order.paymentMethod ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`db-badge ${STATUS_BADGE[order.status] ?? 'db-badge--gray'}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="db-pagination">
          <button
            className="db-btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="db-page-info">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            className="db-btn-secondary"
            onClick={() => setPage(p => p + 1)}
            disabled={page * 20 >= total}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
