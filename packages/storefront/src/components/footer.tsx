'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { MessageCircle, Instagram, Mail, Facebook, Twitter, Youtube } from 'lucide-react';
import { TextureOverlay } from './texture-overlay';

interface FooterProps {
  /** V3: Visual variant — auto-inferred from vertical if not set */
  variant?: 'default' | 'minimal' | 'dark';
}

export function Footer({ variant: explicitVariant }: FooterProps) {
  const { store, design, config } = useStore();
  const storeUrl = `/${store.slug}`;
  const whatsappPhone = (store.whatsappConfig as any)?.businessPhone || (config as any)?.socialLinks?.whatsapp;
  const textureHint = (design.decorativeTokens as any)?.textureOverlay || 'none';
  const storeBio = (config as any)?.storeBio || store.description;

  // V3: Auto-infer variant from vertical/mood
  const vertical = store.vertical as string;
  const variant = explicitVariant || inferFooterVariant(vertical, design);

  if (variant === 'dark') return (
    <DarkFooter storeUrl={storeUrl} whatsappPhone={whatsappPhone} storeBio={storeBio} textureHint={textureHint} />
  );

  if (variant === 'minimal') return (
    <MinimalFooter storeUrl={storeUrl} whatsappPhone={whatsappPhone} storeBio={storeBio} />
  );

  // Default variant
  return (
    <footer
      className="mt-auto border-t relative overflow-hidden"
      style={{
        backgroundColor: design.palette.surface,
        borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
        color: design.palette.textMuted,
      }}
    >
      <TextureOverlay hint={textureHint} opacity={0.02} />

      <div className="container-store py-12 md:py-16 relative z-[2]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-display text-xl md:text-2xl font-bold mb-3"
              style={{ color: design.palette.text }}>
              {store.name}
            </h3>
            {storeBio && (
              <p className="text-xs leading-relaxed mb-5 max-w-[280px]">{storeBio}</p>
            )}
            <SocialLinks whatsappPhone={whatsappPhone} />
          </div>

          <FooterLinks title="Shop" links={[
            { label: 'All Products', href: `${storeUrl}/collections/all` },
            { label: 'New Arrivals', href: `${storeUrl}/collections/all` },
            { label: 'About Us', href: `${storeUrl}/about` },
          ]} />

          <FooterLinks title="Help" links={[
            { label: 'Shipping', href: `${storeUrl}/pages/shipping` },
            { label: 'Returns', href: `${storeUrl}/pages/returns` },
            { label: 'Contact Us', href: `${storeUrl}/pages/contact` },
            { label: 'FAQs', href: `${storeUrl}/pages/faq` },
            ...(whatsappPhone ? [{ label: 'WhatsApp Support', href: `https://wa.me/${whatsappPhone}`, external: true }] : []),
          ]} />

          <FooterLinks title="Legal" links={[
            { label: 'Privacy Policy', href: `${storeUrl}/pages/privacy` },
            { label: 'Terms of Service', href: `${storeUrl}/pages/terms` },
            { label: 'Refund Policy', href: `${storeUrl}/pages/returns` },
          ]} />
        </div>

        <BottomBar storeName={store.name} />
      </div>
    </footer>
  );
}

