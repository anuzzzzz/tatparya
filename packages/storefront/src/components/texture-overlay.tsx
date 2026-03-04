'use client';

import React from 'react';

// ============================================================
// Texture Overlay v3.1
//
// Renders the Director's textureHint as a low-opacity SVG mask.
// Applied on hero sections and footer for a handcrafted feel.
//
// Hints: none | noise-subtle | ethnic-pattern | linen
//
// Usage:
//   <div className="relative">
//     <TextureOverlay hint="noise-subtle" />
//     {children}
//   </div>
// ============================================================

interface TextureOverlayProps {
  hint: string;
  /** Override opacity (default varies by hint) */
  opacity?: number;
  /** CSS class for additional positioning */
  className?: string;
}

export function TextureOverlay({ hint, opacity, className = '' }: TextureOverlayProps) {
  if (!hint || hint === 'none') return null;

  const baseClass = `absolute inset-0 pointer-events-none z-[1] ${className}`;

  switch (hint) {
    case 'noise-subtle':
      return (
        <div className={baseClass} style={{ opacity: opacity ?? 0.04 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="tatparya-noise" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#tatparya-noise)" />
          </svg>
        </div>
      );

    case 'ethnic-pattern':
      return (
        <div className={baseClass} style={{ opacity: opacity ?? 0.035 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tatparya-ethnic" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                {/* Diamond lattice — inspired by Indian jali screens */}
                <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="2" fill="currentColor" />
                <circle cx="0" cy="0" r="1" fill="currentColor" />
                <circle cx="40" cy="0" r="1" fill="currentColor" />
                <circle cx="0" cy="40" r="1" fill="currentColor" />
                <circle cx="40" cy="40" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tatparya-ethnic)" />
          </svg>
        </div>
      );

    case 'linen':
      return (
        <div className={baseClass} style={{ opacity: opacity ?? 0.025 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tatparya-linen" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                {/* Crosshatch linen texture */}
                <line x1="0" y1="0" x2="4" y2="4" stroke="currentColor" strokeWidth="0.3" />
                <line x1="4" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tatparya-linen)" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
