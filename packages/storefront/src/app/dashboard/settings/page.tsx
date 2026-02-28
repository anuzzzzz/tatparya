'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings, Store, Save, ExternalLink, Palette, MessageCircle, FileText, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { DashboardProviders } from '@/components/dashboard/providers';
import { DashboardGuard } from '@/components/dashboard/guard';
import { Card, CardContent, CardHeader, Button, LoadingSpinner, PageHeader } from '@/components/dashboard/ui';
import { useAuth } from '@/lib/supabase/auth-provider';

type Tab = 'general' | 'whatsapp' | 'design';

function StoreSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const { trpc, storeId, setStoreId } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // General fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [vertical, setVertical] = useState('general');
  const [storeStatus, setStoreStatus] = useState('');

  // WhatsApp
  const [waEnabled, setWaEnabled] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waAutoNotify, setWaAutoNotify] = useState(true);

  // Design
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [layout, setLayout] = useState('minimal');

  // Create mode (onboarding)
  const isCreateMode = isOnboarding && !storeId;

  const fetchStore = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    try {
      const store = await trpc.store.get.query({ storeId });
      const s = store as any;
      setName(s.name || '');
      setSlug(s.slug || '');
      setDescription(s.description || '');
      setGstin(s.gstin || '');
      setBusinessName(s.businessName || '');
      setVertical(s.vertical || 'general');
      setStoreStatus(s.status || '');

      // WhatsApp
      const wa = s.whatsappConfig || {};
      setWaEnabled(wa.enabled || false);
      setWaPhone(wa.businessPhone || '');
      setWaAutoNotify(wa.autoOrderNotifications !== false);

      // Design
      const design = s.storeConfig?.design || {};
      setPrimaryColor(design.palette?.primary || '#f97316');
      setLayout(design.layout || 'minimal');
    } catch (err: any) {
      setError(err.message || 'Failed to load store');
    } finally {
      setLoading(false);
    }
  }, [trpc, storeId]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!name.trim()) { setError('Store name is required'); setSaving(false); return; }
      if (!gstin.trim()) { setError('GSTIN is required'); setSaving(false); return; }

      if (isCreateMode) {
        // Create new store
        if (!slug.trim()) { setError('Store URL is required'); setSaving(false); return; }

        const result = await trpc.store.create.mutate({
          name: name.trim(),
          slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          vertical: vertical as any,
          description: description || undefined,
          gstin: gstin.trim(),
          businessName: businessName || undefined,
        });
        const newId = (result as any).id;
        setStoreId(newId);
        setSuccess('Store created!');
        router.replace('/dashboard');
      } else if (storeId) {
        // Update existing store
        await trpc.store.update.mutate({
          storeId,
          name: name.trim(),
          description: description || undefined,
          gstin: gstin.trim(),
          businessName: businessName || undefined,
          whatsappConfig: {
            enabled: waEnabled,
            businessPhone: waPhone || undefined,
            autoOrderNotifications: waAutoNotify,
          },
          storeConfig: {
            design: {
              layout: layout as any,
              palette: {
                primary: primaryColor,
                // Keep other palette values as defaults
                secondary: '#6366f1',
                accent: '#f59e0b',
                background: '#ffffff',
                surface: '#f9fafb',
                text: '#111827',
                textMuted: '#6b7280',
              },
              fonts: { display: 'Inter', body: 'Inter' },
            },
          },
        });
        setSuccess('Settings saved!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Store className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'design', label: 'Design', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={isCreateMode ? 'Create Your Store' : 'Store Settings'}
        description={isCreateMode ? 'Set up your online store in minutes' : 'Manage your store configuration'}
        action={
          !isCreateMode && slug && (
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600"
            >
              <ExternalLink className="w-4 h-4" />
              View Store
            </a>
          )
        }
      />

      {/* Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Tabs (hide on create mode) */}
      {!isCreateMode && (
        <div className="flex gap-1 border-b border-gray-200 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* General Tab (always shown in create mode) */}
      {(activeTab === 'general' || isCreateMode) && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-900">Store Details</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="My Awesome Store"
              />
            </div>

            {isCreateMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store URL *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-500">
                    tatparya.in/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="my-store"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                placeholder="Tell customers what you sell..."
              />
            </div>

            {isCreateMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Vertical</label>
                <select
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="fashion">Fashion & Apparel</option>
                  <option value="fmcg">FMCG</option>
                  <option value="electronics">Electronics</option>
                  <option value="jewellery">Jewellery</option>
                  <option value="beauty">Beauty & Personal Care</option>
                  <option value="food">Food & Beverages</option>
                  <option value="home_decor">Home & Decor</option>
                  <option value="general">General / Other</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Legal business name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && !isCreateMode && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-900">WhatsApp Commerce</h3></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={waEnabled}
                onChange={(e) => setWaEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-orange-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Enable WhatsApp</p>
                <p className="text-xs text-gray-500">Show WhatsApp button on storefront</p>
              </div>
            </label>

            {waEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">+91</span>
                    <input
                      type="tel"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      placeholder="98765 43210"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waAutoNotify}
                    onChange={(e) => setWaAutoNotify(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Auto order notifications</p>
                    <p className="text-xs text-gray-500">Send WhatsApp updates when order status changes</p>
                  </div>
                </label>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Design Tab */}
      {activeTab === 'design' && !isCreateMode && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-900">Storefront Design</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: primaryColor }} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Layout Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['minimal', 'magazine', 'catalog_grid', 'boutique', 'editorial', 'marketplace'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                      layout === l
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {l.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
        <Save className="w-4 h-4" />
        {isCreateMode ? 'Create Store' : 'Save Settings'}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardProviders>
      <DashboardGuard title="Settings">
        <StoreSettings />
      </DashboardGuard>
    </DashboardProviders>
  );
}
