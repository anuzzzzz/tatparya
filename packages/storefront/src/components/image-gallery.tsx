'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl as resolveImage, cn } from '@/lib/utils';
import { useStore } from './store-provider';

interface ImageGalleryProps {
  images: Array<{
    id?: string;
    originalUrl: string;
    heroUrl?: string;
    cardUrl?: string;
    thumbnailUrl?: string;
    alt?: string;
  }>;
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const { design } = useStore();
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        className="w-full aspect-[3/4] flex items-center justify-center"
        style={{ backgroundColor: design.palette.surface, borderRadius: 'var(--radius-lg)' }}
      >
        <span className="text-sm" style={{ color: design.palette.textMuted }}>
          No image available
        </span>
      </div>
    );
  }

  const mainImage = images[current]!;
  const mainSrc = resolveImage(mainImage.heroUrl || mainImage.originalUrl);

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative group">
        <div
          className={cn(
            'relative w-full aspect-[3/4] overflow-hidden',
            design.imageStyle === 'subtle_shadow' && 'img-subtle-shadow',
            design.imageStyle === 'border_frame' && 'img-border-frame',
          )}
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <img
            src={mainSrc}
            alt={mainImage.alt || 'Product image'}
            className="w-full h-full object-cover"
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots indicator (mobile) */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === current ? 'w-4 bg-white' : 'bg-white/50',
                )}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip (desktop) */}
      {images.length > 1 && (
        <div className="hidden md:flex gap-2 overflow-x-auto scrollbar-hide">
          {images.map((img, i) => {
            const thumbSrc = resolveImage(img.thumbnailUrl || img.cardUrl || img.originalUrl);
            return (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-all',
                  i === current ? 'opacity-100' : 'opacity-50 hover:opacity-80',
                )}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  borderColor: i === current ? design.palette.primary : 'transparent',
                }}
              >
                <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
