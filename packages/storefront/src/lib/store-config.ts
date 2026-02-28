import type { DesignTokens } from '@tatparya/shared';

/**
 * Convert DesignTokens into CSS custom properties.
 * These get injected into the store layout wrapper so all components
 * can use var(--color-primary) etc.
 */
export function designTokensToCssVars(tokens: DesignTokens): Record<string, string> {
  const vars: Record<string, string> = {};

  // Palette
  vars['--color-primary'] = tokens.palette.primary;
  vars['--color-secondary'] = tokens.palette.secondary;
  vars['--color-accent'] = tokens.palette.accent;
  vars['--color-background'] = tokens.palette.background;
  vars['--color-surface'] = tokens.palette.surface;
  vars['--color-text'] = tokens.palette.text;
  vars['--color-text-muted'] = tokens.palette.textMuted;

  // Fonts
  vars['--font-display'] = tokens.fonts.display;
  vars['--font-body'] = tokens.fonts.body;
  vars['--font-scale'] = String(tokens.fonts.scale);

  // Radius
  const radiusMap: Record<string, string> = {
    sharp: '0px',
    subtle: '4px',
    rounded: '8px',
    pill: '9999px',
  };
  vars['--radius'] = radiusMap[tokens.radius] || '8px';
  vars['--radius-sm'] = tokens.radius === 'sharp' ? '0px' : tokens.radius === 'pill' ? '9999px' : '4px';
  vars['--radius-lg'] = tokens.radius === 'sharp' ? '0px' : tokens.radius === 'pill' ? '9999px' : '12px';

  // Spacing
  const spacingMap: Record<string, { section: string; container: string; gap: string }> = {
    ultra_minimal: { section: '1rem', container: '0.5rem', gap: '0.5rem' },
    compact: { section: '1.5rem', container: '0.75rem', gap: '0.75rem' },
    balanced: { section: '2.5rem', container: '1rem', gap: '1rem' },
    airy: { section: '4rem', container: '1.5rem', gap: '1.5rem' },
  };
  const spacing = spacingMap[tokens.spacing] || spacingMap['balanced']!;
  vars['--spacing-section'] = spacing.section;
  vars['--spacing-container'] = spacing.container;
  vars['--spacing-gap'] = spacing.gap;

  // Hero
  vars['--hero-overlay-opacity'] = String(tokens.hero.overlayOpacity);

  return vars;
}

/**
 * Convert CSS vars record to an inline style string for SSR.
 */
export function cssVarsToStyle(vars: Record<string, string>): React.CSSProperties {
  return vars as React.CSSProperties;
}

/**
 * Build Google Fonts URL from design tokens.
 */
export function buildGoogleFontsUrl(tokens: DesignTokens): string {
  const families = new Set([tokens.fonts.display, tokens.fonts.body]);
  const params = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Get animation class based on design token.
 */
export function getAnimationClass(animation: DesignTokens['animation']): string {
  const map: Record<string, string> = {
    none: '',
    fade: 'animate-fade-in',
    slide_up: 'animate-slide-up',
    bounce: 'animate-bounce-in',
    staggered: 'animate-stagger',
  };
  return map[animation] || '';
}

/**
 * Get image ratio class for product cards.
 */
export function getImageRatioClass(ratio: string): string {
  const map: Record<string, string> = {
    '3:4': 'aspect-[3/4]',
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
  };
  return map[ratio] || 'aspect-[3/4]';
}
