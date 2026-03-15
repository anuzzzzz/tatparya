'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from './store-provider';

export function AnnouncementBar() {
  const { design, config } = useStore();
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const announcementConfig = (config as any)?.announcementBar || {};
  const visible = announcementConfig.visible !== false;
  const messages: string[] =
    announcementConfig.messages ||
    (config as any)?.announcementMessages ||
    (config as any)?.content?.marquee ||
    ['Free Shipping on Orders Above \u20B9499', 'COD Available Across India', 'Easy 7-Day Returns'];
  const bgColor = announcementConfig.bgColor || design.palette.text;
  const textColor = announcementConfig.textColor || design.palette.background;

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex(i => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  if (!visible || dismissed || messages.length === 0) return null;

  return (
    <div
      className="relative z-[60] flex items-center justify-center px-8 py-2"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-center truncate">
        {messages[currentIndex]}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}
