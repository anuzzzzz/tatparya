'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Camera, Search, MoreVertical, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, StatusBadge, Button, EmptyState, LoadingSpinner, PageHeader } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice, imageUrl } from '@/lib/utils';

const STATUS_FILTERS = ['all', 'active', 'draft', 'archived'] as const;

function ProductsList() {
  const { trpc, storeId } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const limit = 20;

  const fetchProducts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const input: any = {
        storeId,
        pagination: { page, limit },
      };
      if (statusFilter !== 'all') input.status = statusFilter;
      if (search.trim()) input.search = search.trim();

      const result = await trpc.product.list.query(input);
      setProducts((result as any).items || []);
      setTotal((result as any).total || 0);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, statusFilter, search, trpc]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleDelete(productId: string) {
    if (!storeId || !confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(productId);
    try {
      await trpc.product.delete.mutate({ storeId, productId });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 max-w-6xl">
      <PageHeader
        title="Products"
        description={`${total} product${total !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/catalog">
              <Button variant="secondary" size="sm">
                <Camera className="w-4 h-4" />
                AI Catalog
              </Button>
            </Link>
            <Link href="/dashboard/products/new">
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((status) => (
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

      {/* Products */}
      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8 text-gray-400" />}
          title="No products found"
          description={search || statusFilter !== 'all'
            ? 'Try a different search or filter'
            : 'Add your first product to get started'}
          action={
            <div className="flex gap-2">
              <Link href="/dashboard/catalog">
                <Button variant="secondary">
                  <Camera className="w-4 h-4" /> AI Catalog
                </Button>
              </Link>
              <Link href="/dashboard/products/new">
                <Button>
                  <Plus className="w-4 h-4" /> Add Product
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Product</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product: any) => {
                  const img = product.images?.[0];
                  const thumbSrc = img?.thumbnailUrl || img?.cardUrl || img?.originalUrl;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/products/${product.id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            {thumbSrc ? (
                              <img src={imageUrl(thumbSrc)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-300 m-auto mt-2.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate hover:text-orange-500">{product.name}</p>
                            {product.tags?.length > 0 && (
                              <p className="text-xs text-gray-400 truncate">{product.tags.slice(0, 3).join(', ')}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-5 py-3 text-sm text-right">
                        <span className="font-semibold text-gray-900">{formatPrice(product.price)}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-gray-400 line-through ml-1">{formatPrice(product.compareAtPrice)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {(product.category as any)?.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-gray-400" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {products.map((product: any) => {
              const img = product.images?.[0];
              const thumbSrc = img?.thumbnailUrl || img?.cardUrl || img?.originalUrl;
              return (
                <Link
                  key={product.id}
                  href={`/dashboard/products/${product.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {thumbSrc ? (
                      <img src={imageUrl(thumbSrc)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300 m-auto mt-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={product.status} />
                      <span className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Products">
        <ProductsList />
      </DashboardGuard>
    </DashboardProviders>
  );
}
