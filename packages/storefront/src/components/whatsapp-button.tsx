'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from './store-provider';

export function WhatsAppButton() {
  const { store, design } = useStore();
  const whatsappConfig = store.whatsappConfig as any;

  if (!whatsappConfig?.enabled || !whatsappConfig?.businessPhone) return null;

  const phone = whatsappConfig.businessPhone.replace(/^\+/, '');
  const message = encodeURIComponent(`Hi! I'm browsing your store ${store.name}`);
  const url = `https://wa.me/${phone}?text=${message}`;

  return (
    <div className="fixed bottom-5 right-5 z-50 md:bottom-6 md:right-6 group">
      {/* V2: Tooltip that appears on hover */}
      <div
        className="absolute bottom-full right-0 mb-2 px-3 py-1.5 text-xs font-medium text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-y-1 group-hover:translate-y-0"
        style={{ backgroundColor: '#1A1A2E', transitionTimingFunction: 'var(--ease-spring)' }}
      >
        Chat with us on WhatsApp
        <div className="absolute top-full right-4 w-2 h-2 rotate-45" style={{ backgroundColor: '#1A1A2E', marginTop: '-4px' }} />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-3 text-white text-sm font-medium shadow-lg transition-all hover:scale-105 active:scale-95 hover:shadow-xl"
        style={{
          backgroundColor: '#25D366',
          borderRadius: design.radius === 'sharp' ? '4px' : '50px',
          transitionTimingFunction: 'var(--ease-spring)',
        }}
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={20} fill="white" stroke="white" />
        <span className="hidden md:inline">Chat with us</span>
      </a>
    </div>
  );
}
