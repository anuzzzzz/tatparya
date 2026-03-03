'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { ProductCard, ProductCardSkeleton } from './product-card';
import { cn } from '@/lib/utils';
import { getAnimationClass } from '@/lib/store-config';

interface ProductGridProps {
  products: Array<{
    id: string; name: string; slug: string; price: number;
    compareAtPrice?: number | null;
    images?: Array<{ heroUrl?: string; cardUrl?: string; thumbnailUrl?: string; originalUrl: string; alt?: string }>;
    tags?: string[];
  }>;
  title?: string;
  /** V2: Display variant — 'grid' | 'carousel' | 'editorial' */
  variant?: string;
  onAddToCart?: (name: string) => void;
}

export function ProductGrid({ products, title, variant = 'grid', onAddToCart }: ProductGridProps) {
  const { design } = useStore();
  const [revealRef, visible] = useReveal();
  const scrollRef = useRef<HTMLDivElement>(null);

  const collection = design.collection;
  const animClass = getAnimationClass(design.animation);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: design.palette.textMuted }}>No products found</p>
      </div>
    );
  }

  const scrollBy = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.querySelector('div')?.offsetWidth || 260;
    scrollRef.current.scrollBy({ left: dir === 'right' ? cardWidth + 16 : -(cardWidth + 16), behavior: 'smooth' });
  };

  // V2: Carousel variant — CSS scroll-snap, no JS carousel lib
  if (variant === 'carousel') {
    return (
      <section
        ref={revealRef as React.RefObject<HTMLDivElement>}
        className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">{title}</h2>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scrollBy('left')}
                className="w-9 h-9 flex items-center justify-center rounded-full border transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 15%, transparent)` }}
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollBy('right')}
                className="w-9 h-9 flex items-center justify-center rounded-full border transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2"
                style={{ borderColor: `color-mix(in srgb, ${design.palette.text} 15%, transparent)` }}
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        <div
          ref={scrollRef}
          className="scroll-snap-x scrollbar-hide gap-4 pb-2 -mx-4 px-4"
        >
          {products.map((product, i) => (
            <div key={product.id} className="w-[200px] sm:w-[240px] md:w-[260px]">
              <ProductCard product={product} index={i} onAddToCart={onAddToCart} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // V2: Editorial variant — 1 large + 4 small asymmetric grid
  if (variant === 'editorial' && products.length >= 5) {
    const [featured, ...rest] = products;
    return (
      <section
        ref={revealRef as React.RefObject<HTMLDivElement>}
        className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
      >
        {title && <h2 className="section-title mb-5">{title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {/* Featured large card */}
          <div className="col-span-2 md:col-span-1 md:row-span-2">
            <ProductCard product={featured!} index={0} onAddToCart={onAddToCart} />
          </div>
          {/* Remaining smaller cards */}
          {rest.slice(0, 4).map((product, i) => (
            <ProductCard key={product.id} product={product} index={i + 1} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>
    );
  }

  // Default: Uniform grid
  const mobileColsClass = collection.columns.mobile === 1 ? 'grid-cols-1' : collection.columns.mobile === 3 ? 'grid-cols-3' : 'grid-cols-2';
  const desktopColsClass = collection.columns.desktop === 2 ? 'md:grid-cols-2' : collection.columns.desktop === 3 ? 'md:grid-cols-3' : collection.columns.desktop === 5 ? 'md:grid-cols-5' : collection.columns.desktop === 6 ? 'md:grid-cols-6' : 'md:grid-cols-4';
  const gapClass = design.spacing === 'compact' || design.spacing === 'ultra_minimal' ? 'gap-2 md:gap-3' : design.spacing === 'airy' ? 'gap-5 md:gap-8' : 'gap-3 md:gap-5';

  return (
    <section
      ref={revealRef as React.RefObject<HTMLDivElement>}
      className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden', animClass)}
    >
      {title && <h2 className="section-title mb-5">{title}</h2>}
      <div className={cn('grid', mobileColsClass, desktopColsClass, gapClass)}>
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} onAddToCart={onAddToCart} />
        ))}
      </div>
    </section>
  );
}

/** Skeleton grid for loading states */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
