'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart } from 'lucide-react';
import { useStore } from './store-provider';
import { formatPrice, discountPercent, imageUrl as resolveImage, cn } from '@/lib/utils';
import { getImageRatioClass } from '@/lib/store-config';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    images?: Array<{ heroUrl?: string; cardUrl?: string; thumbnailUrl?: string; originalUrl: string; alt?: string }>;
    tags?: string[];
  };
  index?: number;
  onAddToCart?: (productName: string) => void;
}

export function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  const { store, design } = useStore();
  const cardConfig = design.productCard;
  const cardTokens = design.cardTokens;
  const storeUrl = `/${store.slug}`;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const firstImage = product.images?.[0];
  const secondImage = product.images?.[1];
  const imgSrc = resolveImage(firstImage?.cardUrl || firstImage?.thumbnailUrl || firstImage?.originalUrl);
  const imgAlt = firstImage?.alt || product.name;
  const secondImgSrc = secondImage ? resolveImage(secondImage.cardUrl || secondImage.thumbnailUrl || secondImage.originalUrl) : null;

  const discount = product.compareAtPrice ? discountPercent(product.price, product.compareAtPrice) : 0;

  // V2: Vertical-aware ratios
  const vertical = store.vertical as string;
  const autoRatio = (vertical === 'jewellery' || vertical === 'beauty') ? '1:1' : cardConfig.imageRatio;
  const ratioClass = getImageRatioClass(autoRatio);

  // V2: Hover effect from Tier 3 tokens
  const hoverEffect = cardTokens?.hoverEffect || 'zoom';
  const showSecondImage = cardTokens?.showSecondImage !== false && !!secondImgSrc;
  const showQuickAdd = cardTokens?.showQuickAdd !== false && !!onAddToCart;

  const linkUrl = `${storeUrl}/products/${product.slug}`;

  // Stagger delay
  const staggerStyle = design.animation === 'staggered' ? { animationDelay: `${index * 60}ms` } : {};

  return (
    <div
      className="group relative animate-slide-up"
      style={staggerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={linkUrl} className="block">
        {/* Image container */}
        <div
          className={cn('relative overflow-hidden', ratioClass)}
          style={{ borderRadius: 'var(--radius)', backgroundColor: design.palette.surface }}
        >
          {/* Skeleton placeholder */}
          {!imgLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}

          {/* Primary image */}
          <img
            src={imgSrc}
            alt={imgAlt}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
              // V2: Hover zoom effect
              hoverEffect === 'zoom' && hovered && 'scale-[1.06]',
              hoverEffect === 'lift' && hovered && '-translate-y-1',
              // Cross-fade to second image
              showSecondImage && hovered && 'opacity-0',
            )}
            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />

          {/* V2: Second image on hover (cross-fade) */}
          {showSecondImage && (
            <img
              src={secondImgSrc!}
              alt={`${imgAlt} - alternate view`}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                hovered ? 'opacity-100' : 'opacity-0',
              )}
              loading="lazy"
            />
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <span className="badge-discount absolute top-2 left-2 z-10">{discount}% off</span>
          )}

          {/* Tag badge (if no discount) */}
          {product.tags?.[0] && !discount && (
            <span
              className="absolute top-2 left-2 z-10 text-[10px] font-semibold px-2 py-0.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${design.palette.primary} 90%, transparent)`,
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {product.tags[0]}
            </span>
          )}

          {/* V2: Wishlist heart (appears on hover) */}
          <button
            className={cn(
              'absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300',
              hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
            )}
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              transitionTimingFunction: 'var(--ease-spring)',
            }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            aria-label="Add to wishlist"
          >
            <Heart size={14} style={{ color: design.palette.text }} />
          </button>

          {/* V2: Quick-add button (slides up on hover with glassmorphism) */}
          {showQuickAdd && (
            <button
              className="quick-add-btn absolute bottom-2 left-2 right-2 z-10 py-2.5 text-center text-xs font-semibold rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: design.palette.text,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart?.(product.name);
              }}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag size={13} className="inline mr-1.5" style={{ verticalAlign: 'middle' }} />
              Add to Cart
            </button>
          )}
        </div>

        {/* Product info */}
        <div className="mt-2.5">
          <p
            className="text-sm font-medium leading-snug truncate group-hover:opacity-70 transition-opacity"
            style={{ color: design.palette.text }}
          >
            {product.name}
          </p>
          {cardConfig.showPrice && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold" style={{ color: design.palette.primary }}>
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs line-through" style={{ color: design.palette.textMuted }}>
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

/** V2: Product card skeleton for loading states */
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] skeleton rounded-[var(--radius)]" />
      <div className="mt-2.5 space-y-1.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
      </div>
    </div>
  );
}
