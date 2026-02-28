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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 text-white text-sm font-medium shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      style={{
        backgroundColor: '#25D366',
        borderRadius: design.radius === 'sharp' ? '4px' : '50px',
      }}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={20} fill="white" stroke="white" />
      <span className="hidden md:inline">Chat with us</span>
    </a>
  );
}
