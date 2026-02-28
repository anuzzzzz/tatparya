'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Package, AlertCircle, Trash2, GripVertical } from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, CardContent, CardHeader, Button, LoadingSpinner, Badge } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';
import { formatPrice, imageUrl } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archived', color: 'bg-red-100 text-red-700' },
];

function ProductEdit() {
  const params = useParams();
  const router = useRouter();
  const { trpc, storeId } = useAuth();
  const productId = params.id as string;
  const isNew = productId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [images, setImages] = useState<any[]>([]);

  // Variants
  const [variants, setVariants] = useState<any[]>([]);

  const fetchProduct = useCallback(async () => {
    if (!storeId || isNew) return;
    try {
      setLoading(true);
      const product = await trpc.product.get.query({ storeId, productId });
      const p = product as any;
      setName(p.name || '');
      setDescription(p.description || '');
      setPrice(String(p.price || ''));
      setCompareAtPrice(p.compareAtPrice ? String(p.compareAtPrice) : '');
      setStatus(p.status || 'draft');
      setTags((p.tags || []).join(', '));
      setHsnCode(p.hsnCode || '');
      setGstRate(p.gstRate != null ? String(p.gstRate) : '');
      setImages(p.images || []);
      setVariants(p.variants || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [trpc, storeId, productId, isNew]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  async function handleSave() {
    if (!storeId) return;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const priceNum = parseFloat(price);
      const compareNum = compareAtPrice ? parseFloat(compareAtPrice) : undefined;

      if (!name.trim()) { setError('Name is required'); setSaving(false); return; }
      if (isNaN(priceNum) || priceNum < 0) { setError('Valid price is required'); setSaving(false); return; }

      if (isNew) {
        const result = await trpc.product.create.mutate({
          storeId,
          name: name.trim(),
          price: priceNum,
          compareAtPrice: compareNum,
          description: description || undefined,
          status: status as any,
          tags: tagArr,
          hsnCode: hsnCode || undefined,
          gstRate: gstRate ? parseFloat(gstRate) : undefined,
          images,
        });
        setSuccess('Product created!');
        router.replace(`/dashboard/products/${(result as any).id}`);
      } else {
        await trpc.product.update.mutate({
          storeId,
          productId,
          name: name.trim(),
          price: priceNum,
          compareAtPrice: compareNum === undefined ? null : compareNum,
          description,
          status: status as any,
          tags: tagArr,
          hsnCode: hsnCode || undefined,
          gstRate: gstRate ? parseFloat(gstRate) : undefined,
          images,
        });
        setSuccess('Saved!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/products" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {isNew ? 'New Product' : name || 'Edit Product'}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {success && <span className="text-sm text-green-600 font-medium">{success}</span>}
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-900">Basic Info</h3></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="e.g. Blue Cotton T-Shirt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Describe your product..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="cotton, casual, summer (comma-separated)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-900">Pricing & Tax</h3></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare-at Price (₹)</label>
                  <input
                    type="number"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="Original price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="e.g. 6109"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">Select</option>
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-900">Images</h3></CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No images yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Use <Link href="/dashboard/catalog" className="text-orange-500 hover:underline">AI Catalog</Link> to auto-generate from photos
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {images.map((img: any, i: number) => (
                    <div key={img.id || i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={imageUrl(img.thumbnailUrl || img.cardUrl || img.originalUrl)}
                        alt={img.alt || ''}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants (read-only for now, editing in future) */}
          {variants.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-gray-900">Variants ({variants.length})</h3></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {variants.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(' · ')}
                        </p>
                        {v.sku && <p className="text-xs text-gray-400">SKU: {v.sku}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{v.price ? formatPrice(v.price) : 'Base price'}</p>
                        <p className="text-xs text-gray-500">Stock: {v.stock ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-900">Status</h3></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      status === opt.value ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={(e) => setStatus(e.target.value)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          {!isNew && storeId && (
            <Card className="p-4">
              <a
                href={`#`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600"
              >
                <Eye className="w-4 h-4" />
                Preview on storefront
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductEditPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Product">
        <ProductEdit />
      </DashboardGuard>
    </DashboardProviders>
  );
}
