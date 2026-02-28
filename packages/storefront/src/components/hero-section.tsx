'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';
import { getAnimationClass } from '@/lib/store-config';

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
}

export function HeroSection({
  title,
  subtitle,
  ctaText = 'Shop Now',
  ctaLink,
  imageUrl,
}: HeroProps) {
  const { store, design } = useStore();
  const hero = design.hero;
  const storeUrl = `/${store.slug}`;
  const link = ctaLink || `${storeUrl}/collections/all`;
  const heading = title || store.name;
  const sub = subtitle || store.description || 'Discover our latest collection';
  const animClass = getAnimationClass(design.animation);

  const heightClass =
    hero.height === 'full' ? 'min-h-[85vh]' :
    hero.height === 'half' ? 'min-h-[50vh]' :
    'min-h-[40vh]';

  // Full bleed — image background with overlay
  if (hero.style === 'full_bleed' || hero.style === 'parallax') {
    return (
      <section
        className={cn('relative flex items-center justify-center', heightClass, animClass)}
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !imageUrl ? design.palette.surface : undefined,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: design.palette.text,
            opacity: imageUrl ? hero.overlayOpacity : 0,
          }}
        />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <h1
            className="font-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4"
            style={{ color: imageUrl ? '#fff' : design.palette.text }}
          >
            {heading}
          </h1>
          <p
            className="text-base md:text-lg mb-8 max-w-md mx-auto"
            style={{ color: imageUrl ? 'rgba(255,255,255,0.85)' : design.palette.textMuted }}
          >
            {sub}
          </p>
          <Link
            href={link}
            className={cn('btn-primary text-sm md:text-base', imageUrl && 'bg-white !text-black')}
            style={imageUrl ? { borderRadius: `var(--radius)` } : undefined}
          >
            {ctaText}
          </Link>
        </div>
      </section>
    );
  }

  // Split image
  if (hero.style === 'split_image') {
    return (
      <section className={cn('grid md:grid-cols-2 items-center', heightClass, animClass)}>
        <div className="px-6 md:px-12 py-12 md:py-20">
          <h1
            className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4"
            style={{ color: design.palette.text }}
          >
            {heading}
          </h1>
          <p className="text-base md:text-lg mb-8" style={{ color: design.palette.textMuted }}>
            {sub}
          </p>
          <Link href={link} className="btn-primary">
            {ctaText}
          </Link>
        </div>
        {imageUrl ? (
          <div className="h-full min-h-[300px] md:min-h-0" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div className="h-full min-h-[300px] md:min-h-0" style={{ backgroundColor: design.palette.secondary }} />
        )}
      </section>
    );
  }

  // Gradient
  if (hero.style === 'gradient') {
    return (
      <section
        className={cn('flex items-center justify-center', heightClass, animClass)}
        style={{
          background: `linear-gradient(135deg, ${design.palette.primary}, ${design.palette.secondary}, ${design.palette.accent})`,
        }}
      >
        <div className="text-center px-6 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-white">
            {heading}
          </h1>
          <p className="text-base md:text-lg mb-8 text-white/80 max-w-md mx-auto">
            {sub}
          </p>
          <Link href={link} className="btn-primary bg-white !text-black">
            {ctaText}
          </Link>
        </div>
      </section>
    );
  }

  // Minimal text (default fallback)
  return (
    <section
      className={cn('flex items-center justify-center py-16 md:py-24', animClass)}
      style={{ backgroundColor: design.palette.surface }}
    >
      <div className="text-center px-6 max-w-2xl mx-auto">
        <h1
          className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4"
          style={{ color: design.palette.text }}
        >
          {heading}
        </h1>
        <p className="text-base md:text-lg mb-8" style={{ color: design.palette.textMuted }}>
          {sub}
        </p>
        <Link href={link} className="btn-primary">
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
