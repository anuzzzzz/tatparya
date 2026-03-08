'use client';

import React, { useState } from 'react';
import { useStore } from './store-provider';

interface ProductTabsProps {
  description?: string;
}

const TABS = ['Description', 'Shipping', 'Returns'] as const;

const SHIPPING_CONTENT = `We ship across India via trusted courier partners.

Standard Delivery: 3–7 business days
Express Delivery: 1–3 business days (select cities)

You will receive a tracking link via SMS/WhatsApp once your order ships.`;

const RETURNS_CONTENT = `Easy 7-day return policy.

If you're not satisfied with your purchase, you can return it within 7 days of delivery for a full refund or exchange. Items must be unused, unwashed, and in their original packaging.

To initiate a return, reach out to us via WhatsApp or email.`;

export function ProductTabs({ description }: ProductTabsProps) {
  const { design } = useStore();
  const [active, setActive] = useState<(typeof TABS)[number]>('Description');

  const content: Record<(typeof TABS)[number], string> = {
    Description: description || 'No description available.',
    Shipping: SHIPPING_CONTENT,
    Returns: RETURNS_CONTENT,
  };

  return (
    <section className="mt-12">
      {/* Tab headers */}
      <div
        className="flex gap-6 border-b"
        style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 10%, transparent)` }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className="relative pb-3 text-sm font-medium transition-colors"
            style={{
              color: active === tab ? design.palette.text : design.palette.textMuted,
            }}
          >
            {tab}
            {active === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: design.palette.primary }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="pt-6 text-sm leading-relaxed max-w-3xl"
        style={{ color: design.palette.textMuted }}
      >
        {content[active].split('\n').map((p, i) => (
          <p key={i} className={p.trim() === '' ? 'h-3' : ''}>
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
