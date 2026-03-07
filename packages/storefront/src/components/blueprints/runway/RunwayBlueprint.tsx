/*
 * ═══════════════════════════════════════════════════════════
 *  THE RUNWAY — Fashion Blueprint
 *
 *  Brutally opinionated. Zero layout flexibility.
 *  Every pixel is intentional. Every spacing is fixed.
 *
 *  FIXED DECISIONS (AI cannot change):
 *  - Section order: hero → trust → products → about → newsletter → footer
 *  - Hero: full-bleed slideshow, 85vh, bottom-left text
 *  - Font: Cormorant Garamond display / DM Sans body
 *  - Product grid: 4-col desktop, 2-col mobile, 3:4 ratio
 *  - Spacing: 80px between sections, 0 vibeWeight nonsense
 *  - Overlay: 4-stop cinematic gradient, guaranteed readable
 *  - Cards: minimal — name + price only, no badges, hover zoom
 *  - Radius: 0px (sharp everything)
 *
 *  AI PROVIDES (via store config):
 *  - palette.primary, palette.background, palette.text
 *  - heroTagline, heroSubtext
 *  - products[] with images, names, prices
 *  - storeBio
 *  - content.testimonials, content.marquee, content.newsletter
 *
 *  USAGE:
 *  In page.tsx: if (config.blueprint === 'runway') return <RunwayBlueprint />
 * ═══════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '../../store-provider';
import { formatPrice, discountPercent, imageUrl as resolveImage, cn } from '@/lib/utils';
import { Search, ShoppingBag, Menu, X, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================
// THE RUNWAY — Complete Fashion Blueprint
// ============================================================

interface RunwayProps {
  products: any[];
  heroImages: string[];
  storeUrl: string;
}

export function RunwayBlueprint({ products, heroImages, storeUrl }: RunwayProps) {
  const { store, design, config } = useStore();
  const p = design.palette;
  const content = (config as any)?.content || {};
  const tagline = (config as any)?.heroTagline || store.name;
  const subtext = (config as any)?.heroSubtext || 'Discover our curated collection.';
  const bio = (config as any)?.storeBio || store.description || '';

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: p.text,
        backgroundColor: p.background,
        '--runway-primary': p.primary,
        '--runway-bg': p.background,
        '--runway-surface': p.surface || '#f5f0eb',
        '--runway-text': p.text,
        '--runway-muted': p.textMuted || '#8a8a8a',
        '--runway-accent': p.accent || p.primary,
      } as React.CSSProperties}
    >
      {/* Google Fonts — always Cormorant Garamond + DM Sans */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes runwayFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes runwayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes runwaySlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes runwayMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .runway-stagger > * { animation: runwayFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .runway-stagger > *:nth-child(1) { animation-delay: 0ms; }
        .runway-stagger > *:nth-child(2) { animation-delay: 80ms; }
        .runway-stagger > *:nth-child(3) { animation-delay: 160ms; }
        .runway-stagger > *:nth-child(4) { animation-delay: 240ms; }
        .runway-stagger > *:nth-child(5) { animation-delay: 320ms; }
        .runway-stagger > *:nth-child(6) { animation-delay: 400ms; }
        .runway-stagger > *:nth-child(7) { animation-delay: 480ms; }
        .runway-stagger > *:nth-child(8) { animation-delay: 560ms; }
      `}} />

      {/* ── 1. NAVBAR — always transparent, always minimal ── */}
      <RunwayNavbar storeName={store.name} storeUrl={storeUrl} primary={p.primary} />

      {/* ── 2. HERO — full-bleed slideshow, 85vh, cinematic overlay ── */}
      <RunwayHero
        images={heroImages}
        tagline={tagline}
        subtext={subtext}
        link={`${storeUrl}/collections/all`}
      />

      {/* ── 3. MARQUEE — only if content exists ── */}
      {content.marquee?.length > 0 && (
        <RunwayMarquee phrases={content.marquee} primary={p.primary} bg={p.text} />
      )}

      {/* ── 4. PRODUCTS — single grid, no duplication ── */}
      {products.length > 0 && (
        <RunwayProductSection
          products={products.slice(0, 8)}
          eyebrow="The Collection"
          title="New Arrivals"
          storeUrl={storeUrl}
          primary={p.primary}
        />
      )}

      {/* ── 5. ABOUT — image + text split ── */}
      {bio && (
        <RunwayAbout
          storeName={store.name}
          bio={bio}
          imageUrl={heroImages[1] || heroImages[0]}
          primary={p.primary}
          surface={p.surface || '#f5f0eb'}
        />
      )}

      {/* ── 6. TESTIMONIALS — only if content exists ── */}
      {content.testimonials?.length >= 3 && (
        <RunwayTestimonials testimonials={content.testimonials} primary={p.primary} />
      )}

      {/* ── 7. NEWSLETTER ── */}
      <RunwayNewsletter
        headline={content.newsletter?.heading || `Join the ${store.name} Club`}
        subtext={content.newsletter?.subtext || 'New drops, exclusive offers & styling tips.'}
        primary={p.primary}
        surface={p.surface || '#f5f0eb'}
      />

      {/* ── 8. FOOTER ── */}
      <RunwayFooter
        storeName={store.name}
        bio={bio}
        storeUrl={storeUrl}
        textColor={p.text}
        mutedColor={p.textMuted || '#8a8a8a'}
        primary={p.primary}
        bg={p.background}
      />
    </div>
  );
}

// ============================================================
// NAVBAR — fixed, transparent over hero, glass on scroll
// ============================================================
function RunwayNavbar({ storeName, storeUrl, primary }: { storeName: string; storeUrl: string; primary: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
      }}
    >
      <Link
        href={storeUrl}
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22, fontWeight: 600, letterSpacing: '0.02em',
          color: scrolled ? '#1a1a1a' : '#fff',
          textDecoration: 'none',
          transition: 'color 0.4s',
        }}
      >
        {storeName}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link
          href={`${storeUrl}/collections/all`}
          style={{
            display: 'none', fontSize: 13, fontWeight: 500, color: scrolled ? '#1a1a1a' : '#fff',
            textDecoration: 'none', padding: '8px 16px', transition: 'color 0.4s',
          }}
          className="md:!flex"
        >
          Shop
        </Link>
        <button style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: scrolled ? '#1a1a1a' : '#fff', transition: 'color 0.4s' }}>
          <Search size={20} />
        </button>
        <Link
          href={`${storeUrl}/cart`}
          style={{ position: 'relative', padding: 8, color: scrolled ? '#1a1a1a' : '#fff', transition: 'color 0.4s' }}
        >
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 16, height: 16, borderRadius: 99,
              backgroundColor: primary, color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

// ============================================================
// HERO — 85vh, slideshow, cinematic 4-stop gradient
// ============================================================
function RunwayHero({ images, tagline, subtext, link }: { images: string[]; tagline: string; subtext: string; link: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <section style={{ position: 'relative', height: '85vh', minHeight: 500, overflow: 'hidden' }}>
      {/* Slides */}
      {images.map((img, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
          }}
        >
          <img
            src={resolveImage(img)}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: i === current ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 8s ease',
            }}
          />
        </div>
      ))}

      {/* Cinematic 4-stop gradient — guaranteed readable */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Text — bottom-left, staggered entrance */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: 'clamp(24px, 5vw, 64px)',
          paddingBottom: 'clamp(40px, 6vh, 80px)',
        }}
        className="runway-stagger"
      >
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(2.2rem, 5.5vw, 3.8rem)',
          fontWeight: 500, fontStyle: 'italic',
          lineHeight: 1.05, letterSpacing: '-0.02em',
          color: '#fff', margin: 0,
          textShadow: '0 2px 40px rgba(0,0,0,0.3)',
          maxWidth: 600,
        }}>
          {tagline}
        </h1>
        <p style={{
          fontSize: 'clamp(0.85rem, 1.5vw, 1rem)',
          color: 'rgba(255,255,255,0.75)',
          marginTop: 16, maxWidth: 420, lineHeight: 1.6,
        }}>
          {subtext}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <Link
            href={link}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '14px 32px', fontSize: 13, fontWeight: 600,
              backgroundColor: '#fff', color: '#1a1a1a',
              textDecoration: 'none', letterSpacing: '0.04em',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Shop Collection
          </Link>
          <Link
            href={`${link}/../about`}
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '14px 32px', fontSize: 13, fontWeight: 500,
              backgroundColor: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              textDecoration: 'none', letterSpacing: '0.04em',
            }}
          >
            Our Story
          </Link>
        </div>

        {/* Slide dots */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 32 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 28 : 8, height: 3,
                  borderRadius: 2, border: 'none', cursor: 'pointer',
                  backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================
// MARQUEE — dark strip, scrolling text
// ============================================================
function RunwayMarquee({ phrases, primary, bg }: { phrases: string[]; primary: string; bg: string }) {
  const text = phrases.join('  ·  ');
  const doubled = `${text}  ·  ${text}  ·  `;

  return (
    <div style={{
      backgroundColor: bg, color: '#fff', overflow: 'hidden',
      padding: '14px 0', whiteSpace: 'nowrap',
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'runwayMarquee 30s linear infinite',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        {doubled}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTS — one grid, 4-col, 3:4 ratio, minimal cards
// ============================================================
function RunwayProductSection({ products, eyebrow, title, storeUrl, primary }: {
  products: any[]; eyebrow: string; title: string; storeUrl: string; primary: string;
}) {
  return (
    <section style={{ padding: '80px clamp(16px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: primary, marginBottom: 8,
          }}>
            {eyebrow}
          </p>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500,
            margin: 0,
          }}>
            {title}
          </h2>
        </div>

        {/* Grid — 4 col desktop, 2 col mobile */}
        <div
          className="runway-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 24,
          }}
        >
          {products.map((product, i) => (
            <RunwayProductCard key={product.id} product={product} storeUrl={storeUrl} index={i} />
          ))}
        </div>

        {/* View all link */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link
            href={`${storeUrl}/collections/all`}
            style={{
              fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'inherit',
              textDecoration: 'none', borderBottom: `1px solid currentColor`,
              paddingBottom: 2,
            }}
          >
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}

function RunwayProductCard({ product, storeUrl, index }: { product: any; storeUrl: string; index: number }) {
  const [hovered, setHovered] = useState(false);
  const img = product.images?.[0];
  const imgSrc = resolveImage(typeof img === 'object' ? (img.cardUrl || img.originalUrl) : img);
  const discount = product.compareAtPrice ? discountPercent(product.price, product.compareAtPrice) : 0;

  return (
    <Link
      href={`${storeUrl}/products/${product.slug}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — 3:4, sharp corners, zoom on hover */}
      <div style={{
        position: 'relative', paddingBottom: '133%', overflow: 'hidden',
        backgroundColor: '#f0ebe5',
      }}>
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        {/* Discount badge — only if >0 */}
        {discount > 0 && (
          <span style={{
            position: 'absolute', top: 12, left: 12,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            padding: '4px 10px', backgroundColor: '#E94560', color: '#fff',
          }}>
            {discount}% OFF
          </span>
        )}
        {/* Wishlist — appears on hover */}
        <button
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: 99,
            backgroundColor: 'rgba(255,255,255,0.9)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0, transform: hovered ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Heart size={14} color="#1a1a1a" />
        </button>
      </div>

      {/* Info — minimal: name + price only */}
      <div style={{ paddingTop: 14 }}>
        <p style={{
          fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {product.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span style={{ fontSize: 12, textDecoration: 'line-through', opacity: 0.4 }}>
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// ABOUT — image left, text right, editorial feel
// ============================================================
function RunwayAbout({ storeName, bio, imageUrl, primary, surface }: {
  storeName: string; bio: string; imageUrl?: string; primary: string; surface: string;
}) {
  return (
    <section style={{ backgroundColor: surface, padding: '0' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr', minHeight: 400,
        maxWidth: 1280, margin: '0 auto',
      }}
        className="md:!grid-cols-2"
      >
        {/* Image */}
        {imageUrl && (
          <div style={{ position: 'relative', minHeight: 300 }}>
            <img
              src={resolveImage(imageUrl)}
              alt={storeName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        {/* Text */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 'clamp(32px, 5vw, 80px)',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: primary, marginBottom: 12,
          }}>
            Our Story
          </p>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 500,
            margin: '0 0 20px 0', lineHeight: 1.2,
          }}>
            {storeName}
          </h2>
          <p style={{
            fontSize: 14, lineHeight: 1.8, opacity: 0.7, maxWidth: 480,
          }}>
            {bio}
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS — 3 cards, clean
// ============================================================
function RunwayTestimonials({ testimonials, primary }: {
  testimonials: { text: string; name: string; city: string; rating: number }[];
  primary: string;
}) {
  return (
    <section style={{ padding: '80px clamp(16px, 4vw, 48px)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: primary, marginBottom: 8,
        }}>
          Reviews
        </p>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 500,
          marginBottom: 48,
        }}>
          What They Say
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {testimonials.slice(0, 3).map((t, i) => (
            <div key={i} style={{
              padding: 32, textAlign: 'left',
              backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 0,
            }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>
                {'★'.repeat(t.rating)}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: '12px 0 16px', opacity: 0.8 }}>
                "{t.text}"
              </p>
              <p style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</p>
              <p style={{ fontSize: 11, opacity: 0.5 }}>{t.city}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// NEWSLETTER — centered, minimal
// ============================================================
function RunwayNewsletter({ headline, subtext, primary, surface }: {
  headline: string; subtext: string; primary: string; surface: string;
}) {
  return (
    <section style={{ backgroundColor: surface, padding: '80px clamp(16px, 4vw, 48px)', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 500,
          marginBottom: 8,
        }}>
          {headline}
        </h2>
        <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 28, lineHeight: 1.6 }}>
          {subtext}
        </p>
        <div style={{ display: 'flex', gap: 0, maxWidth: 400, margin: '0 auto' }}>
          <input
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            style={{
              flex: 1, padding: '14px 16px', fontSize: 13,
              border: '1px solid rgba(0,0,0,0.12)', borderRight: 'none',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button style={{
            padding: '14px 24px', fontSize: 13, fontWeight: 600,
            backgroundColor: primary, color: '#fff', border: 'none',
            cursor: 'pointer', letterSpacing: '0.04em',
          }}>
            Subscribe
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER — clean, 4-col
// ============================================================
function RunwayFooter({ storeName, bio, storeUrl, textColor, mutedColor, primary, bg }: {
  storeName: string; bio: string; storeUrl: string; textColor: string; mutedColor: string; primary: string; bg: string;
}) {
  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '64px clamp(16px, 4vw, 48px) 32px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48 }}>
        <div>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            {storeName}
          </h3>
          {bio && <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.5, maxWidth: 280 }}>{bio.slice(0, 160)}</p>}
        </div>
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Shop</h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`${storeUrl}/collections/all`} style={{ fontSize: 13, color: mutedColor, textDecoration: 'none' }}>All Products</Link>
            <Link href={`${storeUrl}/collections/all`} style={{ fontSize: 13, color: mutedColor, textDecoration: 'none' }}>New Arrivals</Link>
          </nav>
        </div>
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Help</h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: mutedColor }}>Shipping</span>
            <span style={{ fontSize: 13, color: mutedColor }}>Returns</span>
            <span style={{ fontSize: 13, color: mutedColor }}>Contact</span>
          </nav>
        </div>
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Legal</h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: mutedColor }}>Privacy Policy</span>
            <span style={{ fontSize: 13, color: mutedColor }}>Terms of Service</span>
          </nav>
        </div>
      </div>
      <div style={{
        maxWidth: 1280, margin: '48px auto 0', paddingTop: 24,
        borderTop: '1px solid rgba(0,0,0,0.04)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: 11, opacity: 0.4 }}>© {new Date().getFullYear()} {storeName}</p>
        <p style={{ fontSize: 11, opacity: 0.25 }}>Powered by Tatparya</p>
      </div>
    </footer>
  );
}
