'use client';

import React, { useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface TestimonialsProps {
  testimonials?: Testimonial[];
  variant?: 'carousel' | 'grid';
}

export function Testimonials({ testimonials = DEFAULT_TESTIMONIALS, variant = 'carousel' }: TestimonialsProps) {
  const { design } = useStore();
  const p = design.palette;
  const [revRef, vis] = useReveal();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 356 : -356, behavior: 'smooth' });
  };

  return (
    <section
      ref={revRef as React.RefObject<HTMLElement>}
      className={cn('py-12 md:py-16 transition-all duration-600', vis ? 'reveal-visible' : 'reveal-hidden')}
      style={{ backgroundColor: p.background }}
    >
      <div className="container-store">
        <div className="text-center mb-8">
          <p className="eyebrow mb-2">Happy Customers</p>
          <h2 className="section-title">What They Say</h2>
        </div>

        {variant === 'carousel' ? (
          <div className="relative">
            <div ref={scrollRef} className="scroll-snap-x scrollbar-hide gap-4 pb-2 -mx-4 px-4">
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} testimonial={t} palette={p} radius={design.radius} index={i} />
              ))}
            </div>
            <div className="hidden md:flex items-center justify-center gap-2 mt-6">
              <button onClick={() => scrollBy('left')} className="w-9 h-9 flex items-center justify-center rounded-full border" style={{ borderColor: `color-mix(in srgb, ${p.text} 15%, transparent)` }} aria-label="Previous">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => scrollBy('right')} className="w-9 h-9 flex items-center justify-center rounded-full border" style={{ borderColor: `color-mix(in srgb, ${p.text} 15%, transparent)` }} aria-label="Next">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} palette={p} radius={design.radius} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial: t, palette: p, radius, index }: { testimonial: Testimonial; palette: any; radius: string; index: number }) {
  return (
    <div
      className="flex-shrink-0 w-[300px] md:w-[340px] p-6 md:p-7 animate-slide-up"
      style={{
        backgroundColor: p.surface,
        borderRadius: radius === 'sharp' ? '0' : radius === 'pill' ? '16px' : '8px',
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
