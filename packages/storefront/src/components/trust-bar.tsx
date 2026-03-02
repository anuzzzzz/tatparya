'use client';

import React from 'react';
import { Truck, ShieldCheck, RotateCcw, CreditCard } from 'lucide-react';
import { useStore } from './store-provider';

const TRUST_ITEMS = [
  { icon: Truck, label: 'Free Shipping', sub: 'On orders above ₹499' },
  { icon: ShieldCheck, label: 'Cash on Delivery', sub: 'Pay at your doorstep' },
  { icon: RotateCcw, label: 'Easy Returns', sub: '7-day return policy' },
  { icon: CreditCard, label: 'Secure Payments', sub: 'UPI, Cards & More' },
];

export function TrustBar() {
  const { design } = useStore();

  return (
    <section
      className="border-y"
      style={{
        backgroundColor: design.palette.surface,
        borderColor: `color-mix(in srgb, ${design.palette.text} 6%, transparent)`,
      }}
    >
      <div className="container-store py-5 md:py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`,
                  color: design.palette.primary,
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs md:text-sm font-semibold leading-tight" style={{ color: design.palette.text }}>
                  {label}
                </p>
                <p className="text-[10px] md:text-xs leading-tight mt-0.5" style={{ color: design.palette.textMuted }}>
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
