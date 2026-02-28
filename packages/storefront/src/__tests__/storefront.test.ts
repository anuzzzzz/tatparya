import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceExact, discountPercent, truncate, cn, imageUrl, getCartId, clearCartId } from '../lib/utils';
import { designTokensToCssVars, buildGoogleFontsUrl, getAnimationClass, getImageRatioClass } from '../lib/store-config';
import type { DesignTokens } from '@tatparya/shared';

// ============================================================
// Utils
// ============================================================

describe('Utils', () => {
  describe('formatPrice', () => {
    it('formats whole numbers with ₹ and Indian grouping', () => {
      expect(formatPrice(1500)).toBe('₹1,500');
    });

    it('formats zero', () => {
      expect(formatPrice(0)).toBe('₹0');
    });

    it('formats large numbers with Indian grouping (lakhs)', () => {
      const result = formatPrice(150000);
      // Indian formatting: ₹1,50,000
      expect(result).toContain('₹');
      expect(result).toContain('1,50,000');
    });

    it('rounds decimals to whole number', () => {
      expect(formatPrice(99.99)).toBe('₹100');
    });
  });

  describe('formatPriceExact', () => {
    it('shows decimals when present', () => {
      expect(formatPriceExact(99.50)).toBe('₹99.50');
    });

    it('omits decimals for whole numbers', () => {
      expect(formatPriceExact(100)).toBe('₹100');
    });
  });

  describe('discountPercent', () => {
    it('calculates correct discount %', () => {
      expect(discountPercent(800, 1000)).toBe(20);
    });

    it('returns 0 when no compare price', () => {
      expect(discountPercent(800, 0)).toBe(0);
    });

    it('returns 0 when compare price is lower', () => {
      expect(discountPercent(1000, 800)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      // 333/1000 = 33.3%
      expect(discountPercent(667, 1000)).toBe(33);
    });

    it('handles 100% discount', () => {
      expect(discountPercent(0, 1000)).toBe(100);
    });
  });

  describe('truncate', () => {
    it('leaves short text unchanged', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates long text with ellipsis', () => {
      expect(truncate('hello world foo bar', 10)).toBe('hello worl…');
    });

    it('handles exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
  });

  describe('cn (class names)', () => {
    it('joins truthy class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    it('filters out falsy values', () => {
      expect(cn('a', false, null, undefined, 'b', '')).toBe('a b');
    });

    it('returns empty string for no truthy values', () => {
      expect(cn(false, null, undefined)).toBe('');
    });
  });

  describe('imageUrl', () => {
    it('returns placeholder for null', () => {
      expect(imageUrl(null)).toBe('/placeholder-product.svg');
    });

    it('returns placeholder for undefined', () => {
      expect(imageUrl(undefined)).toBe('/placeholder-product.svg');
    });

    it('returns full URLs unchanged', () => {
      expect(imageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    });

    it('returns http URLs unchanged', () => {
      expect(imageUrl('http://localhost/img.jpg')).toBe('http://localhost/img.jpg');
    });

    it('prepends R2 URL for relative paths', () => {
      // R2_PUBLIC_URL is empty in test env, so just prepends /
      const result = imageUrl('stores/abc/hero.webp');
      expect(result).toContain('stores/abc/hero.webp');
    });
  });
});

// ============================================================
// Store Config
// ============================================================

const mockDesignTokens: DesignTokens = {
  layout: 'minimal',
  palette: {
    mode: 'generated',
    primary: '#D4356A',
    secondary: '#F8E8EE',
    accent: '#8B1A3A',
    background: '#FFFAF5',
    surface: '#FFF5EE',
    text: '#1A1A2E',
    textMuted: '#6B6B80',
  },
  fonts: {
    display: 'Playfair Display',
    body: 'DM Sans',
    scale: 1.0,
  },
  hero: {
    style: 'full_bleed',
    height: 'full',
    overlayOpacity: 0.3,
  },
  productCard: {
    style: 'minimal',
    showPrice: true,
    showRating: true,
    imageRatio: '3:4',
  },
  nav: {
    style: 'sticky_minimal',
    showSearch: true,
    showCart: true,
    showWhatsapp: true,
  },
  collection: {
    style: 'uniform_grid',
    columns: { mobile: 2, desktop: 4 },
    pagination: 'infinite_scroll',
  },
  checkout: {
    style: 'single_page',
    showTrustBadges: true,
    whatsappCheckout: false,
  },
  spacing: 'balanced',
  radius: 'rounded',
  imageStyle: 'subtle_shadow',
  animation: 'fade',
};

describe('Store Config', () => {
  describe('designTokensToCssVars', () => {
    it('generates palette CSS variables', () => {
      const vars = designTokensToCssVars(mockDesignTokens);
      expect(vars['--color-primary']).toBe('#D4356A');
      expect(vars['--color-secondary']).toBe('#F8E8EE');
      expect(vars['--color-accent']).toBe('#8B1A3A');
      expect(vars['--color-background']).toBe('#FFFAF5');
      expect(vars['--color-surface']).toBe('#FFF5EE');
      expect(vars['--color-text']).toBe('#1A1A2E');
      expect(vars['--color-text-muted']).toBe('#6B6B80');
    });

    it('generates font CSS variables', () => {
      const vars = designTokensToCssVars(mockDesignTokens);
      expect(vars['--font-display']).toBe('Playfair Display');
      expect(vars['--font-body']).toBe('DM Sans');
      expect(vars['--font-scale']).toBe('1');
    });

    it('maps radius tokens correctly', () => {
      const sharp = designTokensToCssVars({ ...mockDesignTokens, radius: 'sharp' });
      expect(sharp['--radius']).toBe('0px');

      const subtle = designTokensToCssVars({ ...mockDesignTokens, radius: 'subtle' });
      expect(subtle['--radius']).toBe('4px');

      const rounded = designTokensToCssVars({ ...mockDesignTokens, radius: 'rounded' });
      expect(rounded['--radius']).toBe('8px');

      const pill = designTokensToCssVars({ ...mockDesignTokens, radius: 'pill' });
      expect(pill['--radius']).toBe('9999px');
    });

    it('maps spacing tokens correctly', () => {
      const compact = designTokensToCssVars({ ...mockDesignTokens, spacing: 'compact' });
      expect(compact['--spacing-section']).toBe('1.5rem');

      const airy = designTokensToCssVars({ ...mockDesignTokens, spacing: 'airy' });
      expect(airy['--spacing-section']).toBe('4rem');

      const balanced = designTokensToCssVars({ ...mockDesignTokens, spacing: 'balanced' });
      expect(balanced['--spacing-section']).toBe('2.5rem');

      const ultra = designTokensToCssVars({ ...mockDesignTokens, spacing: 'ultra_minimal' });
      expect(ultra['--spacing-section']).toBe('1rem');
    });

    it('includes hero overlay opacity', () => {
      const vars = designTokensToCssVars(mockDesignTokens);
      expect(vars['--hero-overlay-opacity']).toBe('0.3');
    });

    it('handles all radius-sm and radius-lg derivations', () => {
      const sharp = designTokensToCssVars({ ...mockDesignTokens, radius: 'sharp' });
      expect(sharp['--radius-sm']).toBe('0px');
      expect(sharp['--radius-lg']).toBe('0px');

      const pill = designTokensToCssVars({ ...mockDesignTokens, radius: 'pill' });
      expect(pill['--radius-sm']).toBe('9999px');
      expect(pill['--radius-lg']).toBe('9999px');

      const rounded = designTokensToCssVars({ ...mockDesignTokens, radius: 'rounded' });
      expect(rounded['--radius-sm']).toBe('4px');
      expect(rounded['--radius-lg']).toBe('12px');
    });
  });

  describe('buildGoogleFontsUrl', () => {
    it('includes both display and body fonts', () => {
      const url = buildGoogleFontsUrl(mockDesignTokens);
      expect(url).toContain('Playfair%20Display');
      expect(url).toContain('DM%20Sans');
      expect(url).toContain('display=swap');
    });

    it('deduplicates when display and body are the same font', () => {
      const sameFont = {
        ...mockDesignTokens,
        fonts: { display: 'Inter', body: 'Inter', scale: 1.0 },
      };
      const url = buildGoogleFontsUrl(sameFont);
      // Should only contain Inter once
      const matches = url.match(/family=Inter/g);
      expect(matches?.length).toBe(1);
    });

    it('includes weight range', () => {
      const url = buildGoogleFontsUrl(mockDesignTokens);
      expect(url).toContain('wght@300;400;500;600;700;800');
    });
  });

  describe('getAnimationClass', () => {
    it('maps animation tokens to CSS classes', () => {
      expect(getAnimationClass('none')).toBe('');
      expect(getAnimationClass('fade')).toBe('animate-fade-in');
      expect(getAnimationClass('slide_up')).toBe('animate-slide-up');
      expect(getAnimationClass('bounce')).toBe('animate-bounce-in');
      expect(getAnimationClass('staggered')).toBe('animate-stagger');
    });

    it('returns empty string for unknown animation', () => {
      expect(getAnimationClass('unknown' as any)).toBe('');
    });
  });

  describe('getImageRatioClass', () => {
    it('maps ratio tokens to Tailwind classes', () => {
      expect(getImageRatioClass('3:4')).toBe('aspect-[3/4]');
      expect(getImageRatioClass('1:1')).toBe('aspect-square');
      expect(getImageRatioClass('4:3')).toBe('aspect-[4/3]');
      expect(getImageRatioClass('16:9')).toBe('aspect-video');
    });

    it('defaults to 3:4 for unknown ratio', () => {
      expect(getImageRatioClass('unknown')).toBe('aspect-[3/4]');
    });
  });
});
