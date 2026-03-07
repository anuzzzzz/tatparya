'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/components/store-provider';
import { imageUrl as resolveImage } from '@/lib/utils';
import { Heart, Shield, Truck, Star, Sparkles, Package } from 'lucide-react';

interface AboutPageClientProps {
  store: any;
  heroImage: string | null;
  storeSlug: string;
}

function useReveal() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function AboutPageClient({ store, heroImage, storeSlug }: AboutPageClientProps) {
  const { design, config } = useStore();
  const p = design.palette;
  const storeUrl = `/${storeSlug}`;
  const bio = (config as any)?.storeBio || store.description || '';
  const founderStory = (config as any)?.content?.aboutPage?.founderStory || bio;
  const vertical = store.vertical as string;

  return (
    <div>
      {/* Hero Banner */}
      <section
        className="relative flex items-end"
        style={{ minHeight: '50vh', marginTop: '-64px' }}
      >
        {heroImage && (
          <img
            src={resolveImage(heroImage)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.4 }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${p.text}40 0%, ${p.text}90 60%, ${p.text} 100%)`,
          }}
        />
        <div className="relative z-10 container-store pb-12 pt-32">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: p.primary }}
          >
            Our Story
          </p>
          <h1
            className="font-display text-3xl md:text-5xl font-bold mb-4"
            style={{ color: '#fff' }}
          >
            {store.name}
          </h1>
          {bio && (
            <p className="text-sm md:text-base max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {bio}
            </p>
          )}
        </div>
      </section>

      {/* Story Section */}
      <StorySection story={founderStory} palette={p} />

      {/* Values Grid */}
      <ValuesGrid vertical={vertical} palette={p} configValues={(config as any)?.content?.aboutPage?.values} />

      {/* Stats Section */}
      <StatsSection palette={p} configStats={(config as any)?.content?.aboutPage?.stats} />

      {/* CTA Section */}
      <section className="py-16 md:py-20 text-center" style={{ backgroundColor: p.surface }}>
        <div className="container-store">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-6" style={{ color: p.text }}>
            Explore Our Collection
          </h2>
          <Link
            href={`${storeUrl}/collections/all`}
            className="inline-block px-8 py-3.5 text-sm font-semibold tracking-wide text-white transition-transform hover:scale-[0.97]"
            style={{ backgroundColor: p.primary }}
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}

function StorySection({ story, palette }: { story: string; palette: any }) {
  const { ref, visible } = useReveal();
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: palette.background }}>
      <div
        ref={ref}
        className="max-w-3xl mx-auto px-4 text-center transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <Sparkles size={24} className="mx-auto mb-6" style={{ color: palette.primary, opacity: 0.6 }} />
        <p className="text-base md:text-lg leading-relaxed" style={{ color: palette.text, opacity: 0.8 }}>
          {story}
        </p>
        <div className="mt-8 mx-auto w-12 h-px" style={{ backgroundColor: palette.primary, opacity: 0.3 }} />
      </div>
    </section>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  heart: Heart, shield: Shield, truck: Truck, star: Star, sparkles: Sparkles, package: Package,
};

function ValuesGrid({ vertical, palette, configValues }: { vertical: string; palette: any; configValues?: any[] }) {
  const isFashionJewellery = ['fashion', 'jewellery'].includes(vertical);
  const isFood = vertical === 'food';

  const useConfig = Array.isArray(configValues) && configValues.length >= 3;

  const values = useConfig
    ? configValues!.slice(0, 4).map(v => ({
        icon: ICON_MAP[v.icon] || Heart,
        title: v.title || '',
        desc: v.desc || '',
      }))
    : [
        {
          icon: isFood ? Shield : Heart,
          title: isFood ? 'Pure & Natural' : 'Quality Assured',
          desc: isFood ? 'Only the finest natural ingredients in every product.' : 'Every product passes rigorous quality checks before reaching you.',
        },
        { icon: Truck, title: 'Fast Delivery', desc: 'Quick and reliable shipping across India with real-time tracking.' },
        { icon: Star, title: 'Customer First', desc: 'Your satisfaction is our priority. Easy returns and responsive support.' },
        {
          icon: isFood ? Package : isFashionJewellery ? Sparkles : Shield,
          title: isFood ? 'Fresh Packaging' : isFashionJewellery ? 'Crafted with Care' : 'Curated Selection',
          desc: isFood
            ? 'Sealed fresh to preserve taste and quality until delivery.'
            : isFashionJewellery
            ? 'Each piece is thoughtfully designed and carefully crafted.'
            : 'A handpicked collection of the best products in our category.',
        },
      ];

  return (
    <section className="py-16 md:py-20" style={{ backgroundColor: palette.surface }}>
      <div className="container-store">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: palette.text }}>
          What We Stand For
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {values.map((v, i) => (
            <div key={i} className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `color-mix(in srgb, ${palette.primary} 12%, transparent)` }}
              >
                <v.icon size={20} style={{ color: palette.primary }} />
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: palette.text }}>{v.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: palette.textMuted }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection({ palette, configStats }: { palette: any; configStats?: any[] }) {
  const useConfig = Array.isArray(configStats) && configStats.length >= 3;

  const stats = useConfig
    ? configStats!.slice(0, 4).map(s => ({ value: s.value || '', label: s.label || '' }))
    : [
        { value: '1,000+', label: 'Happy Customers' },
        { value: '100%', label: 'Authentic' },
        { value: '4.8\u2605', label: 'Rating' },
        { value: '24hr', label: 'Dispatch' },
      ];

  return (
    <section className="py-14 md:py-16" style={{ backgroundColor: palette.primary }}>
      <div className="container-store grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="text-2xl md:text-3xl font-bold text-white">{s.value}</p>
            <p className="text-xs mt-1 text-white/70">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
