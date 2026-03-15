'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, List, Plus, X } from 'lucide-react';
import { useSellerAuth } from '@/lib/chat/auth-provider';

type ViewMode = 'grid' | 'list';
type ToastVariant = 'success' | 'error';

const STATUS_BADGE: Record<string, string> = {
  active:   'db-badge--green',
  draft:    'db-badge--gray',
  archived: 'db-badge--yellow',
};

function fmtCurrency(n: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN')}`;
}

function ProductEditModal({
  product,
  onClose,
  onSave,
}: {
  product: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [name, setName]       = useState(product.name ?? '');
  const [price, setPrice]     = useState(String(product.price ?? ''));
  const [compare, setCompare] = useState(String(product.compareAtPrice ?? ''));
  const [status, setStatus]   = useState(product.status ?? 'draft');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        price: parseFloat(price) || 0,
        compareAtPrice: compare ? parseFloat(compare) : null,
        status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="db-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="db-modal">
        <h2 className="db-modal-title">Edit Product</h2>

        <div className="db-field">
          <label className="db-label">Name</label>
          <input className="db-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="db-field">
          <label className="db-label">Price (₹)</label>
          <input className="db-input" type="number" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="db-field">
          <label className="db-label">Compare-at Price (₹, optional)</label>
          <input className="db-input" type="number" value={compare} onChange={e => setCompare(e.target.value)} />
        </div>
        <div className="db-field">
          <label className="db-label">Status</label>
          <select className="db-select" style={{ width: '100%' }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="db-modal-actions">
          <button className="db-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="db-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { storeId, trpc, user } = useSellerAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<ViewMode>('grid');
  const [editing, setEditing]   = useState<any | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast]       = useState<{ msg: string; variant: ToastVariant } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (msg: string, variant: ToastVariant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    trpc.product.list.query({
      storeId,
      pagination: { page: 1, limit: 100 },
    })
      .then((res: any) => {
        setProducts(res.items ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, trpc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const saveProduct = async (productId: string, data: any) => {
    if (!storeId) return;
    // Use devUpdate in development (no auth), update in production
    const mutation = user
      ? trpc.product.update.mutate({ storeId, productId, ...data })
      : trpc.product.devUpdate.mutate({ storeId, productId, ...data });
    await mutation;
    showToast('Product saved');
    fetchProducts();
  };

  const deleteProduct = async (productId: string) => {
    if (!storeId) return;
    try {
      await trpc.product.delete.mutate({ storeId, productId });
      showToast('Product deleted');
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err?.message ?? 'Delete failed', 'error');
    }
  };

  const bulkUpdate = async (updateData: any) => {
    if (!storeId || selected.size === 0) return;
    try {
      await Promise.all(
        [...selected].map(productId => {
          const mutation = user
            ? trpc.product.update.mutate({ storeId, productId, ...updateData })
            : trpc.product.devUpdate.mutate({ storeId, productId, ...updateData });
          return mutation;
        })
      );
      showToast(`Updated ${selected.size} products`);
      setSelected(new Set());
      fetchProducts();
    } catch (err: any) {
      showToast(err?.message ?? 'Bulk update failed', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getThumb = (product: any): string | null => {
    const images = product.images as any[];
    if (!images || images.length === 0) return null;
    const img = images[0];
    return img?.thumbnailUrl || img?.cardUrl || img?.originalUrl || null;
  };

  if (!storeId) return <div className="db-page-empty">No store selected.</div>;

  return (
    <div className="db-page">
      {toast && (
        <div className={`db-toast db-toast--${toast.variant}`}>{toast.msg}</div>
      )}

      <div className="db-page-header">
        <h1 className="db-page-title">Products <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '1rem' }}>({total})</span></h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="db-view-toggle">
            <button
              className={`db-view-btn ${view === 'grid' ? 'db-view-btn--active' : ''}`}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              className={`db-view-btn ${view === 'list' ? 'db-view-btn--active' : ''}`}
              onClick={() => setView('list')}
            >
              <List size={14} />
            </button>
          </div>
          <a href="/dashboard" className="db-btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={15} /> Add Product
          </a>
        </div>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="db-bulk-toolbar">
          <span>{selected.size} selected</span>
          <button className="db-btn-secondary" onClick={() => bulkUpdate({ status: 'active' })}>
            Publish
          </button>
          <button className="db-btn-secondary" onClick={() => bulkUpdate({ status: 'archived' })}>
            Archive
          </button>
          <button className="db-btn-danger" onClick={() => {
            if (confirm(`Delete ${selected.size} products?`)) {
              Promise.all([...selected].map(id => deleteProduct(id)));
            }
          }}>
            Delete
          </button>
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            onClick={() => setSelected(new Set())}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="db-loading-inline">Loading products…</div>
      ) : view === 'grid' ? (
        /* Grid view */
        <div className="db-product-grid">
          {products.map(product => {
            const thumb = getThumb(product);
            const isSelected = selected.has(product.id);
            return (
              <div
                key={product.id}
                className={`db-product-card ${isSelected ? 'db-product-card--selected' : ''}`}
                onClick={() => setEditing(product)}
              >
                {thumb
                  ? <img src={thumb} alt={product.name} className="db-product-img" />
                  : <div className="db-product-img-placeholder">📦</div>
                }
                <div className="db-product-info">
                  <div className="db-product-name">{product.name}</div>
                  <div className="db-product-price">{fmtCurrency(product.price)}</div>
                  <div className="db-product-card-footer">
                    <span className={`db-badge ${STATUS_BADGE[product.status] ?? 'db-badge--gray'}`}>
                      {product.status}
                    </span>
                    <input
                      type="checkbox"
                      className="db-checkbox"
                      checked={isSelected}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleSelect(product.id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th><input type="checkbox" className="db-checkbox"
                  checked={selected.size === products.length && products.length > 0}
                  onChange={() => setSelected(
                    selected.size === products.length
                      ? new Set()
                      : new Set(products.map(p => p.id))
                  )}
                /></th>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Compare</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7} className="db-table-empty">No products</td></tr>
              ) : products.map(product => {
                const thumb = getThumb(product);
                return (
                  <tr key={product.id} className="db-table-row">
                    <td>
                      <input
                        type="checkbox"
                        className="db-checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                        : <div style={{ width: 40, height: 40, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                      }
                    </td>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td>{fmtCurrency(product.price)}</td>
                    <td>{product.compareAtPrice ? fmtCurrency(product.compareAtPrice) : '—'}</td>
                    <td>
                      <span className={`db-badge ${STATUS_BADGE[product.status] ?? 'db-badge--gray'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="db-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setEditing(product)}>
                          Edit
                        </button>
                        <button className="db-btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setDeleteConfirm(product.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <ProductEditModal
          product={editing}
          onClose={() => setEditing(null)}
          onSave={data => saveProduct(editing.id, data)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="db-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <h2 className="db-modal-title">Delete Product?</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 0 }}>
              This action cannot be undone.
            </p>
            <div className="db-modal-actions">
              <button className="db-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="db-btn-danger" onClick={() => deleteProduct(deleteConfirm!)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
