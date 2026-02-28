'use client';

import React from 'react';
import { useStore } from './store-provider';
import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';
import { getAnimationClass } from '@/lib/store-config';

interface ProductGridProps {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    images?: Array<{ cardUrl?: string; thumbnailUrl?: string; originalUrl: string; alt?: string }>;
    tags?: string[];
  }>;
  title?: string;
}

export function ProductGrid({ products, title }: ProductGridProps) {
  const { design } = useStore();
  const collection = design.collection;
  const animClass = getAnimationClass(design.animation);

  // Column classes based on config
  const mobileColsClass =
    collection.columns.mobile === 1 ? 'grid-cols-1' :
    collection.columns.mobile === 3 ? 'grid-cols-3' : 'grid-cols-2';

  const desktopColsClass =
    collection.columns.desktop === 2 ? 'md:grid-cols-2' :
    collection.columns.desktop === 3 ? 'md:grid-cols-3' :
    collection.columns.desktop === 5 ? 'md:grid-cols-5' :
    collection.columns.desktop === 6 ? 'md:grid-cols-6' : 'md:grid-cols-4';

  const gapClass =
    design.spacing === 'compact' || design.spacing === 'ultra_minimal' ? 'gap-2 md:gap-3' :
    design.spacing === 'airy' ? 'gap-5 md:gap-8' : 'gap-3 md:gap-5';

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: design.palette.textMuted }}>
          No products found
        </p>
      </div>
    );
  }

  return (
    <section className={cn(animClass)}>
      {title && (
        <h2
          className="font-display text-xl md:text-2xl font-bold mb-6"
          style={{ color: design.palette.text }}
        >
          {title}
        </h2>
      )}
      <div className={cn('grid', mobileColsClass, desktopColsClass, gapClass)}>
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
