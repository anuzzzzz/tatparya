'use client';

import React from 'react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

export function AboutBrand() {
  const { store, design, config } = useStore();
  const [ref, visible] = useReveal(0.15);
  const storeBio = (config as any)?.storeBio || store.description;
  const provenanceBadge = (config as any)?.heroProvenanceBadge;

  if (!storeBio) return null;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn('transition-all duration-700', visible ? 'reveal-visible' : 'reveal-hidden')}
      style={{
        backgroundColor: design.palette.surface,
        paddingTop: 'var(--spacing-section)',
        paddingBottom: 'var(--spacing-section)',
      }}
    >
      <div className="container-store max-w-2xl text-center">
        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px w-12" style={{ backgroundColor: `color-mix(in srgb, ${design.palette.primary} 30%, transparent)` }} />
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: design.palette.primary }}>
            {provenanceBadge || 'Our Story'}
          </span>
          <div className="h-px w-12" style={{ backgroundColor: `color-mix(in srgb, ${design.palette.primary} 30%, transparent)` }} />
        </div>

        {/* Brand name as section heading */}
        <h2 className="font-display text-xl md:text-2xl font-bold mb-4 leading-snug" style={{ color: design.palette.text }}>
          {store.name}
        </h2>

        {/* Bio text — pull-quote style */}
        <p
          className="text-sm md:text-base leading-relaxed"
          style={{ color: design.palette.textMuted, lineHeight: '1.8' }}
        >
          {storeBio}
        </p>

        {/* Bottom decorative element */}
        <div className="mt-6 flex justify-center">
          <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${design.palette.primary} 40%, transparent)` }} />
        </div>
      </div>
    </section>
  );
}
