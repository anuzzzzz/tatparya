'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';

export function Footer() {
  const { store, design } = useStore();
  const storeUrl = `/${store.slug}`;

  return (
    <footer
      className="mt-auto border-t"
      style={{
        backgroundColor: design.palette.surface,
        borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
        color: design.palette.textMuted,
      }}
    >
      <div className="container-store py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3
              className="font-display text-lg font-bold mb-2"
              style={{ color: design.palette.text }}
            >
              {store.name}
            </h3>
            {store.description && (
              <p className="text-sm leading-relaxed">{store.description}</p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: design.palette.text }}>
              Shop
            </h4>
            <div className="space-y-2 text-sm">
              <Link href={storeUrl} className="block hover:opacity-70 transition-opacity">
                Home
              </Link>
              <Link href={`${storeUrl}/collections/all`} className="block hover:opacity-70 transition-opacity">
                All Products
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: design.palette.text }}>
              Contact
            </h4>
            <div className="space-y-2 text-sm">
              {(store.whatsappConfig as any)?.businessPhone && (
                <a
                  href={`https://wa.me/${(store.whatsappConfig as any).businessPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-70 transition-opacity"
                >
                  WhatsApp
                </a>
              )}
              {store.businessName && (
                <p className="text-xs opacity-70">{store.businessName}</p>
              )}
              {store.gstin && (
                <p className="text-xs opacity-50">GSTIN: {store.gstin}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-xs opacity-50" style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)` }}>
          © {new Date().getFullYear()} {store.name}. Powered by Tatparya
        </div>
      </div>
    </footer>
  );
}
