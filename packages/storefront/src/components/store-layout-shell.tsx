'use client';

// ============================================================
// Store Layout Wrapper
//
// This is a client-side wrapper applied in [storeSlug]/layout.tsx
// that handles the fixed navbar spacing.
// 
// USAGE: In your layout.tsx, wrap children with this:
//   <StoreLayoutShell>{children}</StoreLayoutShell>
// ============================================================

import React from 'react';

/**
 * Adds top padding to account for the fixed transparent navbar.
 * The navbar is 56px (h-14) on mobile, 64px (h-16) on desktop.
 * We only need padding on pages that DON'T have a full-bleed hero
 * (the hero goes behind the transparent navbar by design).
 */
export function StoreLayoutShell({ children, hasFullBleedHero }: { children: React.ReactNode; hasFullBleedHero?: boolean }) {
  return (
    <div style={{ paddingTop: hasFullBleedHero ? 0 : 64 }}>
      {children}
    </div>
  );
}
