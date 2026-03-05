'use client';

import React from 'react';
import { useStore } from './store-provider';

const DEFAULT_ITEMS = ['Free Shipping on ₹499+', 'COD Available', 'Easy Returns', '100% Authentic', 'Secure Payments'];

interface MarqueeBannerProps {
  items?: string[];
}

export function MarqueeBanner({ items: propItems }: MarqueeBannerProps) {
  const { design, config } = useStore();
  // V3.2: Use AI-generated marquee from config, then props, then defaults
  const items: string[] = propItems || (config as any)?.content?.marquee || DEFAULT_ITEMS;
  // Double the items for seamless infinite scroll
  const doubled = [...items, ...items];

  return (
    <section className="overflow-hidden py-3 md:py-4" style={{ backgroundColor: design.palette.surface }}>
      <div className="marquee-track">
        {doubled.map((text, i) => (
          <span
            key={i}
            className="text-xs md:text-sm font-medium whitespace-nowrap px-6"
            style={{ color: design.palette.textMuted }}
          >
            {text} <span className="mx-2 opacity-30">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}
