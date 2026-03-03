'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  imageUrl?: string;
  images?: string[];
  /** V2: Which hero variant to render */
  variant?: string;
}

export function HeroSection({ imageUrl, images, variant: explicitVariant }: HeroProps) {
  const { store, design, config } = useStore();
  const heroConfig = design.hero;
  const heroTokens = design.heroTokens;
  const storeUrl = `/${store.slug}`;

  const heading = (config as any).heroTagline || store.name;
  const sub = (config as any).heroSubtext || store.description || 'Discover our latest collection';
  const link = `${storeUrl}/collections/all`;

  // Use explicit variant, or map from hero.style config
  const variant = explicitVariant || mapHeroStyle(heroConfig.style);

  switch (variant) {
    case 'slideshow':
      return <HeroSlideshow heading={heading} sub={sub} link={link} imageUrl={imageUrl} images={images} />;
    case 'bento':
      return <HeroBento heading={heading} sub={sub} link={link} images={images} imageUrl={imageUrl} />;
    case 'split':
      return <HeroSplit heading={heading} sub={sub} link={link} imageUrl={imageUrl} />;
    case 'minimal':
      return <HeroMinimal heading={heading} sub={sub} link={link} />;
    case 'full_bleed':
    default:
      return <HeroFullBleed heading={heading} sub={sub} link={link} imageUrl={imageUrl} />;
  }
}

function mapHeroStyle(style: string): string {
  const map: Record<string, string> = {
    full_bleed: 'full_bleed', parallax: 'full_bleed',
    split_image: 'split',
    carousel: 'slideshow',
    minimal_text: 'minimal',
    gradient: 'full_bleed',
    video: 'full_bleed',
  };
  return map[style] || 'full_bleed';
}

// ============================================================
// HERO: Full Bleed — Cinematic gradient overlay
// ============================================================
function HeroFullBleed({ heading, sub, link, imageUrl }: { heading: string; sub: string; link: string; imageUrl?: string }) {
  const { design } = useStore();
  const p = design.palette;
  const heroTokens = design.heroTokens;
  const bespoke = design.bespokeStyles?.hero || {};
  const height = design.hero.height === 'full' ? 'min-h-[65vh] md:min-h-[85vh]' : design.hero.height === 'half' ? 'min-h-[45vh] md:min-h-[50vh]' : 'min-h-[35vh]';

  // V3: Use bespoke overlay gradient if AI generated one, else fall back to Tier 3 token
  const overlayGradient = bespoke.overlayGradient
    ? bespoke.overlayGradient
    : heroTokens?.overlayGradient === 'center-vignette'
      ? `radial-gradient(ellipse at center, transparent 30%, ${p.text}CC 100%)`
      : `linear-gradient(180deg, ${p.text}33 0%, ${p.text}11 25%, ${p.text}66 65%, ${p.text}DD 100%)`;

  // V3: Bespoke hero typography
  const heroFontSize = bespoke.fontSize || 'clamp(2rem, 6vw, 3.5rem)';
  const heroLineHeight = bespoke.lineHeight || '1.05';
  const heroLetterSpacing = bespoke.letterSpacing || '-0.03em';
  const heroTextShadow = bespoke.textShadow || (imageUrl ? '0 4px 32px rgba(0,0,0,0.3)' : 'none');

  return (
    <section
      className={cn('relative flex items-end', height, 'animate-fade-in')}
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: !imageUrl ? p.surface : undefined,
      }}
    >
      {imageUrl && <div className="absolute inset-0" style={{ background: overlayGradient }} />}
      <div className="relative z-10 px-6 pb-12 md:pb-16 max-w-xl" style={{ animation: 'slide-up 0.8s var(--ease-spring) 0.2s both' }}>
        <h1
          className="font-display font-bold mb-4"
          style={{
            color: imageUrl ? '#fff' : p.text,
            fontSize: heroFontSize,
            lineHeight: heroLineHeight,
            letterSpacing: heroLetterSpacing,
            textShadow: heroTextShadow,
          }}
        >
          {heading}
        </h1>
        <p className="text-sm md:text-lg mb-8 max-w-md leading-relaxed" style={{ color: imageUrl ? 'rgba(255,255,255,0.8)' : p.textMuted }}>
          {sub}
        </p>
        <div className="flex gap-3">
          <Link href={link} className={cn('btn-primary text-sm md:text-base', imageUrl && '!bg-white !text-black')}>
            Shop Collection
          </Link>
          <Link href={link} className="btn-secondary text-sm md:text-base !border-white/30 !text-white" style={{ display: imageUrl ? undefined : 'none' }}>
            Our Story
          </Link>
        </div>
      </div>
      {/* Scroll hint */}
      {design.hero.height === 'full' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce opacity-50">
          <ChevronDown size={24} style={{ color: imageUrl ? '#fff' : p.textMuted }} />
        </div>
      )}
    </section>
  );
}

