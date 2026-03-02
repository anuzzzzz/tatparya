'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { MessageCircle, Instagram, Mail } from 'lucide-react';

export function Footer() {
  const { store, design } = useStore();
  const storeUrl = `/${store.slug}`;
  const whatsappPhone = (store.whatsappConfig as any)?.businessPhone;

  return (
    <footer
      className="mt-auto border-t"
      style={{
        backgroundColor: design.palette.surface,
        borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
        color: design.palette.textMuted,
      }}
    >
      <div className="container-store py-10 md:py-14">
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
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
                    color: design.palette.textMuted,
                  }}
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={14} />
                </a>
              )}
              <a
                href="#"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
                  color: design.palette.textMuted,
                }}
                aria-label="Instagram"
              >
                <Instagram size={14} />
              </a>
              <a
                href="#"
                className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)`,
                  color: design.palette.textMuted,
                }}
                aria-label="Email"
              >
                <Mail size={14} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ color: design.palette.text }}
            >
              Shop
            </h4>
            <div className="space-y-2.5 text-xs">
              <Link href={storeUrl} className="block hover:opacity-70 transition-opacity">
                Home
              </Link>
              <Link href={`${storeUrl}/collections/all`} className="block hover:opacity-70 transition-opacity">
                All Products
              </Link>
              <Link href={`${storeUrl}/cart`} className="block hover:opacity-70 transition-opacity">
                Cart
              </Link>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h4
              className="text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ color: design.palette.text }}
            >
              Policies
            </h4>
            <div className="space-y-2.5 text-xs">
              <span className="block opacity-60">Shipping Policy</span>
              <span className="block opacity-60">Return & Refund</span>
              <span className="block opacity-60">Privacy Policy</span>
              <span className="block opacity-60">Terms of Service</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ color: design.palette.text }}
            >
              Contact
            </h4>
            <div className="space-y-2.5 text-xs">
              {whatsappPhone && (
                <a
                  href={`https://wa.me/${whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-70 transition-opacity"
                >
                  WhatsApp: +{whatsappPhone}
                </a>
              )}
              {store.businessName && (
                <p className="opacity-70">{store.businessName}</p>
              )}
              {store.gstin && (
                <p className="opacity-50">GSTIN: {store.gstin}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment methods + bottom bar */}
        <div
          className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)` }}
        >
          <div className="flex items-center gap-4 text-[10px] opacity-50">
            <span>© {new Date().getFullYear()} {store.name}</span>
            <span>·</span>
            <span>Powered by Tatparya</span>
          </div>

          {/* Payment method badges */}
          <div className="flex items-center gap-3">
            {['UPI', 'COD', 'Cards', 'Net Banking'].map((method) => (
              <span
                key={method}
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: `color-mix(in srgb, ${design.palette.text} 5%, transparent)`,
                  color: design.palette.textMuted,
                }}
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
