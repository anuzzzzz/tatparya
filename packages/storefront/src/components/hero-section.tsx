'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';
import { getAnimationClass } from '@/lib/store-config';
import { ChevronDown } from 'lucide-react';

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
  const { store, design, config } = useStore();
  const hero = design.hero;
  const storeUrl = `/${store.slug}`;
  const link = ctaLink || `${storeUrl}/collections/all`;

  // Use AI-generated copy if available, with cascading fallbacks
  const heading = title || (config as any).heroTagline || store.name;
  const sub = subtitle || (config as any).heroSubtext || store.description || 'Discover our latest collection';
  const animClass = getAnimationClass(design.animation);

  // Mobile-aware height: cap at 65vh on mobile for full heroes so products peek
  const heightClass =
    hero.height === 'full' ? 'min-h-[65vh] md:min-h-[85vh]' :
    hero.height === 'half' ? 'min-h-[45vh] md:min-h-[50vh]' :
    'min-h-[35vh] md:min-h-[40vh]';

  // Full bleed — image background with overlay
  if (hero.style === 'full_bleed' || hero.style === 'parallax') {
    return (
      <section
        className={cn('relative flex items-center justify-center', heightClass, animClass)}
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: hero.style === 'parallax' ? 'fixed' : undefined,
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
            className="text-sm md:text-lg mb-8 max-w-md mx-auto leading-relaxed"
            style={{ color: imageUrl ? 'rgba(255,255,255,0.85)' : design.palette.textMuted }}
          >
            {sub}
          </p>
          <Link
            href={link}
            className={cn('btn-primary text-sm md:text-base', imageUrl && 'bg-white !text-black')}
            style={imageUrl ? { borderRadius: 'var(--radius)' } : undefined}
          >
            {ctaText}
          </Link>
        </div>

        {/* Scroll indicator on tall heroes */}
        {hero.height === 'full' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-50">
            <ChevronDown size={24} style={{ color: imageUrl ? '#fff' : design.palette.textMuted }} />
          </div>
        )}
      </section>
    );
  }

  // Split image
  if (hero.style === 'split_image') {
    return (
      <section className={cn('grid md:grid-cols-2 items-center min-h-[40vh] md:min-h-[50vh]', animClass)}>
        <div className="px-6 md:px-12 py-12 md:py-20">
          <h1
            className="font-display text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4"
            style={{ color: design.palette.text }}
          >
            {heading}
          </h1>
          <p className="text-sm md:text-base mb-8 leading-relaxed" style={{ color: design.palette.textMuted }}>
            {sub}
          </p>
          <Link href={link} className="btn-primary text-sm">
            {ctaText}
          </Link>
        </div>
        {imageUrl ? (
          <div className="h-full min-h-[250px] md:min-h-0" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div className="h-full min-h-[250px] md:min-h-0" style={{ backgroundColor: design.palette.secondary }} />
        )}
      </section>
    );
  }

  // Gradient
  if (hero.style === 'gradient') {
    return (
      <section
        className={cn('flex items-center justify-center min-h-[40vh] md:min-h-[50vh]', animClass)}
        style={{
          background: `linear-gradient(135deg, ${design.palette.primary}, ${design.palette.secondary}, ${design.palette.accent})`,
        }}
      >
        <div className="text-center px-6 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-white">
            {heading}
          </h1>
          <p className="text-sm md:text-lg mb-8 text-white/80 max-w-md mx-auto leading-relaxed">
            {sub}
          </p>
          <Link href={link} className="btn-primary bg-white !text-black text-sm">
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
        <p className="text-sm md:text-lg mb-8 leading-relaxed" style={{ color: design.palette.textMuted }}>
          {sub}
        </p>
        <Link href={link} className="btn-primary text-sm">
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
