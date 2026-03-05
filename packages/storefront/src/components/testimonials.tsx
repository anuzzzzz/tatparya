'use client';

import React, { useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

interface Testimonial {
  text: string;
  name: string;
  city?: string;
  rating?: number;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { text: 'Amazing quality! Will definitely order again.', name: 'Priya S.', city: 'Mumbai', rating: 5 },
  { text: 'Fast delivery and beautiful packaging.', name: 'Rahul M.', city: 'Delhi', rating: 5 },
  { text: 'Exactly as shown. Love it!', name: 'Anita K.', city: 'Bangalore', rating: 5 },
];

// ============================================================
// Variant Selection — Director/archetype can set this, or
// we infer from the store's vertical + colorMood
// ============================================================

type TestimonialVariant = 'luxury' | 'organic' | 'modern';

function inferVariant(vertical: string, colorMood?: string): TestimonialVariant {
  if (colorMood === 'dark-luxury') return 'luxury';
  if (colorMood === 'clean-minimal' || colorMood === 'warm-earthy') return 'organic';
  if (vertical === 'jewellery') return 'luxury';
  if (vertical === 'beauty' || vertical === 'wellness') return 'organic';
  return 'modern';
}

interface TestimonialsProps {
  testimonials?: Testimonial[];
  variant?: 'carousel' | 'grid';
  /** V3.1: Per-section visual variant — overrides auto-inference */
  designVariant?: TestimonialVariant;
}

export function Testimonials({ testimonials: propTestimonials, variant = 'carousel', designVariant }: TestimonialsProps) {
  const { store, design, config } = useStore();
  // V3.2: Use AI-generated testimonials from config, then props, then defaults
  const storeContent = (config as any)?.content;
  const testimonials: Testimonial[] = propTestimonials || storeContent?.testimonials || DEFAULT_TESTIMONIALS;
  const p = design.palette;
  const bespoke = design.bespokeStyles as any;
  const [revRef, vis] = useReveal();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Infer design variant from vertical + mood if not explicitly set
  const storeConfig = config as any;
  const colorMood = storeConfig?.directorDecisions?.colorMood || '';
  const vertical = (store as any).vertical || 'general';
  const dv = designVariant || inferVariant(vertical, colorMood);

  const scrollBy = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 356 : -356, behavior: 'smooth' });
  };

  return (
    <section
      ref={revRef as React.RefObject<HTMLElement>}
      className={cn('py-12 md:py-16 transition-all duration-600', vis ? 'reveal-visible' : 'reveal-hidden')}
      style={{
        backgroundColor: dv === 'luxury' ? p.surface : p.background,
      }}
    >
      <div className="container-store">
        {/* Section header — variant-aware */}
        <SectionHeader variant={dv} palette={p} />

        {variant === 'carousel' ? (
          <div className="relative">
            <div ref={scrollRef} className="scroll-snap-x scrollbar-hide gap-4 pb-2 -mx-4 px-4">
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} testimonial={t} palette={p} design={design} index={i} designVariant={dv} bespoke={bespoke} />
              ))}
            </div>
            <div className="hidden md:flex items-center justify-center gap-2 mt-6">
              <NavButton onClick={() => scrollBy('left')} palette={p} variant={dv} direction="left" />
              <NavButton onClick={() => scrollBy('right')} palette={p} variant={dv} direction="right" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} palette={p} design={design} index={i} designVariant={dv} bespoke={bespoke} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// Section Header — Different vibes per variant
// ============================================================

function SectionHeader({ variant, palette: p }: { variant: TestimonialVariant; palette: any }) {
  switch (variant) {
    case 'luxury':
      return (
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="block w-8 h-px" style={{ backgroundColor: p.primary, opacity: 0.4 }} />
            <Sparkles size={14} style={{ color: p.primary, opacity: 0.6 }} />
            <span className="block w-8 h-px" style={{ backgroundColor: p.primary, opacity: 0.4 }} />
          </div>
          <h2
            className="font-display text-xl md:text-2xl font-light tracking-wide"
            style={{ color: p.text, letterSpacing: '0.08em' }}
          >
            Cherished Moments
          </h2>
        </div>
      );

    case 'organic':
      return (
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.15em] mb-2" style={{ color: p.primary }}>
            Reviews
          </p>
          <h2 className="font-display text-lg md:text-xl" style={{ color: p.text }}>
            What Our Community Says
          </h2>
        </div>
      );

    default: // modern
      return (
        <div className="text-center mb-8">
          <p className="eyebrow mb-2">Happy Customers</p>
          <h2 className="section-title">What They Say</h2>
        </div>
      );
  }
}

// ============================================================
// Card — 3 distinct visual treatments
// ============================================================

