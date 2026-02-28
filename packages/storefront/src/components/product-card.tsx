'use client';

import React from 'react';
import Link from 'next/link';
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
    images?: Array<{ cardUrl?: string; thumbnailUrl?: string; originalUrl: string; alt?: string }>;
    tags?: string[];
  };
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { store, design } = useStore();
  const cardConfig = design.productCard;
  const storeUrl = `/${store.slug}`;

  const firstImage = product.images?.[0];
  const imgSrc = resolveImage(firstImage?.cardUrl || firstImage?.thumbnailUrl || firstImage?.originalUrl);
  const imgAlt = firstImage?.alt || product.name;

  const discount = product.compareAtPrice
    ? discountPercent(product.price, product.compareAtPrice)
    : 0;

  const ratioClass = getImageRatioClass(cardConfig.imageRatio);

  // Image style classes
  const imageStyleClass = cn(
    design.imageStyle === 'hover_zoom' && 'img-hover-zoom',
    design.imageStyle === 'subtle_shadow' && 'img-subtle-shadow',
    design.imageStyle === 'border_frame' && 'img-border-frame',
    design.imageStyle === 'rounded' && 'rounded-lg overflow-hidden',
  );

  // Stagger delay for animations
  const staggerDelay = design.animation === 'staggered' ? { animationDelay: `${index * 60}ms` } : {};

  const linkUrl = `${storeUrl}/products/${product.slug}`;

  // Compact style
  if (cardConfig.style === 'compact') {
    return (
      <Link href={linkUrl} className="group block" style={staggerDelay}>
        <div className={cn('relative', ratioClass, imageStyleClass, 'bg-gray-100')} style={{ borderRadius: 'var(--radius)' }}>
          <img
            src={imgSrc}
            alt={imgAlt}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            style={{ borderRadius: 'var(--radius)' }}
          />
          {discount > 0 && (
            <span className="badge-discount absolute top-2 left-2">{discount}% off</span>
          )}
        </div>
        <div className="mt-2">
          <p className="text-xs font-medium truncate" style={{ color: design.palette.text }}>
            {product.name}
          </p>
          {cardConfig.showPrice && (
            <p className="text-xs mt-0.5" style={{ color: design.palette.primary }}>
              {formatPrice(product.price)}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Editorial style
  if (cardConfig.style === 'editorial') {
    return (
      <Link href={linkUrl} className="group block" style={staggerDelay}>
        <div className={cn('relative', ratioClass, imageStyleClass, 'bg-gray-100')} style={{ borderRadius: 'var(--radius-lg)' }}>
          <img
            src={imgSrc}
            alt={imgAlt}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
          {discount > 0 && (
            <span className="badge-discount absolute top-3 left-3">{discount}% off</span>
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-display text-base md:text-lg font-semibold leading-snug group-hover:opacity-70 transition-opacity" style={{ color: design.palette.text }}>
            {product.name}
          </h3>
          {cardConfig.showPrice && (
            <div className="flex items-center gap-2 mt-1.5">
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
    );
  }

  // Hover reveal style
  if (cardConfig.style === 'hover_reveal') {
    return (
      <Link href={linkUrl} className="group block" style={staggerDelay}>
        <div
          className={cn('relative overflow-hidden', ratioClass, 'bg-gray-100')}
          style={{ borderRadius: 'var(--radius)' }}
        >
          <img
            src={imgSrc}
            alt={imgAlt}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {discount > 0 && (
            <span className="badge-discount absolute top-2 left-2">{discount}% off</span>
          )}
          {/* Reveal overlay on hover */}
          <div
            className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)` }}
          >
            <div className="p-4 w-full">
              <p className="text-white text-sm font-medium truncate">{product.name}</p>
              {cardConfig.showPrice && (
                <p className="text-white/90 text-sm font-bold mt-0.5">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Visible below image on mobile */}
        <div className="md:hidden mt-2">
          <p className="text-sm font-medium truncate">{product.name}</p>
          {cardConfig.showPrice && (
            <p className="text-sm mt-0.5" style={{ color: design.palette.primary }}>
              {formatPrice(product.price)}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Default: Minimal style
  return (
    <Link href={linkUrl} className="group block" style={staggerDelay}>
      <div className={cn('relative', ratioClass, imageStyleClass, 'bg-gray-100')} style={{ borderRadius: 'var(--radius)' }}>
        <img
          src={imgSrc}
          alt={imgAlt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          style={{ borderRadius: 'var(--radius)' }}
        />
        {discount > 0 && (
          <span className="badge-discount absolute top-2 left-2">{discount}% off</span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium leading-snug group-hover:opacity-70 transition-opacity truncate" style={{ color: design.palette.text }}>
          {product.name}
        </h3>
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
  );
}
