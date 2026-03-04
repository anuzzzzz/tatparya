'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { MessageCircle, Instagram, Mail } from 'lucide-react';
import { TextureOverlay } from './texture-overlay';

export function Footer() {
  const { store, design } = useStore();
  const storeUrl = `/${store.slug}`;
  const whatsappPhone = (store.whatsappConfig as any)?.businessPhone;
  const textureHint = (design.decorativeTokens as any)?.textureOverlay || 'none';

  return (
    <footer
      className="mt-auto border-t relative overflow-hidden"
      style={{
        backgroundColor: design.palette.surface,
        borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
        color: design.palette.textMuted,
      }}
    >
      {/* V3.1: Texture overlay in footer for handcrafted feel */}
      <TextureOverlay hint={textureHint} opacity={0.02} />

      <div className="container-store py-10 md:py-14 relative z-[2]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3
              className="font-display text-lg font-bold mb-3"
              style={{ color: design.palette.text }}
            >
              {store.name}
            </h3>
            {store.description && (
              <p className="text-xs leading-relaxed mb-4 max-w-[280px]">{store.description}</p>
            )}
            {/* Social */}
            <div className="flex gap-2">
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`,
                    color: design.palette.primary,
                  }}
                >
                  <MessageCircle size={14} />
                </a>
              )}
              <a
                href="#"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`,
                  color: design.palette.primary,
                }}
              >
                <Instagram size={14} />
              </a>
              <a
                href="#"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`,
                  color: design.palette.primary,
                }}
              >
                <Mail size={14} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: design.palette.text }}
            >
              Shop
            </h4>
            <nav className="flex flex-col gap-1.5">
              <Link href={`${storeUrl}/collections/all`} className="text-xs hover:opacity-80 transition-opacity">
                All Products
              </Link>
              <Link href={`${storeUrl}/collections/all`} className="text-xs hover:opacity-80 transition-opacity">
                New Arrivals
              </Link>
              <Link href={`${storeUrl}/collections/all`} className="text-xs hover:opacity-80 transition-opacity">
                Best Sellers
              </Link>
            </nav>
          </div>

          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: design.palette.text }}
            >
              Help
            </h4>
            <nav className="flex flex-col gap-1.5">
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Shipping</a>
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Returns</a>
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Contact Us</a>
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:opacity-80 transition-opacity"
                >
                  WhatsApp Support
                </a>
              )}
            </nav>
          </div>

          <div>
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: design.palette.text }}
            >
              Legal
            </h4>
            <nav className="flex flex-col gap-1.5">
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Privacy Policy</a>
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Terms of Service</a>
              <a href="#" className="text-xs hover:opacity-80 transition-opacity">Refund Policy</a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)` }}
        >
          <p className="text-[10px]">
            © {new Date().getFullYear()} {store.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[10px] opacity-60">
            <span>Powered by Tatparya</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
