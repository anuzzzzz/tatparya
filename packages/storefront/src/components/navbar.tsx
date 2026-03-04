'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Menu, X, MessageCircle } from 'lucide-react';
import { useStore } from './store-provider';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { store, design, cartCount } = useStore();
  const nav = design.nav || { style: 'sticky_minimal', showSearch: true, showCart: true, showWhatsapp: false };
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrolled = useScrolled(60);

  const storeUrl = `/${store.slug}`;
  const whatsappUrl = store.whatsappConfig
    ? `https://wa.me/${(store.whatsappConfig as any).businessPhone || ''}`
    : '#';

  const useGlass = design.decorativeTokens?.useGlassmorphism !== false;
  const isSticky = nav.style === 'sticky_minimal' || nav.style === 'top_bar';

  // V3: Transparent navbar over hero — white text when unscrolled
  const heroStyle = design.hero?.style || 'full_bleed';
  const hasImageHero = ['full_bleed', 'parallax', 'carousel', 'video', 'gradient'].includes(heroStyle);
  const isTransparent = !scrolled && hasImageHero;
  const textColor = isTransparent ? '#fff' : design.palette.text;
  const textMuted = isTransparent ? 'rgba(255,255,255,0.7)' : design.palette.textMuted;

  return (
    <header
      className={cn(
        'w-full z-50 transition-all duration-500',
        isSticky && 'fixed top-0 left-0 right-0',
      )}
      style={{
        backgroundColor: scrolled
          ? (useGlass ? 'rgba(255,255,255,0.0)' : design.palette.background)
          : 'transparent',
        backdropFilter: scrolled && useGlass ? 'blur(20px) saturate(180%)' : undefined,
        WebkitBackdropFilter: scrolled && useGlass ? 'blur(20px) saturate(180%)' : undefined,
        borderBottom: scrolled
          ? `1px solid color-mix(in srgb, ${design.palette.text} 8%, transparent)`
          : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      {/* Glass background layer — separate so we can tint it with the store's bg color */}
      {scrolled && useGlass && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundColor: `color-mix(in srgb, ${design.palette.background} 85%, transparent)`,
          }}
        />
      )}

      <nav className="container-store flex items-center justify-between h-14 md:h-16">
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1.5 -ml-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            style={{
              color: textColor,
              '--tw-ring-color': design.palette.primary,
            } as React.CSSProperties}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            href={storeUrl}
            className="font-display text-lg md:text-xl font-bold tracking-tight truncate max-w-[180px] md:max-w-none transition-colors duration-500"
            style={{ color: textColor }}
          >
            {store.name}
          </Link>
        </div>

        {/* Center: nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href={storeUrl}
            className="transition-opacity duration-200 hover:opacity-70"
            style={{ color: textColor }}
          >
            Home
          </Link>
          <Link
            href={`${storeUrl}/collections/all`}
            className="transition-opacity duration-200 hover:opacity-70"
            style={{ color: textColor }}
          >
            Shop
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {nav.showSearch && (
            <button
              className="p-2 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              style={{
                color: textColor,
                '--tw-ring-color': design.palette.primary,
              } as React.CSSProperties}
            >
              <Search size={20} />
            </button>
          )}

          {nav.showWhatsapp && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex p-2 transition-opacity duration-200 hover:opacity-70"
              style={{ color: isTransparent ? '#25D366' : '#25D366' }}
              aria-label="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          )}

          {nav.showCart && (
            <Link
              href={`${storeUrl}/cart`}
              className="relative p-2 transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              aria-label={`Cart with ${cartCount} items`}
              style={{
                color: textColor,
                '--tw-ring-color': design.palette.primary,
              } as React.CSSProperties}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1 animate-scale-in"
                  style={{ backgroundColor: design.palette.primary }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </nav>

      {/* Search bar (slide down) */}
      {searchOpen && (
        <div
          className="border-t px-4 py-3 animate-slide-up"
          style={{
            borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
            backgroundColor: design.palette.background,
          }}
        >
          <form action={`${storeUrl}/collections/all`} method="GET" className="container-store flex items-center gap-2">
            <Search size={18} className="opacity-40 flex-shrink-0" style={{ color: design.palette.text }} />
            <input
              name="search"
              type="text"
              placeholder="Search products..."
              className="flex-1 bg-transparent outline-none text-sm py-1"
              style={{ color: design.palette.text }}
              autoFocus
            />
            <button type="button" onClick={() => setSearchOpen(false)} className="p-1 opacity-60" aria-label="Close search">
              <X size={16} style={{ color: design.palette.text }} />
            </button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-3 animate-fade-in"
          style={{
            backgroundColor: design.palette.background,
            borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
          }}
        >
          <Link href={storeUrl} className="block text-sm font-medium py-1" onClick={() => setMenuOpen(false)} style={{ color: design.palette.text }}>Home</Link>
          <Link href={`${storeUrl}/collections/all`} className="block text-sm font-medium py-1" onClick={() => setMenuOpen(false)} style={{ color: design.palette.text }}>Shop All</Link>
          {nav.showWhatsapp && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium py-1" style={{ color: '#25D366' }}>
              <MessageCircle size={16} /> Chat with us
            </a>
          )}
        </div>
      )}
    </header>
  );
}
