'use client';

import React from 'react';
import { Truck, ShieldCheck, RotateCcw, Package } from 'lucide-react';
import { useStore } from './store-provider';

export function ProductTrustBadges() {
  const { design } = useStore();

  const badges = [
    { icon: Package, text: 'Cash on Delivery available' },
    { icon: Truck, text: 'Delivery in 5-7 business days' },
    { icon: RotateCcw, text: '7-day easy returns' },
    { icon: ShieldCheck, text: 'Quality guaranteed' },
  ];

  return (
    <div
      className="mt-6 pt-5 border-t space-y-2.5"
      style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)` }}
    >
      {badges.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-2.5">
          <Icon
            size={15}
            strokeWidth={1.8}
            style={{ color: design.palette.textMuted, flexShrink: 0 }}
          />
          <span className="text-xs" style={{ color: design.palette.textMuted }}>
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}
