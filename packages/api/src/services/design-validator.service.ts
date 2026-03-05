// ============================================================
// Design Validator Service v3.1 — Third Pass (Optional)
//
// Director → Stylist → VALIDATOR
//
// Checks the Stylist output for:
//   1. WCAG AA contrast compliance (text/bg, primary/bg, overlay readability)
//   2. Typography consistency (Director decisions preserved)
//   3. Visual balance (palette coherence, spacing sanity)
//   4. Overlay gradient readability
//
// Returns a score (0-100) and an array of corrections.
// If score < threshold, caller can re-run Stylist with corrective prompt.
// ============================================================

import { contrastRatio, validateAndFixPalette } from './store-design-ai.service.js';

export interface ValidationResult {
  score: number;
  passed: boolean;
  corrections: ValidationCorrection[];
  autoFixed: string[];
  palette: any;
}

export interface ValidationCorrection {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

interface DirectorDecisions {
  typography: {
    heroFontSize: string;
    heroLineHeight: string;
    heroLetterSpacing: string;
    displayFont: string;
    bodyFont: string;
  };
  colorMood: string;
  signatureEffect: string;
  rhythm: number[];
  textureHint: string;
}

// ============================================================
// Main Validator
// ============================================================

export function validateDesignOutput(
  design: any,
  director: DirectorDecisions,
  threshold = 70,
): ValidationResult {
  const corrections: ValidationCorrection[] = [];
  const autoFixed: string[] = [];
  let score = 100;

  // ── 1. WCAG Contrast Compliance ──
  const palette = design.palette;
  if (palette?.text && palette?.background) {
    const textContrast = contrastRatio(palette.text, palette.background);
    if (textContrast < 4.5) {
      corrections.push({
        field: 'palette.text',
        issue: `Text/background contrast ${textContrast.toFixed(2)} < 4.5 AA minimum`,
        severity: 'error',
        suggestion: 'Darken text or lighten background',
      });
      score -= 15;
    } else if (textContrast < 7) {
      // AA passes, AAA doesn't — warning only
      score -= 3;
    }
  }

  if (palette?.textMuted && palette?.background) {
    const mutedContrast = contrastRatio(palette.textMuted, palette.background);
    if (mutedContrast < 3.0) {
      corrections.push({
        field: 'palette.textMuted',
        issue: `Muted text contrast ${mutedContrast.toFixed(2)} < 3.0`,
        severity: 'warning',
        suggestion: 'Adjust textMuted for large text minimum',
      });
      score -= 8;
    }
  }

  if (palette?.primary && palette?.background) {
    const primaryContrast = contrastRatio(palette.primary, palette.background);
    if (primaryContrast < 3.0) {
      corrections.push({
        field: 'palette.primary',
        issue: `Primary/background contrast ${primaryContrast.toFixed(2)} < 3.0`,
        severity: 'warning',
        suggestion: 'Adjust primary color for interactive elements',
      });
      score -= 8;
    }
  }

  // ── 2. Typography Consistency (Director decisions preserved?) ──
  const bespoke = design.bespokeStyles?.hero;
  if (bespoke) {
    if (bespoke.fontSize && bespoke.fontSize !== director.typography.heroFontSize) {
      corrections.push({
        field: 'bespokeStyles.hero.fontSize',
        issue: `Stylist changed hero font size from Director's "${director.typography.heroFontSize}" to "${bespoke.fontSize}"`,
        severity: 'error',
      });
      score -= 10;
      // Auto-fix: restore Director's value
      bespoke.fontSize = director.typography.heroFontSize;
      autoFixed.push('hero.fontSize restored to Director value');
    }

    if (bespoke.lineHeight && bespoke.lineHeight !== director.typography.heroLineHeight) {
      bespoke.lineHeight = director.typography.heroLineHeight;
      autoFixed.push('hero.lineHeight restored to Director value');
    }

    if (bespoke.letterSpacing && bespoke.letterSpacing !== director.typography.heroLetterSpacing) {
      bespoke.letterSpacing = director.typography.heroLetterSpacing;
      autoFixed.push('hero.letterSpacing restored to Director value');
    }

    // V3.2: Cap hero font size — extract max rem from clamp(), auto-fix >4rem to 3.8rem
    if (bespoke.fontSize && typeof bespoke.fontSize === 'string') {
      const clampMax = bespoke.fontSize.match(/clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)/);
      if (clampMax) {
        const maxRem = parseFloat(clampMax[1]!);
        if (maxRem > 4) {
          const fixed = bespoke.fontSize.replace(
            /clamp\(([^,]+),([^,]+),\s*[\d.]+rem\)/,
            'clamp($1,$2, 3.8rem)',
          );
          corrections.push({
            field: 'bespokeStyles.hero.fontSize',
            issue: `Hero font max ${maxRem}rem exceeds 4rem cap`,
            severity: 'warning',
            suggestion: `Capped to 3.8rem: ${fixed}`,
          });
          bespoke.fontSize = fixed;
          autoFixed.push(`hero.fontSize capped: ${maxRem}rem → 3.8rem`);
          score -= 3;
        }
      }
    }
  }