// ============================================================
// HERO: Slideshow — Auto-advancing with crossfade
// ============================================================
function HeroSlideshow({ heading, sub, link, imageUrl, images }: { heading: string; sub: string; link: string; imageUrl?: string; images?: string[] }) {
  const { design } = useStore();
  const p = design.palette;
  const bespoke = design.bespokeStyles?.hero || {};
  const allImages = images?.length ? images : imageUrl ? [imageUrl] : [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % allImages.length), 4500);
    return () => clearInterval(timer);
  }, [allImages.length]);

  if (allImages.length === 0) {
    return <HeroMinimal heading={heading} sub={sub} link={link} />;
  }

  // V3: Bespoke overlay and typography
  const overlayGradient = bespoke.overlayGradient
    || `linear-gradient(180deg, ${p.text}33 0%, ${p.text}11 25%, ${p.text}66 65%, ${p.text}DD 100%)`;
  const heroFontSize = bespoke.fontSize || 'clamp(2rem, 6vw, 3.5rem)';
  const heroLineHeight = bespoke.lineHeight || '1.05';
  const heroLetterSpacing = bespoke.letterSpacing || '-0.03em';

  return (
    <section className="relative min-h-[65vh] md:min-h-[80vh] overflow-hidden">
      {/* Slides with crossfade */}
      {allImages.map((img, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out" style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}>
          <img
            src={img}
            alt=""
            className="w-full h-full object-cover"
            style={{ transform: i === current ? 'scale(1.04)' : 'scale(1)', transition: 'transform 8s ease' }}
          />
        </div>
      ))}
      {/* Bespoke overlay */}
      <div className="absolute inset-0 z-[2]" style={{ background: overlayGradient }} />

      <div className="relative z-10 flex flex-col justify-end h-[65vh] md:h-[80vh] px-6 pb-12 md:pb-16">
        <div className="max-w-xl" style={{ animation: 'slide-up 0.8s var(--ease-spring) 0.2s both' }}>
          <h1
            className="font-display font-bold text-white mb-4"
            style={{
              fontSize: heroFontSize,
              lineHeight: heroLineHeight,
              letterSpacing: heroLetterSpacing,
              textShadow: bespoke.textShadow || '0 4px 32px rgba(0,0,0,0.3)',
            }}
          >
            {heading}
          </h1>
          <p className="text-sm md:text-base text-white/75 mb-8 max-w-md leading-relaxed">{sub}</p>
          <Link href={link} className="btn-primary !bg-white !text-black text-sm">Shop Collection</Link>
        </div>
        {/* Slide dots */}
        {allImages.length > 1 && (
          <div className="flex gap-2 mt-8">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="h-1 rounded-full transition-all duration-400"
                style={{
                  width: i === current ? 28 : 8,
                  backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                  transitionTimingFunction: 'var(--ease-spring)',
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// HERO: Bento — Asymmetric image grid (jewellery/lifestyle feel)
// ============================================================
function HeroBento({ heading, sub, link, images, imageUrl }: { heading: string; sub: string; link: string; images?: string[]; imageUrl?: string }) {
  const { design } = useStore();
  const p = design.palette;
  const [revRef, vis] = useReveal(0.1);
  const allImages = images?.length ? images : imageUrl ? [imageUrl, imageUrl, imageUrl] : [];

  return (
    <section style={{ backgroundColor: p.surface, padding: '48px 0 0' }}>
      <div className="container-store">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.05] mb-4" style={{ color: p.text, letterSpacing: '-0.02em' }}>
            {heading}
          </h1>
          <p className="text-sm md:text-base mb-6 max-w-md mx-auto" style={{ color: p.textMuted }}>{sub}</p>
          <Link href={link} className="btn-primary text-sm">Shop Now</Link>
        </div>
        {allImages.length >= 3 && (
          <div
            ref={revRef as React.RefObject<HTMLDivElement>}
            className={cn('grid grid-cols-2 md:grid-cols-3 gap-1.5 min-h-[40vh] md:min-h-[55vh] transition-all duration-700', vis ? 'reveal-visible' : 'reveal-hidden')}
          >
            <div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-[var(--radius)] relative">
              <img src={allImages[0]} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
            </div>
            <div className="overflow-hidden rounded-[var(--radius)]">
              <img src={allImages[1]} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
            </div>
            <div className="overflow-hidden rounded-[var(--radius)]">
              <img src={allImages[2]} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
            </div>
          </div>
        )}
      </div>
      <div className="divider-gradient mt-12" />
    </section>
  );
}

// ============================================================
// HERO: Split — Image right, text left (beauty/organic feel)
// ============================================================
function HeroSplit({ heading, sub, link, imageUrl }: { heading: string; sub: string; link: string; imageUrl?: string }) {
  const { design } = useStore();
  const p = design.palette;

  return (
    <section className="grid md:grid-cols-2 items-center min-h-[40vh] md:min-h-[50vh]">
      <div className="px-6 md:px-12 py-12 md:py-20" style={{ animation: 'slide-in-left 0.7s var(--ease-spring) both' }}>
        <p className="eyebrow mb-3">New Collection</p>
        <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold leading-[1.05] mb-4" style={{ color: p.text }}>
          {heading}
        </h1>
        <p className="text-sm md:text-base mb-8 leading-relaxed max-w-sm" style={{ color: p.textMuted }}>{sub}</p>
        <div className="flex gap-3">
          <Link href={link} className="btn-primary text-sm">Shop Now</Link>
          <Link href={link} className="btn-secondary text-sm">Learn More</Link>
        </div>
      </div>
      {imageUrl ? (
        <div className="h-full min-h-[250px] md:min-h-0 relative overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-full min-h-[250px]" style={{ backgroundColor: p.secondary }} />
      )}
    </section>
  );
}

// ============================================================
// HERO: Minimal — Text only, clean
// ============================================================
function HeroMinimal({ heading, sub, link }: { heading: string; sub: string; link: string }) {
  const { design } = useStore();
  const p = design.palette;

  return (
    <section
      className="flex items-center justify-center py-16 md:py-24 animate-fade-in"
      style={{ backgroundColor: p.surface }}
    >
      <div className="text-center px-6 max-w-xl">
        <p className="eyebrow mb-3">New Collection</p>
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.05] mb-4" style={{ color: p.text }}>
          {heading}
        </h1>
        <p className="text-sm md:text-lg mb-8 leading-relaxed" style={{ color: p.textMuted }}>{sub}</p>
        <Link href={link} className="btn-primary text-sm">Explore</Link>
      </div>
    </section>
  );
}
