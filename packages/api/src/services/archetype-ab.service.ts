// ============================================================
// Archetype A/B Service v3.1
//
// Instead of selecting ONE archetype, returns the top 2
// for a given vertical + seller context. Enables:
//   - Seller preview: "Pick the layout you prefer"
//   - A/B serving: Show different layouts to visitors
//   - Data-driven validation: Track which converts better
//
// Uses the same scoring logic as selectArchetype but returns
// the top 2 candidates with their scores.
// ============================================================

import {
  selectArchetype,
  getArchetypesForVertical,
  type Archetype,
} from '../lib/archetypes.js';

export interface ABCandidate {
  archetype: Archetype;
  score: number;
  label: string; // e.g. "Layout A", "Layout B"
}

export interface ABSelection {
  candidates: ABCandidate[];
  vertical: string;
  totalAvailable: number;
}

/**
 * Returns the top 2 archetypes for a vertical, scored by
 * seller context compatibility.
 *
 * If the vertical has only 1 archetype, returns just that one.
 */
export function selectABArchetypes(
  vertical: string,
  sellerContext?: {
    audience?: string;
    priceRange?: { min: number; max: number };
    brandVibe?: string;
  },
): ABSelection {
  const norm = vertical === 'homedecor' ? 'home_decor' : vertical;
  const all = getArchetypesForVertical(norm);

  if (all.length === 0) {
    // Fallback to default
    const fallback = selectArchetype(vertical, sellerContext);
    return {
      candidates: [{ archetype: fallback, score: 1, label: 'Layout A' }],
      vertical: norm,
      totalAvailable: 0,
    };
  }

  if (all.length === 1) {
    return {
      candidates: [{ archetype: all[0]!, score: 1, label: 'Layout A' }],
      vertical: norm,
      totalAvailable: 1,
    };
  }

  // Score all candidates
  const scored = all.map(arch => ({
    archetype: arch,
    score: scoreArchetype(arch, sellerContext),
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Ensure the top 2 are meaningfully different (different section counts or hero types)
  let second = scored[1]!;
  if (scored.length > 2 && isTooSimilar(scored[0]!.archetype, scored[1]!.archetype)) {
    // Skip the nearly-identical second and use third
    for (let i = 2; i < scored.length; i++) {
      if (!isTooSimilar(scored[0]!.archetype, scored[i]!.archetype)) {
        second = scored[i]!;
        break;
      }
    }
  }

  return {
    candidates: [
      { ...scored[0]!, label: 'Layout A' },
      { ...second, label: 'Layout B' },
    ],
    vertical: norm,
    totalAvailable: all.length,
  };
}

// ============================================================
// Scoring — matches selectArchetype logic
// ============================================================

function scoreArchetype(
  arch: Archetype,
  sellerContext?: {
    audience?: string;
    priceRange?: { min: number; max: number };
    brandVibe?: string;
  },
): number {
  let score = Math.min(5, arch.cluster_size * 1.5) + (arch.quality_score / 100) * 3;

  if (!sellerContext) return score;

  if (sellerContext.audience) {
    for (const word of sellerContext.audience.toLowerCase().split(/\s+/)) {
      if (arch.fit.audiences.some(a => a.includes(word) || word.includes(a))) score += 3;
    }
  }

  if (sellerContext.priceRange) {
    const { min, max } = sellerContext.priceRange;
    const oMin = Math.max(min, arch.fit.priceFloor);
    const oMax = Math.min(max, arch.fit.priceCeiling);
    if (oMin <= oMax) score += Math.min(5, ((oMax - oMin) / (max - min || 1)) * 5);
  }

  if (sellerContext.brandVibe) {
    for (const word of sellerContext.brandVibe.toLowerCase().split(/\s+/)) {
      if (arch.fit.vibes.some(v => v.includes(word) || word.includes(v))) score += 2;
      if (arch.tags.some(t => t.includes(word) || word.includes(t))) score += 1;
    }
  }

  return score;
}

// ============================================================
// Similarity Check — avoid showing near-identical options
// ============================================================

function isTooSimilar(a: Archetype, b: Archetype): boolean {
  // Same hero type?
  const aHero = a.section_pattern.find(s => s.type.startsWith('hero_'))?.type;
  const bHero = b.section_pattern.find(s => s.type.startsWith('hero_'))?.type;
  const sameHero = aHero === bHero;

  // Same section count (±1)?
  const similarLength = Math.abs(a.section_pattern.length - b.section_pattern.length) <= 1;

  // Same tags?
  const sharedTags = a.tags.filter(t => b.tags.includes(t)).length;
  const tagOverlap = sharedTags / Math.max(a.tags.length, b.tags.length, 1);

  return sameHero && similarLength && tagOverlap > 0.7;
}