// ============================================================
// V3: Dark Footer — jewellery, fashion-luxury
// ============================================================
function DarkFooter({ storeUrl, whatsappPhone, storeBio, textureHint }: { storeUrl: string; whatsappPhone?: string; storeBio?: string; textureHint: string }) {
  const { store, design } = useStore();
  return (
    <footer className="mt-auto relative overflow-hidden"
      style={{ backgroundColor: design.palette.text, color: 'rgba(255,255,255,0.6)' }}>
      <TextureOverlay hint={textureHint} opacity={0.03} />
      <div className="container-store py-14 md:py-20 relative z-[2]">
        {/* Big brand name */}
        <div className="text-center mb-12">
          <h3 className="font-display text-2xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: '#fff' }}>
            {store.name}
          </h3>
          {storeBio && (
            <p className="text-xs md:text-sm max-w-md mx-auto leading-relaxed opacity-60">{storeBio}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <SocialLinks whatsappPhone={whatsappPhone} dark />
          </div>
          <FooterLinks title="Shop" dark links={[
            { label: 'All Products', href: `${storeUrl}/collections/all` },
            { label: 'New Arrivals', href: `${storeUrl}/collections/all` },
            { label: 'About Us', href: `${storeUrl}/about` },
          ]} />
          <FooterLinks title="Help" dark links={[
            { label: 'Shipping', href: `${storeUrl}/pages/shipping` },
            { label: 'Returns', href: `${storeUrl}/pages/returns` },
            { label: 'Contact', href: `${storeUrl}/pages/contact` },
          ]} />
          <FooterLinks title="Legal" dark links={[
            { label: 'Privacy', href: `${storeUrl}/pages/privacy` },
            { label: 'Terms', href: `${storeUrl}/pages/terms` },
            { label: 'Refunds', href: `${storeUrl}/pages/returns` },
          ]} />
        </div>

        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] opacity-40">© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <span className="text-[10px] opacity-30">Powered by Tatparya</span>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// V3: Minimal Footer — beauty, modern-minimal
// ============================================================
function MinimalFooter({ storeUrl, whatsappPhone, storeBio }: { storeUrl: string; whatsappPhone?: string; storeBio?: string }) {
  const { store, design } = useStore();
  return (
    <footer className="mt-auto border-t"
      style={{ backgroundColor: design.palette.background, borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)`, color: design.palette.textMuted }}>
      <div className="container-store py-10 md:py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand + bio */}
          <div className="max-w-sm">
            <h3 className="font-display text-lg font-bold mb-2" style={{ color: design.palette.text }}>{store.name}</h3>
            {storeBio && <p className="text-xs leading-relaxed opacity-70">{storeBio}</p>}
          </div>
          {/* Links in a row */}
          <div className="flex gap-8 md:gap-12">
            <nav className="flex flex-col gap-1.5">
              <Link href={`${storeUrl}/collections/all`} className="text-xs hover:opacity-80 transition-opacity">Shop</Link>
              <Link href={`${storeUrl}/pages/shipping`} className="text-xs hover:opacity-80 transition-opacity">Shipping</Link>
              <Link href={`${storeUrl}/pages/returns`} className="text-xs hover:opacity-80 transition-opacity">Returns</Link>
            </nav>
            <nav className="flex flex-col gap-1.5">
              <Link href={`${storeUrl}/pages/privacy`} className="text-xs hover:opacity-80 transition-opacity">Privacy</Link>
              <Link href={`${storeUrl}/pages/terms`} className="text-xs hover:opacity-80 transition-opacity">Terms</Link>
              {whatsappPhone && (
                <a href={`https://wa.me/${whatsappPhone}`} className="text-xs hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              )}
            </nav>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t flex items-center justify-between"
          style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 5%, transparent)` }}>
          <p className="text-[10px]">© {new Date().getFullYear()} {store.name}</p>
          <span className="text-[10px] opacity-40">Powered by Tatparya</span>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function socialUrl(platform: string, value: string): string {
  if (platform === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }
  if (platform === 'email') return `mailto:${value}`;
  if (platform === 'instagram') {
    if (value.startsWith('http')) return value;
    return `https://instagram.com/${value.replace(/^@/, '')}`;
  }
  if (platform === 'facebook') {
    if (value.startsWith('http')) return value;
    return `https://facebook.com/${value.replace(/^@/, '')}`;
  }
  if (platform === 'twitter') {
    if (value.startsWith('http')) return value;
    return `https://twitter.com/${value.replace(/^@/, '')}`;
  }
  if (platform === 'youtube') {
    if (value.startsWith('http')) return value;
    return `https://youtube.com/@${value.replace(/^@/, '')}`;
  }
  return value;
}

function SocialLinks({ whatsappPhone, dark }: { whatsappPhone?: string; dark?: boolean }) {
  const { design, config } = useStore();
  const socialLinks = (config as any)?.socialLinks || {};
  const bg = dark
    ? 'rgba(255,255,255,0.08)'
    : `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`;
  const color = dark ? 'rgba(255,255,255,0.7)' : design.palette.primary;

  const waPhone = whatsappPhone || socialLinks.whatsapp;

  const icons: Array<{ platform: string; icon: React.ElementType; value?: string }> = [
    { platform: 'whatsapp', icon: MessageCircle, value: waPhone },
    { platform: 'instagram', icon: Instagram, value: socialLinks.instagram },
    { platform: 'facebook', icon: Facebook, value: socialLinks.facebook },
    { platform: 'twitter', icon: Twitter, value: socialLinks.twitter },
    { platform: 'youtube', icon: Youtube, value: socialLinks.youtube },
    { platform: 'email', icon: Mail, value: socialLinks.email },
  ];

  const visible = icons.filter(i => i.value);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map(({ platform, icon: Icon, value }) => (
        <a
          key={platform}
          href={socialUrl(platform, value!)}
          target={platform === 'email' ? undefined : '_blank'}
          rel={platform === 'email' ? undefined : 'noopener noreferrer'}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
          style={{ backgroundColor: bg, color }}
          aria-label={platform}
        >
          <Icon size={15} />
        </a>
      ))}
    </div>
  );
}

function FooterLinks({ title, links, dark }: {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
  dark?: boolean;
}) {
  const { design } = useStore();
  const headingColor = dark ? 'rgba(255,255,255,0.9)' : design.palette.text;

  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: headingColor }}>
        {title}
      </h4>
      <nav className="flex flex-col gap-1.5">
        {links.map(link => (
          link.external ? (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              className="text-xs hover:opacity-80 transition-opacity">{link.label}</a>
          ) : (
            <Link key={link.label} href={link.href}
              className="text-xs hover:opacity-80 transition-opacity">{link.label}</Link>
          )
        ))}
      </nav>
    </div>
  );
}

function BottomBar({ storeName }: { storeName: string }) {
  const { design } = useStore();
  return (
    <div
      className="mt-12 pt-6 border-t"
      style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)` }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4 opacity-40">
        {['Visa', 'Mastercard', 'UPI', 'COD', 'Net Banking'].map(method => (
          <span
            key={method}
            className="text-[10px] font-medium px-2 py-1 border rounded"
            style={{
              borderColor: `${design.palette.text}20`,
              color: design.palette.textMuted,
            }}
          >
            {method}
          </span>
        ))}
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[10px]">© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        <span className="text-[10px] opacity-40">Powered by Tatparya</span>
      </div>
    </div>
  );
}

// ============================================================
// Auto-infer footer variant from vertical + design tokens
// ============================================================
function inferFooterVariant(vertical: string, design: any): 'default' | 'minimal' | 'dark' {
  const colorMood = design.bespokeStyles?.colorMood;
  // Dark footer for luxury/premium verticals or explicitly dark mood
  if (colorMood === 'dark' || colorMood === 'dramatic') return 'dark';
  if (vertical === 'jewellery') return 'dark';
  // Minimal footer for beauty/modern vibes
  if (vertical === 'beauty') return 'minimal';
  if (colorMood === 'clean' || colorMood === 'fresh') return 'minimal';
  return 'default';
}
