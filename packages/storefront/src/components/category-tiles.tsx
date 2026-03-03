'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn, imageUrl as resolveImage } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

interface CategoryTilesProps {
  categories: Category[];
  /** V2: 'tiles' shows visual cards, 'pills' shows text-only pills */
  variant?: 'tiles' | 'pills';
}

export function CategoryTiles({ categories, variant = 'tiles' }: CategoryTilesProps) {
  const { store, design } = useStore();
  const p = design.palette;
  const [revRef, visible] = useReveal();
  const storeUrl = `/${store.slug}`;

  if (categories.length === 0) return null;

  // V2: Text-only pills variant
  if (variant === 'pills') {
    return (
      <section
        ref={revRef as React.RefObject<HTMLElement>}
        className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
        style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}
      >
        <div className="container-store">
          <h2 className="section-title mb-5">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`${storeUrl}/collections/${cat.slug}`}
                className="flex-shrink-0 px-5 py-2.5 text-sm font-medium border transition-all duration-200 hover:opacity-70"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  borderColor: `color-mix(in srgb, ${p.text} 12%, transparent)`,
                  color: p.text,
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // V2: Visual tiles with image overlay — Myntra / Tanishq style
  return (
    <section
      ref={revRef as React.RefObject<HTMLElement>}
      className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
      style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}
    >
      <div className="container-store">
        <div className="text-center mb-8">
          <p className="eyebrow mb-2">Categories</p>
          <h2 className="section-title">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {categories.slice(0, 8).map((cat, i) => {
            const hasImage = !!cat.image;
            return (
              <Link
                key={cat.id}
                href={`${storeUrl}/collections/${cat.slug}`}
                className="group relative overflow-hidden animate-slide-up"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  aspectRatio: '4/3',
                  animationDelay: `${i * 60}ms`,
                  backgroundColor: p.surface,
                }}
              >
                {/* Image or colored placeholder */}
                {hasImage ? (
                  <img
                    src={resolveImage(cat.image)}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    style={{ transitionTimingFunction: 'var(--ease-spring)' }}
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(135deg, ${p.primary}20, ${p.secondary}60)`,
                  }} />
                )}

                {/* Gradient overlay for text readability */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
                  style={{
                    background: hasImage
                      ? `linear-gradient(180deg, transparent 40%, ${p.text}CC 100%)`
                      : 'transparent',
                    opacity: 0.8,
                  }}
                />

                {/* Category name */}
                <div className="absolute inset-0 flex items-end p-4">
                  <div>
                    <h3
                      className="text-sm md:text-base font-display font-semibold"
                      style={{ color: hasImage ? '#fff' : p.text }}
                    >
                      {cat.name}
                    </h3>
                    {cat.productCount && (
                      <p className="text-[11px] mt-0.5" style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : p.textMuted }}>
                        {cat.productCount} products
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
