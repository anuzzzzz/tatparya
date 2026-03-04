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
    category?: string;
  };
  index?: number;
  /** V3: Card visual variant — editorial, minimal, bold */
  variant?: 'default' | 'editorial' | 'minimal' | 'bold';
  onAddToCart?: (productName: string) => void;
}

export function ProductCard({ product, index = 0, variant: explicitVariant, onAddToCart }: ProductCardProps) {
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

  // V3: Bespoke card styles from AI
  const bespokeCard = design.bespokeStyles?.card || {};
  const bespokeHoverTransform = bespokeCard.hoverTransform || 'translateY(-4px)';
  const bespokeShadowOnHover = bespokeCard.shadowOnHover || '0 8px 32px rgba(0,0,0,0.08)';

  // V3: Pick variant from explicit prop, config, or default
  const variant = explicitVariant || (cardConfig.style === 'editorial' ? 'editorial' : 'default');

  const linkUrl = `${storeUrl}/products/${product.slug}`;
  const staggerStyle = design.animation === 'staggered' ? { animationDelay: `${index * 60}ms` } : {};

  // V3: Category label from product data or first tag
  const categoryLabel = product.category || product.tags?.[0];

  return (
    <div
      className="group relative animate-slide-up"
      style={{
        ...staggerStyle,
        // V3: Bespoke hover transform on the whole card
        transform: hovered ? bespokeHoverTransform : 'translateY(0)',
        boxShadow: hovered ? bespokeShadowOnHover : '0 0 0 rgba(0,0,0,0)',
        transition: 'transform 0.4s var(--ease-spring), box-shadow 0.4s var(--ease-spring)',
        borderRadius: 'var(--radius)',
      }}
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
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}

          {/* Primary image */}
          <img
            src={imgSrc}
            alt={imgAlt}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
              hoverEffect === 'zoom' && hovered && 'scale-[1.06]',
              hoverEffect === 'lift' && hovered && '-translate-y-1',
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

          {/* V3: Badge system — discount (red) > tag (primary) */}
          {discount > 0 ? (
            <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold px-2.5 py-1 uppercase tracking-wider"
              style={{
                backgroundColor: '#E94560',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {discount}% off
            </span>
          ) : product.tags?.[0] ? (
            <span
              className="absolute top-2.5 left-2.5 z-10 text-[10px] font-semibold px-2.5 py-1"
              style={{
                backgroundColor: `color-mix(in srgb, ${design.palette.primary} 90%, transparent)`,
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {product.tags[0]}
            </span>
          ) : null}

          {/* V2: Wishlist heart (appears on hover) */}
          <button
            className={cn(
              'absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300',
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

          {/* V2: Quick-add button (slides up on hover) */}
          {showQuickAdd && (
            <button
              className="quick-add-btn absolute bottom-2.5 left-2.5 right-2.5 z-10 py-2.5 text-center text-xs font-semibold rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:ring-2"
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
        <div className="mt-3">
          {/* V3: Category label — small muted text above product name */}
          {variant === 'editorial' && categoryLabel && (
            <p className="text-[10px] uppercase tracking-widest font-medium mb-0.5"
              style={{ color: design.palette.primary, opacity: 0.8 }}>
              {categoryLabel}
            </p>
          )}

          <p
            className={cn(
              'leading-snug group-hover:opacity-70 transition-opacity',
              variant === 'editorial' ? 'text-sm font-semibold' : 'text-sm font-medium',
              variant === 'minimal' && 'text-xs',
            )}
            style={{
              color: design.palette.text,
              fontFamily: variant === 'editorial' ? 'var(--font-display)' : undefined,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {product.name}
          </p>

          {cardConfig.showPrice && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn('font-bold', variant === 'minimal' ? 'text-xs' : 'text-sm')}
                style={{ color: design.palette.primary }}
              >
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
      <div className="mt-3 space-y-1.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
      </div>
    </div>
  );
}
