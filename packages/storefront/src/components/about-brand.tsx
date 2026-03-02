'use client';

import React from 'react';
import { useStore } from './store-provider';

export function AboutBrand() {
  const { store, design, config } = useStore();

  // Use AI-generated bio, falling back to store description
  const bio = (config as any).storeBio || store.description;
  if (!bio) return null;

  return (
    <section
      style={{
        backgroundColor: design.palette.background,
        paddingTop: 'var(--spacing-section)',
        paddingBottom: 'var(--spacing-section)',
      }}
    >
      <div className="container-store">
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-semibold mb-3"
            style={{ color: design.palette.primary }}
          >
            Our Story
          </p>
          <h2
            className="font-display text-xl md:text-2xl font-bold mb-4 leading-snug"
            style={{ color: design.palette.text }}
          >
            About {store.name}
          </h2>
          <p
            className="text-sm md:text-base leading-relaxed"
            style={{ color: design.palette.textMuted }}
          >
            {bio}
          </p>
        </div>
      </div>
    </section>
  );
}