function TestimonialCard({
  testimonial: t,
  palette: p,
  design,
  index,
  designVariant: dv,
  bespoke,
}: {
  testimonial: Testimonial;
  palette: any;
  design: any;
  index: number;
  designVariant: TestimonialVariant;
  bespoke: any;
}) {
  switch (dv) {
    // ── LUXURY: Dark card, gold accents, serif quote marks ──
    case 'luxury':
      return (
        <div
          className="flex-shrink-0 w-[300px] md:w-[340px] p-7 md:p-8 animate-slide-up relative overflow-hidden"
          style={{
            backgroundColor: p.background,
            border: `1px solid ${p.primary}22`,
            borderRadius: '2px',
            animationDelay: `${index * 80}ms`,
          }}
        >
          {/* Gold corner accent */}
          <div
            className="absolute top-0 right-0 w-12 h-12"
            style={{
              background: `linear-gradient(225deg, ${p.primary}15 0%, transparent 70%)`,
            }}
          />
          <div
            className="font-display text-3xl leading-none mb-4"
            style={{ color: p.primary, opacity: 0.3 }}
          >
            &ldquo;
          </div>
          {t.rating && (
            <div className="flex gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} size={10} fill={p.primary} color={p.primary} />
              ))}
            </div>
          )}
          <p
            className="text-sm leading-relaxed mb-5 font-display italic"
            style={{ color: p.text, opacity: 0.85 }}
          >
            {t.text}
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-px h-4"
              style={{ backgroundColor: p.primary, opacity: 0.4 }}
            />
            <div>
              <p className="text-xs font-semibold tracking-wide" style={{ color: p.text }}>
                {t.name}
              </p>
              {t.city && (
                <p className="text-[10px] tracking-wider uppercase" style={{ color: p.textMuted }}>
                  {t.city}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    // ── ORGANIC: Pill-shaped, soft borders, leaf-like quotes ──
    case 'organic':
      return (
        <div
          className="flex-shrink-0 w-[300px] md:w-[340px] p-6 md:p-7 animate-slide-up"
          style={{
            backgroundColor: p.surface,
            borderRadius: '24px',
            border: `1px solid ${p.primary}12`,
            animationDelay: `${index * 60}ms`,
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ backgroundColor: `${p.primary}10` }}
            >
              <Quote size={14} style={{ color: p.primary }} />
            </div>
            {t.rating && (
              <div className="flex gap-0.5 pt-1.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={11} fill={p.primary} color={p.primary} />
                ))}
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: p.text }}>
            {t.text}
          </p>
          <div
            className="pt-4"
            style={{ borderTop: `1px solid ${p.text}08` }}
          >
            <p className="text-xs font-medium" style={{ color: p.text }}>{t.name}</p>
            {t.city && (
              <p className="text-[11px] mt-0.5" style={{ color: p.textMuted }}>{t.city}</p>
            )}
          </div>
        </div>
      );

    // ── MODERN: Clean, bold, geometric ──
    default:
      return (
        <div
          className="flex-shrink-0 w-[300px] md:w-[340px] p-6 md:p-7 animate-slide-up"
          style={{
            backgroundColor: p.surface,
            borderRadius: design.radius === 'sharp' ? '0' : design.radius === 'pill' ? '16px' : '8px',
            border: `1px solid color-mix(in srgb, ${p.text} 6%, transparent)`,
            animationDelay: `${index * 60}ms`,
          }}
        >
          <Quote size={18} style={{ color: p.primary, opacity: 0.25 }} className="mb-3" />
          {t.rating && (
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} size={12} fill={p.primary} color={p.primary} />
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed mb-4" style={{ color: p.text }}>{t.text}</p>
          <div>
            <p className="text-xs font-semibold" style={{ color: p.text }}>{t.name}</p>
            {t.city && <p className="text-[11px]" style={{ color: p.textMuted }}>{t.city}</p>}
          </div>
        </div>
      );
  }
}

// ============================================================
// Nav Buttons — variant-aware
// ============================================================

function NavButton({ onClick, palette: p, variant: dv, direction }: {
  onClick: () => void; palette: any; variant: TestimonialVariant; direction: 'left' | 'right';
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const label = direction === 'left' ? 'Previous' : 'Next';

  const baseStyle = dv === 'luxury'
    ? { borderColor: `${p.primary}30`, color: p.primary }
    : { borderColor: `color-mix(in srgb, ${p.text} 15%, transparent)`, color: p.text };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-9 h-9 flex items-center justify-center border transition-colors duration-200',
        dv === 'luxury' ? 'rounded-none' : 'rounded-full',
      )}
      style={baseStyle}
      aria-label={label}
    >
      <Icon size={16} />
    </button>
  );
}
