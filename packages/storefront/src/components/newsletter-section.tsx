'use client';

import React, { useState } from 'react';
import { MessageCircle, Send, ArrowRight, Bell } from 'lucide-react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

// ============================================================
// Newsletter Section v3.1 — Per-Vertical Design Variants
//
// luxury:  Dark bg, editorial typography, gold accents
// organic: Soft rounded card, nature-inspired, pill CTA
// modern:  Clean centered, icon-forward (original)
// ============================================================

type NewsletterVariant = 'luxury' | 'organic' | 'modern';

function inferVariant(vertical: string, colorMood?: string): NewsletterVariant {
  if (colorMood === 'dark-luxury') return 'luxury';
  if (colorMood === 'clean-minimal' || colorMood === 'warm-earthy') return 'organic';
  if (vertical === 'jewellery') return 'luxury';
  if (vertical === 'beauty' || vertical === 'wellness') return 'organic';
  return 'modern';
}

interface NewsletterSectionProps {
  /** V3.1: Per-section visual variant — overrides auto-inference */
  designVariant?: NewsletterVariant;
}

export function NewsletterSection({ designVariant }: NewsletterSectionProps) {
  const { store, design, config } = useStore();
  const [phone, setPhone] = useState('');
  const [revRef, visible] = useReveal();
  const [submitted, setSubmitted] = useState(false);
  const p = design.palette;

  const storeConfig = config as any;
  const colorMood = storeConfig?.directorDecisions?.colorMood || '';
  const vertical = (store as any).vertical || 'general';
  const dv = designVariant || inferVariant(vertical, colorMood);

  // V3.2: AI-generated newsletter copy with fallbacks
  const nlContent = storeConfig?.content?.newsletter;
  const nlHeading = nlContent?.heading || (dv === 'luxury' ? 'Be the First to Know' : dv === 'organic' ? 'Stay in the Loop' : 'Get Updates on WhatsApp');
  const nlSubtext = nlContent?.subtext || 'New arrivals, exclusive offers & restocks — delivered to your WhatsApp.';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const SuccessMessage = () => (
    <div
      className="py-3 px-4 text-sm font-medium"
      style={{
        backgroundColor: `${p.primary}15`,
        color: dv === 'luxury' ? p.background : p.primary,
        borderRadius: dv === 'organic' ? '999px' : dv === 'luxury' ? '0' : 'var(--radius)',
      }}
    >
      You&apos;re in! We&apos;ll send you updates soon.
    </div>
  );

  switch (dv) {
    // ── LUXURY: Dark strip, editorial feel ──
    case 'luxury':
      return (
        <section
          ref={revRef as React.RefObject<HTMLElement>}
          className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
          style={{
            backgroundColor: p.text,
            paddingTop: 'var(--spacing-section)',
            paddingBottom: 'var(--spacing-section)',
          }}
        >
          <div className="container-store">
            <div className="max-w-lg mx-auto text-center">
              <div className="flex items-center justify-center gap-4 mb-5">
                <span className="block w-10 h-px" style={{ backgroundColor: p.primary, opacity: 0.4 }} />
                <Bell size={16} style={{ color: p.primary, opacity: 0.6 }} />
                <span className="block w-10 h-px" style={{ backgroundColor: p.primary, opacity: 0.4 }} />
              </div>
              <h3
                className="font-display text-lg md:text-xl font-light tracking-wide mb-2"
                style={{ color: p.background, letterSpacing: '0.06em' }}
              >
                {nlHeading}
              </h3>
              <p className="text-xs md:text-sm mb-6 leading-relaxed" style={{ color: `${p.background}99` }}>
                {nlSubtext}
              </p>

              {submitted ? (
                <SuccessMessage />
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 text-sm py-2.5 px-4 bg-transparent border focus:outline-none"
                    style={{
                      borderColor: `${p.background}25`,
                      color: p.background,
                      borderRadius: '0',
                    }}
                    required
                  />
                  <button
                    type="submit"
                    className="px-5 text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: p.primary,
                      color: p.background,
                      borderRadius: '0',
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      );

    // ── ORGANIC: Soft card, rounded, nature-inspired ──
    case 'organic':
      return (
        <section
          ref={revRef as React.RefObject<HTMLElement>}
          className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
          style={{
            backgroundColor: p.background,
            paddingTop: 'var(--spacing-section)',
            paddingBottom: 'var(--spacing-section)',
          }}
        >
          <div className="container-store">
            <div
              className="max-w-md mx-auto text-center py-8 px-6 md:px-10"
              style={{
                backgroundColor: p.surface,
                borderRadius: '24px',
                border: `1px solid ${p.primary}10`,
              }}
            >
              <div
                className="w-10 h-10 mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${p.primary}10`,
                  color: p.primary,
                }}
              >
                <MessageCircle size={18} />
              </div>
              <h3
                className="font-display text-lg md:text-xl font-medium mb-2"
                style={{ color: p.text }}
              >
                {nlHeading}
              </h3>
              <p className="text-xs md:text-sm mb-5 leading-relaxed" style={{ color: p.textMuted }}>
                {nlSubtext}
              </p>

              {submitted ? (
                <SuccessMessage />
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 text-sm py-2.5 px-4 focus:outline-none"
                    style={{
                      backgroundColor: p.background,
                      color: p.text,
                      borderRadius: '999px',
                      border: `1px solid ${p.text}10`,
                    }}
                    required
                  />
                  <button
                    type="submit"
                    className="px-5 text-sm font-medium flex-shrink-0 transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: p.primary,
                      color: '#fff',
                      borderRadius: '999px',
                    }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      );

    // ── MODERN: Clean, centered, icon-forward (default) ──
    default:
      return (
        <section
          ref={revRef as React.RefObject<HTMLElement>}
          className={cn('transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
          style={{
            backgroundColor: p.surface,
            paddingTop: 'var(--spacing-section)',
            paddingBottom: 'var(--spacing-section)',
          }}
        >
          <div className="container-store">
            <div className="max-w-md mx-auto text-center">
              <div
                className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${p.primary} 12%, transparent)`,
                  color: p.primary,
                }}
              >
                <MessageCircle size={22} />
              </div>
              <h3
                className="font-display text-lg md:text-xl font-bold mb-2"
                style={{ color: p.text }}
              >
                {nlHeading}
              </h3>
              <p className="text-xs md:text-sm mb-5 leading-relaxed" style={{ color: p.textMuted }}>
                {nlSubtext}
              </p>

              {submitted ? (
                <SuccessMessage />
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field flex-1 text-sm"
                    required
                  />
                  <button type="submit" className="btn-primary !px-5 text-sm flex-shrink-0">
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      );
  }
}
