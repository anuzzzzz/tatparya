'use client';

import React, { useState, useEffect } from 'react';
import { useSellerAuth } from '@/lib/chat/auth-provider';

type ToastVariant = 'success' | 'error';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="db-card">
      <div className="db-card-title">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { storeId, trpc } = useSellerAuth();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null);

  // Form state — store info
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');

  // Business details
  const [gstin, setGstin]             = useState('');
  const [businessName, setBusinessName] = useState('');

  // WhatsApp
  const [whatsappEnabled, setWhatsappEnabled]     = useState(false);
  const [whatsappPhone, setWhatsappPhone]         = useState('');
  const [codEnabled, setCodEnabled]               = useState(true);

  // Announcement bar
  const [announceEnabled, setAnnounceEnabled]     = useState(false);
  const [announceText, setAnnounceText]           = useState('');

  // Social links
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook]   = useState('');
  const [twitter, setTwitter]     = useState('');

  const showToast = (msg: string, variant: ToastVariant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!storeId) return;
    trpc.store.get.query({ storeId })
      .then((s: any) => {
        setStore(s);
        setName(s.name ?? '');
        setDescription(s.description ?? '');
        setGstin(s.gstin ?? '');
        setBusinessName(s.businessName ?? '');

        const waCfg = s.whatsappConfig as any;
        setWhatsappEnabled(waCfg?.enabled ?? false);
        setWhatsappPhone(waCfg?.businessPhone ?? '');

        const cfg = s.storeConfig as any;
        setCodEnabled(cfg?.payment?.codEnabled !== false);
        const announce = cfg?.announcement;
        setAnnounceEnabled(announce?.enabled ?? false);
        setAnnounceText((announce?.messages ?? []).join('\n'));

        const social = cfg?.social_links ?? {};
        setInstagram(social.instagram ?? '');
        setFacebook(social.facebook ?? '');
        setTwitter(social.twitter ?? '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveStoreInfo = async () => {
    if (!storeId) return;
    try {
      await (trpc.store.update as any).mutate({ storeId, name, description });
      showToast('Store info saved');
    } catch (err: any) {
      showToast(err?.message ?? 'Save failed', 'error');
    }
  };

  const saveBusiness = async () => {
    if (!storeId) return;
    try {
      await (trpc.store.update as any).mutate({ storeId, gstin, businessName });
      showToast('Business details saved');
    } catch (err: any) {
      showToast(err?.message ?? 'Save failed', 'error');
    }
  };

  const saveWhatsApp = async () => {
    if (!storeId || !store) return;
    try {
      const existing = (store.whatsappConfig ?? {}) as any;
      await (trpc.store.update as any).mutate({
        storeId,
        whatsappConfig: {
          ...existing,
          enabled: whatsappEnabled,
          businessPhone: whatsappPhone,
        },
      });
      showToast('WhatsApp settings saved');
    } catch (err: any) {
      showToast(err?.message ?? 'Save failed', 'error');
    }
  };

  const saveAnnouncement = async () => {
    if (!storeId || !store) return;
    try {
      const existing = (store.storeConfig ?? {}) as any;
      await (trpc.store.update as any).mutate({
        storeId,
        storeConfig: {
          ...existing,
          announcement: {
            enabled: announceEnabled,
            messages: announceText.split('\n').map(s => s.trim()).filter(Boolean),
          },
          payment: {
            ...(existing.payment ?? {}),
            codEnabled,
          },
        },
      });
      showToast('Settings saved');
    } catch (err: any) {
      showToast(err?.message ?? 'Save failed', 'error');
    }
  };

  const saveSocial = async () => {
    if (!storeId || !store) return;
    try {
      const existing = (store.storeConfig ?? {}) as any;
      await (trpc.store.update as any).mutate({
        storeId,
        storeConfig: {
          ...existing,
          social_links: { instagram, facebook, twitter },
        },
      });
      showToast('Social links saved');
    } catch (err: any) {
      showToast(err?.message ?? 'Save failed', 'error');
    }
  };

  if (!storeId) return <div className="db-page-empty">No store selected.</div>;

  if (loading) return <div className="db-loading-inline">Loading settings…</div>;

  return (
    <div className="db-settings-page">
      {toast && (
        <div className={`db-toast db-toast--${toast.variant}`}>{toast.msg}</div>
      )}

      <div className="db-page-header">
        <h1 className="db-page-title">Settings</h1>
      </div>

      {/* 1. Store Info */}
      <Section title="Store Info">
        <div className="db-field">
          <label className="db-label">Store Name</label>
          <input className="db-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="db-field">
          <label className="db-label">Description</label>
          <textarea
            className="db-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="db-field" style={{ marginBottom: 0 }}>
          <label className="db-label">Vertical (read-only)</label>
          <input className="db-input" value={store?.vertical ?? ''} readOnly style={{ background: '#f9fafb', color: '#9ca3af' }} />
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="db-btn-primary" onClick={saveStoreInfo}>Save Store Info</button>
        </div>
      </Section>

      {/* 2. Business Details */}
      <Section title="Business Details">
        <div className="db-field">
          <label className="db-label">Business Name</label>
          <input className="db-input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Legal business name" />
        </div>
        <div className="db-field">
          <label className="db-label">GSTIN</label>
          <input className="db-input" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 27AABCU9603R1ZM" maxLength={15} />
        </div>
        <div style={{ marginTop: 4 }}>
          <button className="db-btn-primary" onClick={saveBusiness}>Save Business Details</button>
        </div>
      </Section>

      {/* 3. Payment Config */}
      <Section title="Payment Config">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="cod-toggle"
            className="db-checkbox"
            checked={codEnabled}
            onChange={e => setCodEnabled(e.target.checked)}
          />
          <label htmlFor="cod-toggle" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            Enable Cash on Delivery (COD)
          </label>
        </div>
        <div
          style={{
            padding: '10px 14px',
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#6b7280',
            marginBottom: 16,
          }}
        >
          Razorpay online payments are configured via environment variables (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET).
          Contact your developer to update payment gateway credentials.
        </div>
        <button className="db-btn-primary" onClick={saveAnnouncement}>Save Payment Settings</button>
      </Section>

      {/* 4. WhatsApp */}
      <Section title="WhatsApp">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="wa-toggle"
            className="db-checkbox"
            checked={whatsappEnabled}
            onChange={e => setWhatsappEnabled(e.target.checked)}
          />
          <label htmlFor="wa-toggle" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            Enable WhatsApp Button
          </label>
        </div>
        <div className="db-field">
          <label className="db-label">Business Phone (with country code)</label>
          <input
            className="db-input"
            value={whatsappPhone}
            onChange={e => setWhatsappPhone(e.target.value)}
            placeholder="+919999999999"
          />
        </div>
        <button className="db-btn-primary" onClick={saveWhatsApp}>Save WhatsApp</button>
      </Section>

      {/* 5. Social Links */}
      <Section title="Social Links">
        <div className="db-field">
          <label className="db-label">Instagram URL</label>
          <input className="db-input" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="https://instagram.com/yourstore" />
        </div>
        <div className="db-field">
          <label className="db-label">Facebook URL</label>
          <input className="db-input" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/yourstore" />
        </div>
        <div className="db-field">
          <label className="db-label">Twitter / X URL</label>
          <input className="db-input" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://twitter.com/yourstore" />
        </div>
        <button className="db-btn-primary" onClick={saveSocial}>Save Social Links</button>
      </Section>

      {/* 6. Announcement Bar */}
      <Section title="Announcement Bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="announce-toggle"
            className="db-checkbox"
            checked={announceEnabled}
            onChange={e => setAnnounceEnabled(e.target.checked)}
          />
          <label htmlFor="announce-toggle" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
            Show announcement bar on storefront
          </label>
        </div>
        <div className="db-field">
          <label className="db-label">Messages (one per line, will rotate)</label>
          <textarea
            className="db-textarea"
            value={announceText}
            onChange={e => setAnnounceText(e.target.value)}
            placeholder={'Free shipping on orders above ₹499\nNew collection just dropped!'}
            rows={4}
          />
        </div>
        <button className="db-btn-primary" onClick={saveAnnouncement}>Save Announcement</button>
      </Section>
    </div>
  );
}
