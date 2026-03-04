import { api } from '@/lib/trpc';
import { HeroSection } from '@/components/hero-section';
import { ProductGrid } from '@/components/product-grid';
import { TrustBar } from '@/components/trust-bar';
import { AboutBrand } from '@/components/about-brand';
import { NewsletterSection } from '@/components/newsletter-section';
import { MarqueeBanner } from '@/components/marquee-banner';
import { Testimonials } from '@/components/testimonials';
import { SectionDivider } from '@/components/section-divider';
import { StatsBar } from '@/components/stats-bar';
import { CategoryTiles } from '@/components/category-tiles';
import Link from 'next/link';

// ============================================================
// Store Homepage v2 — Polymorphic Section Registry
//
// Renders homepage sections from the composition engine config.
// V2 improvements over v1:
//   - Background alternation (surface/background rhythm)
//   - Gradient-fade dividers between sections
//   - New section types: marquee, stats_bar, testimonials, category_tiles
//   - Product display variants (carousel, editorial, grid)
//   - Hero variants (slideshow, bento, full_bleed, minimal, split)
//   - Staggered reveal animations on every section
// ============================================================

interface HomePageProps {
  params: { storeSlug: string };
}

export default async function StoreHomePage({ params }: HomePageProps) {
  const store = await api.store.get.query({ slug: params.storeSlug });
  const storeUrl = `/${params.storeSlug}`;

  const products = await api.product.list.query({
    storeId: store.id,
    status: 'active',
    pagination: { page: 1, limit: 12 },
  });
  const productItems = (products as any).items || [];

  let categories: any[] = [];
  try {
    categories = await api.category.getTree.query({ storeId: store.id });
  } catch { /* categories might not exist */ }

  const heroImages = pickHeroImages(productItems);
  const config = (store.storeConfig || store.config) as any;
  const sectionLayout = config?.sections?.homepage || [];

  // V2: Get decorative settings
  const decorativeTokens = config?.design?.decorativeTokens || {};
  const useBgVariation = decorativeTokens.sectionBgVariation !== false;
  const dividerStyle = decorativeTokens.dividerStyle || 'gradient-fade';

  // If no section config, use classic layout
  if (!sectionLayout || sectionLayout.length === 0) {
    return (
      <ClassicLayout
        storeUrl={storeUrl}
        heroImages={heroImages}
        categories={categories}
        productItems={productItems}
        useBgVariation={useBgVariation}
        dividerStyle={dividerStyle}
      />
    );
  }

  // V2: Track product section count for different slices
  let productSectionCount = 0;

  return (
    <div style={{ marginTop: '-64px' }}>
      {sectionLayout.map((section: any, index: number) => {
        const isProductSection = ['product_carousel', 'featured_products', 'product_grid'].includes(section.type);
        if (isProductSection) productSectionCount++;
        const currentProductSlice = productSectionCount;

        return (
          <div key={`${section.type}-${index}`}>
            {/* V2: Divider between sections (skip before first, after hero) */}
            {index > 0 && !isHeroType(sectionLayout[index - 1]?.type) && (
              <SectionDivider style={dividerStyle} />
            )}
            {/* V3: vibeWeight spacing — irregular rhythm */}
            {index > 0 && (
              <div style={{ height: getVibeGap(section.vibeWeight) }} />
            )}
            <SectionRenderer
              section={section}
              storeUrl={storeUrl}
              storeSlug={params.storeSlug}
              heroImages={heroImages}
              categories={categories}
              productItems={productItems}
              sectionIndex={index}
              useBgVariation={useBgVariation}
              productSlice={currentProductSlice}
            />
          </div>
        );
      })}
    </div>
  );
}

function isHeroType(type?: string): boolean {
  return !!type && type.startsWith('hero_');
}

/** V3: Convert vibeWeight (0.2-2.0) to pixel gap for irregular spatial rhythm */
function getVibeGap(weight?: number): string {
  const w = weight ?? 1.0;
  if (w <= 0.3) return '6px';    // Compressed
  if (w <= 0.6) return '16px';   // Tight
  if (w <= 1.1) return '0px';    // Normal (already handled by section padding)
  if (w <= 1.6) return '48px';   // Expanded breathing room
  return '80px';                  // Maximum expansion
}

// ============================================================
// V2 Section Renderer — Polymorphic with variants
// ============================================================

interface SectionRendererProps {
  section: { type: string; variant?: string; config?: Record<string, unknown>; background_hint?: string };
  storeUrl: string;
  storeSlug: string;
  heroImages: string[];
  categories: any[];
  productItems: any[];
  sectionIndex: number;
  useBgVariation: boolean;
  productSlice: number;
}

