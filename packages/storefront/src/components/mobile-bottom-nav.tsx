'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3X3, Search, ShoppingBag } from 'lucide-react';
import { useStore } from './store-provider';

export function MobileBottomNav() {
  const { store, design, cartCount } = useStore();
  const pathname = usePathname();
  const storeUrl = `/${store.slug}`;
  const p = design.palette;

  if (pathname?.includes('/dashboard')) return null;

  const tabs = [
    { label: 'Home', icon: Home, href: storeUrl },
    { label: 'Shop', icon: Grid3X3, href: `${storeUrl}/collections/all` },
    { label: 'Search', icon: Search, href: `${storeUrl}/collections/all?search=` },
    { label: 'Cart', icon: ShoppingBag, href: `${storeUrl}/cart` },
  ];

  const isActive = (href: string) => {
    if (href === storeUrl) return pathname === storeUrl;
    return pathname?.startsWith(href) || false;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-center justify-around"
      style={{
        backgroundColor: p.background,
        borderColor: `color-mix(in srgb, ${p.text} 8%, transparent)`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(tab => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className="relative flex flex-col items-center gap-0.5 py-2 px-4"
            style={{ color: active ? p.primary : (p.textMuted || '#999') }}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.label === 'Cart' && cartCount > 0 && (
              <span
                className="absolute top-1 right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white rounded-full px-0.5"
                style={{ backgroundColor: p.primary }}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
