'use client';

import React from 'react';
import { useStore } from './store-provider';

interface SectionDividerProps {
  /** Override divider style from decorativeTokens */
  style?: 'line' | 'gradient-fade' | 'pattern-ethnic' | 'none';
}

/**
 * V2: Decorative divider between sections.
 * Reads from decorativeTokens.dividerStyle unless explicitly overridden.
 */
export function SectionDivider({ style: explicitStyle }: SectionDividerProps) {
  const { design } = useStore();
  const dividerStyle = explicitStyle || design.decorativeTokens?.dividerStyle || 'gradient-fade';

  if (dividerStyle === 'none') return null;

  if (dividerStyle === 'pattern-ethnic') {
    return (
      <div className="py-2">
        <svg width="100%" height="12" viewBox="0 0 400 12" preserveAspectRatio="none" className="opacity-10">
          <pattern id="ethnic-dots" x="0" y="0" width="24" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1.5" fill="var(--color-primary)" />
            <circle cx="18" cy="6" r="1" fill="var(--color-accent)" />
          </pattern>
          <rect width="400" height="12" fill="url(#ethnic-dots)" />
        </svg>
      </div>
    );
  }

  if (dividerStyle === 'line') {
    return (
      <div
        className="h-px"
        style={{ backgroundColor: `color-mix(in srgb, ${design.palette.text} 8%, transparent)` }}
      />
    );
  }

  // Default: gradient-fade
  return <div className="divider-gradient" />;
}