function SectionRenderer({
  section, storeUrl, storeSlug, heroImages, categories, productItems, sectionIndex, useBgVariation, productSlice,
}: SectionRendererProps) {
  const type = section.type;

  // V3: vibeWeight-based spacing (irregular rhythm)
  const vibeWeight = (section as any).vibeWeight ?? 1.0;
  const gapMap: Record<string, number> = { '0.2': 6, '0.5': 8, '1': 12, '1.5': 24, '2': 32 };
  const closestKey = Object.keys(gapMap).reduce((prev, curr) =>
    Math.abs(parseFloat(curr) - vibeWeight) < Math.abs(parseFloat(prev) - vibeWeight) ? curr : prev
  );
  const sectionPadding = `${gapMap[closestKey] || 12}px`;

  // V3: Color intensity — 'high' means primary bg, white text (the "Surprise" moment)
  const colorIntensity = (section as any).colorIntensity || 'low';
  const isAccentSection = colorIntensity === 'high';

  // V2: Background alternation for visual rhythm (overridden by accent section)
  const bgStyle = isAccentSection
    ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
    : useBgVariation && sectionIndex % 2 === 1
      ? { backgroundColor: 'var(--color-surface)' }
      : { backgroundColor: 'var(--color-background)' };

  switch (type) {
    // ── Hero variants ──
    case 'hero_slideshow':
      return <HeroSection imageUrl={heroImages[0]} images={heroImages} variant="slideshow" />;
    case 'hero_bento':
      return <HeroSection imageUrl={heroImages[0]} images={heroImages} variant="bento" />;
    case 'hero_full_bleed':
      return <HeroSection imageUrl={heroImages[0]} variant="full_bleed" />;
    case 'hero_minimal':
      return <HeroSection variant="minimal" />;
    case 'hero_split':
      return <HeroSection imageUrl={heroImages[0]} variant="split" />;
    case 'hero_banner':
      return <HeroSection imageUrl={heroImages[0]} variant="full_bleed" />;

    // ── Trust bar ──
    case 'trust_bar':
      return <TrustBar />;

    // ── Product sections with V2 variants ──
    case 'product_carousel': {
      const items = getProductSlice(productItems, productSlice);
      if (items.length === 0) return null;
      return (
        <section style={{ ...bgStyle, paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <div className="container-store">
            <ProductGrid products={items} title="Trending Now" variant="carousel" />
          </div>
        </section>
      );
    }
    case 'featured_products': {
      const items = getProductSlice(productItems, productSlice);
      if (items.length === 0) return null;
      return (
        <section style={{ ...bgStyle, paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <div className="container-store">
            <ProductGrid products={items} title="Featured Products" variant={items.length >= 5 ? 'editorial' : 'grid'} />
          </div>
        </section>
      );
    }
    case 'product_grid': {
      const items = getProductSlice(productItems, productSlice);
      if (items.length === 0) return null;
      return (
        <section style={{ ...bgStyle, paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <div className="container-store">
            <ProductGrid products={items} title="Our Collection" variant="grid" />
          </div>
        </section>
      );
    }

    // ── V2: Category tiles (visual, not text-only pills) ──
    case 'category_grid':
    case 'collection_banner':
    case 'collection_list': {
      if (categories.length === 0) return null;
      return <CategoryTiles categories={categories} variant="tiles" />;
    }
    case 'category_pills': {
      if (categories.length === 0) return null;
      return <CategoryTiles categories={categories} variant="pills" />;
    }

    // ── About ──
    case 'about_brand':
      return <AboutBrand />;

    // ── Newsletter ──
    case 'newsletter':
      return <NewsletterSection />;

    // ── V2: Marquee ──
    case 'marquee':
      return <MarqueeBanner />;

    // ── V2: Testimonials with variants ──
    case 'testimonials':
    case 'testimonial_cards':
      return <Testimonials variant={section.variant === 'grid' ? 'grid' : 'carousel'} />;

    // ── V2: Stats bar with animated counters ──
    case 'stats_bar':
      return <StatsBar />;

    // ── Logo bar ──
    case 'logo_bar':
      return (
        <section className="py-8 md:py-10" style={bgStyle}>
          <div className="container-store text-center">
            <p className="eyebrow mb-6">Trusted By</p>
            <div className="flex items-center justify-center gap-8 md:gap-12 opacity-40">
              {['Brand 1', 'Brand 2', 'Brand 3', 'Brand 4'].map((name, i) => (
                <div key={i} className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{name}</div>
              ))}
            </div>
          </div>
        </section>
      );

    // ── Video section ──
    case 'video_section':
      return (
        <section className="py-12 md:py-16" style={bgStyle}>
          <div className="container-store text-center">
            <div className="aspect-video max-w-3xl mx-auto rounded-[var(--radius-lg)] overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Video placeholder — add your brand story video</p>
              </div>
            </div>
          </div>
        </section>
      );

    // ── UGC gallery ──
    case 'ugc_gallery':
      return (
        <section className="py-12 md:py-16" style={bgStyle}>
          <div className="container-store text-center">
            <p className="eyebrow mb-2">#ShopWith{storeSlug.replace(/-/g, '')}</p>
            <h2 className="section-title mb-6">As Seen On Instagram</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
              {productItems.slice(0, 6).map((product: any, i: number) => {
                const img = product.images?.[0];
                const url = typeof img === 'object' ? (img.thumbnailUrl || img.originalUrl) : img;
                return url ? (
                  <div key={i} className="aspect-square overflow-hidden rounded-[var(--radius-sm)]">
                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" style={{ transitionTimingFunction: 'var(--ease-spring)' }} />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </section>
      );

    // ── Countdown ──
    case 'countdown_timer':
      return (
        <section className="py-6 md:py-8 text-center" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}>
          <div className="container-store">
            <p className="text-sm font-medium uppercase tracking-wider mb-1">Limited Time Offer</p>
            <p className="text-lg font-display font-bold">Sale ends soon — Shop now!</p>
          </div>
        </section>
      );

    // ── Quote ──
    case 'quote_block':
      return (
        <section className="py-12 md:py-16" style={bgStyle}>
          <div className="container-store text-center max-w-2xl mx-auto">
            <blockquote className="text-lg md:text-xl font-display italic" style={{ color: 'var(--color-text)' }}>
              &ldquo;Quality is remembered long after the price is forgotten.&rdquo;
            </blockquote>
            <p className="text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>— Our Promise</p>
          </div>
        </section>
      );

    case 'announcement_bar':
      return null;

    default:
      return null;
  }
}

// ============================================================
// Classic Layout (fallback)
// ============================================================

function ClassicLayout({
  storeUrl, heroImages, categories, productItems, useBgVariation, dividerStyle,
}: {
  storeUrl: string; heroImages: string[]; categories: any[]; productItems: any[];
  useBgVariation: boolean; dividerStyle: string;
}) {
  return (
    <div style={{ marginTop: '-64px' }}>
      <HeroSection imageUrl={heroImages[0]} images={heroImages} variant="full_bleed" />
      <TrustBar />
      <SectionDivider style={dividerStyle as any} />

      {categories.length > 0 && (
        <>
          <CategoryTiles categories={categories} variant="tiles" />
          <SectionDivider style={dividerStyle as any} />
        </>
      )}

      <section
        style={{
          paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)',
          backgroundColor: useBgVariation ? 'var(--color-surface)' : 'var(--color-background)',
        }}
      >
        <div className="container-store">
          <ProductGrid products={productItems.slice(0, 8)} title="Featured Products" variant="grid" />
          {productItems.length >= 8 && (
            <div className="text-center mt-8">
              <Link href={`${storeUrl}/collections/all`} className="btn-secondary text-sm">View All Products</Link>
            </div>
          )}
        </div>
      </section>

      <SectionDivider style={dividerStyle as any} />
      <AboutBrand />
      <SectionDivider style={dividerStyle as any} />
      <NewsletterSection />
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function pickHeroImages(products: any[]): string[] {
  const images: string[] = [];
  for (const product of products) {
    if (!product.images || !Array.isArray(product.images)) continue;
    for (const img of product.images) {
      const url = typeof img === 'object'
        ? (img.heroUrl || img.originalUrl)
        : typeof img === 'string' && img.startsWith('http') ? img : null;
      if (url && !images.includes(url)) {
        images.push(url);
        if (images.length >= 5) return images;
      }
    }
  }
  return images;
}

function getProductSlice(items: any[], sliceNum: number): any[] {
  const pageSize = 8;
  const start = Math.min((sliceNum - 1) * pageSize, items.length);
  const end = Math.min(start + pageSize, items.length);
  // If we've exhausted products, wrap around
  if (start >= items.length) return items.slice(0, pageSize);
  return items.slice(start, end);
}