  if (design.fonts) {
    if (design.fonts.display !== director.typography.displayFont) {
      corrections.push({
        field: 'fonts.display',
        issue: `Stylist changed display font from "${director.typography.displayFont}" to "${design.fonts.display}"`,
        severity: 'error',
      });
      design.fonts.display = director.typography.displayFont;
      autoFixed.push('display font restored to Director value');
      score -= 5;
    }
    if (design.fonts.body !== director.typography.bodyFont) {
      design.fonts.body = director.typography.bodyFont;
      autoFixed.push('body font restored to Director value');
      score -= 3;
    }
  }

  // ── 3. Visual Balance — Palette Coherence ──
  if (palette?.background && palette?.surface) {
    const bgSurfaceContrast = contrastRatio(palette.background, palette.surface);
    if (bgSurfaceContrast > 2.5) {
      corrections.push({
        field: 'palette.surface',
        issue: `Surface too different from background (contrast ${bgSurfaceContrast.toFixed(2)}). Should be subtle variation.`,
        severity: 'warning',
      });
      score -= 5;
    }
    if (bgSurfaceContrast < 1.03) {
      corrections.push({
        field: 'palette.surface',
        issue: 'Surface indistinguishable from background. Needs slight tint.',
        severity: 'warning',
      });
      score -= 3;
    }
  }

  // ── 4. Overlay Gradient Readability ──
  if (bespoke?.overlayGradient && typeof bespoke.overlayGradient === 'string') {
    const grad = bespoke.overlayGradient;
    // Check if gradient has at least some opacity (not fully transparent)
    const hasOpacity = /rgba?\([^)]+\)|#[a-f0-9]{8}/i.test(grad) || /#[a-f0-9]{6}[a-f0-9]{2}/i.test(grad);
    if (!hasOpacity && !grad.includes('transparent')) {
      corrections.push({
        field: 'bespokeStyles.hero.overlayGradient',
        issue: 'Overlay gradient may be fully opaque, blocking hero image',
        severity: 'warning',
        suggestion: 'Add transparency stops (e.g., #1C191744)',
      });
      score -= 5;
    }
  }

  // ── 5. Rhythm Sanity ──
  if (director.rhythm && director.rhythm.length > 0) {
    const allSame = director.rhythm.every(v => v === director.rhythm[0]);
    if (allSame) {
      corrections.push({
        field: 'rhythm',
        issue: 'All rhythm values are identical — no spatial variety',
        severity: 'warning',
        suggestion: 'Vary rhythm: at least 3 values < 0.5 and 2 > 1.3',
      });
      score -= 5;
    }

    const hasCompressed = director.rhythm.some(v => v < 0.5);
    const hasExpanded = director.rhythm.some(v => v > 1.3);
    if (!hasCompressed || !hasExpanded) {
      corrections.push({
        field: 'rhythm',
        issue: `Missing ${!hasCompressed ? 'compressed (<0.5)' : 'expanded (>1.3)'} rhythm values`,
        severity: 'warning',
      });
      score -= 3;
    }
  }

  // ── 6. Color Mood Alignment ──
  if (palette?.background && director.colorMood) {
    const bgLum = relativeLuminance(palette.background);
    if (director.colorMood === 'dark-luxury' && bgLum > 0.4) {
      corrections.push({
        field: 'palette.background',
        issue: `Director set "dark-luxury" mood but background is light (luminance ${bgLum.toFixed(2)})`,
        severity: 'error',
        suggestion: 'Background should be dark (#1A1714 range)',
      });
      score -= 12;
    }
    if (director.colorMood === 'clean-minimal' && bgLum < 0.8) {
      corrections.push({
        field: 'palette.background',
        issue: `Director set "clean-minimal" mood but background is dark (luminance ${bgLum.toFixed(2)})`,
        severity: 'warning',
        suggestion: 'Background should be near-white',
      });
      score -= 8;
    }
  }

  // Auto-fix palette via existing WCAG fixer
  const fixedPalette = palette ? validateAndFixPalette(palette) : palette;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= threshold,
    corrections,
    autoFixed,
    palette: fixedPalette,
  };
}

// ============================================================
// Build corrective prompt for Stylist re-run
// ============================================================

export function buildCorrectiveGuidance(result: ValidationResult): string {
  if (result.passed) return '';

  const errors = result.corrections.filter(c => c.severity === 'error');
  const warnings = result.corrections.filter(c => c.severity === 'warning');

  let guidance = 'CORRECTIONS REQUIRED from validation pass:\n';
  for (const err of errors) {
    guidance += `- ERROR in ${err.field}: ${err.issue}${err.suggestion ? `. Fix: ${err.suggestion}` : ''}\n`;
  }
  for (const warn of warnings.slice(0, 3)) {
    guidance += `- WARNING in ${warn.field}: ${warn.issue}${warn.suggestion ? `. Fix: ${warn.suggestion}` : ''}\n`;
  }
  guidance += '\nFix ALL errors. Warnings are optional but improve quality.\n';

  return guidance;
}

// ============================================================
// Helpers
// ============================================================

function relativeLuminance(hex: string): number {
  if (!hex || hex.length < 7) return 0.5;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linear = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}
