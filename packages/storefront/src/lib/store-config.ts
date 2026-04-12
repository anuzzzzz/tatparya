import type { DesignTokens } from '@tatparya/shared';

/**
 * Convert DesignTokens into CSS custom properties.
 * These get injected into the store layout wrapper so all components
 * can use var(--color-primary) etc.
 *
 * IMPORTANT: tokens can be undefined if the design AI hasn't run yet
 * (fire-and-forget on first photo upload). All reads must be null-safe.
 */
export function designTokensToCssVars(tokens: DesignTokens | undefined | null): Record<string, string> {
  const vars: Record<string, string> = {};

  // Guard: tokens may be undefined before design AI completes
  const t = tokens || ({} as Partial<DesignTokens>);

  const palette = t.palette || {} as any;
  const fonts = t.fonts || { display: 'Inter', body: 'Inter', scale: 1.0 };

  // Palette
  vars['--color-primary'] = palette.primary || '#1a1a2e';
  vars['--color-secondary'] = palette.secondary || '#16213e';
  vars['--color-accent'] = palette.accent || '#e94560';
  vars['--color-background'] = palette.background || '#faf3e8';
  vars['--color-surface'] = palette.surface || '#f0ead6';
  vars['--color-text'] = palette.text || '#1a1a2e';
  vars['--color-text-muted'] = palette.textMuted || '#6b6b80';

  // Fonts
  vars['--font-display'] = fonts.display || 'Inter';
  vars['--font-body'] = fonts.body || 'Inter';
  vars['--font-scale'] = String(fonts.scale ?? 1.0);

  // Radius
  const radius = t.radius || 'rounded';
  const radiusMap: Record<string, string> = {
    sharp: '0px',
    subtle: '4px',
    rounded: '8px',
    pill: '9999px',
  };
  vars['--radius'] = radiusMap[radius] || '8px';
  vars['--radius-sm'] = radius === 'sharp' ? '0px' : radius === 'pill' ? '9999px' : '4px';
  vars['--radius-lg'] = radius === 'sharp' ? '0px' : radius === 'pill' ? '9999px' : '12px';

  // Spacing
  const spacingMap: Record<string, { section: string; container: string; gap: string }> = {
    ultra_minimal: { section: '1rem', container: '0.5rem', gap: '0.5rem' },
    compact: { section: '1.5rem', container: '0.75rem', gap: '0.75rem' },
    balanced: { section: '2.5rem', container: '1rem', gap: '1rem' },
    airy: { section: '4rem', container: '1.5rem', gap: '1.5rem' },
  };
  const spacing = spacingMap[t.spacing || 'balanced'] || spacingMap['balanced']!;
  vars['--spacing-section'] = spacing.section;
  vars['--spacing-container'] = spacing.container;
  vars['--spacing-gap'] = spacing.gap;

  // Hero
  vars['--hero-overlay-opacity'] = String(t.hero?.overlayOpacity ?? 0.3);

  // V2: Tier 3 — Component tokens
  if (t.heroTokens) {
    vars['--hero-overlay-gradient'] = t.heroTokens.overlayGradient || 'cinematic-bottom';
    vars['--hero-text-placement'] = t.heroTokens.textPlacement || 'bottom-left';
    vars['--hero-slide-transition'] = t.heroTokens.slideTransition || 'crossfade';
  }
  if (t.cardTokens) {
    vars['--card-hover-effect'] = t.cardTokens.hoverEffect || 'zoom';
    vars['--card-badge-style'] = t.cardTokens.badgeStyle || 'pill';
    vars['--card-price-display'] = t.cardTokens.priceDisplay || 'stacked';
  }
  if (t.decorativeTokens) {
    vars['--divider-style'] = t.decorativeTokens.dividerStyle || 'gradient-fade';
    vars['--section-bg-variation'] = t.decorativeTokens.sectionBgVariation ? '1' : '0';
    vars['--use-glassmorphism'] = t.decorativeTokens.useGlassmorphism ? '1' : '0';
  }

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
export function buildGoogleFontsUrl(tokens: DesignTokens | undefined | null): string {
  const families = new Set([tokens?.fonts?.display || 'Inter', tokens?.fonts?.body || 'Inter']);
  const params = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Get animation class based on design token.
 */
export function getAnimationClass(animation: DesignTokens['animation'] | undefined): string {
  const map: Record<string, string> = {
    none: '',
    fade: 'animate-fade-in',
    slide_up: 'animate-slide-up',
    bounce: 'animate-bounce-in',
    staggered: 'animate-stagger',
  };
  return map[animation || 'none'] || '';
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
