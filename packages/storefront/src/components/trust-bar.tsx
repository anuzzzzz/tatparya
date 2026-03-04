'use client';

import React from 'react';
import { Truck, ShieldCheck, MessageCircle, RotateCcw } from 'lucide-react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

const TRUST_ITEMS = [
  { icon: Truck, label: 'Free Shipping', sublabel: 'On orders above ₹499' },
  { icon: ShieldCheck, label: 'Secure Payment', sublabel: '100% safe checkout' },
  { icon: MessageCircle, label: 'WhatsApp Support', sublabel: 'Quick responses' },
  { icon: RotateCcw, label: 'Easy Returns', sublabel: '7-day return policy' },
];

export function TrustBar() {
  const { design } = useStore();
  const [ref, visible] = useReveal(0.2);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn(
        'py-6 md:py-8 border-y transition-all duration-700',
        visible ? 'reveal-visible' : 'reveal-hidden',
      )}
      style={{
        backgroundColor: design.palette.background,
        borderColor: `color-mix(in srgb, ${design.palette.text} 5%, transparent)`,
      }}
    >
      <div className="container-store">
        <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
          {TRUST_ITEMS.map(({ icon: Icon, label, sublabel }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 transition-all duration-500"
              style={{
                transitionDelay: visible ? `${i * 80}ms` : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${design.palette.primary} 8%, transparent)`,
                  color: design.palette.primary,
                }}
              >
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight" style={{ color: design.palette.text }}>{label}</p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: design.palette.textMuted }}>{sublabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
