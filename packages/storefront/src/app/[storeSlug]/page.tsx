import { api } from '@/lib/trpc';
import { HeroSection } from '@/components/hero-section';
import { ProductGrid } from '@/components/product-grid';
import { TrustBar } from '@/components/trust-bar';
import { AboutBrand } from '@/components/about-brand';
import { NewsletterSection } from '@/components/newsletter-section';
import Link from 'next/link';

// ============================================================
// Store Homepage v2 — Dynamic Section Renderer
//
// Instead of a hardcoded layout (Hero → Trust → Products → About → Newsletter),
// this reads the section_pattern from the store's config and renders
// sections in the order defined by the composition engine archetype.
//
// Section mapping:
//   Composition Engine Type   →   React Component
//   ─────────────────────────────────────────────
//   announcement_bar          →   (rendered by layout/navbar)
//   hero_slideshow             →   HeroSection
//   hero_minimal               →   HeroSection (minimal variant)
//   trust_bar                  →   TrustBar
//   product_carousel           →   ProductGrid (carousel mode)
//   featured_products          →   ProductGrid
//   category_grid              →   CategorySection
//   collection_banner          →   CategorySection (banner variant)
//   about_brand                →   AboutBrand
//   newsletter                 →   NewsletterSection
//   marquee                    →   MarqueeBanner
//   ugc_gallery                →   UGCGallery
//   video_section              →   VideoSection
//   logo_bar                   →   LogoBar
//   testimonials               →   Testimonials
//
// Unmapped types are silently skipped (no crashes).
// If no section config exists, falls back to the classic layout.
// ============================================================

interface HomePageProps {
  params: { storeSlug: string };
}

export default async function StoreHomePage({ params }: HomePageProps) {
  const store = await api.store.get.query({ slug: params.storeSlug });
  const storeUrl = `/${params.storeSlug}`;

  // Fetch products
  const products = await api.product.list.query({
    storeId: store.id,
    status: 'active',
    pagination: { page: 1, limit: 12 },
  });
  const productItems = (products as any).items || [];

  // Fetch categories
  let categories: any[] = [];
  try {
    categories = await api.category.getTree.query({ storeId: store.id });
  } catch { /* categories might not exist */ }

  const heroImage = pickHeroImage(productItems);

  // Get section layout from store config
  const config = store.config as any;
  const sectionLayout = config?.sections?.homepage || [];

  // If no section config, use classic hardcoded layout
  if (!sectionLayout || sectionLayout.length === 0) {
    return <ClassicLayout
      storeUrl={storeUrl}
      heroImage={heroImage}
      categories={categories}
      productItems={productItems}
    />;
  }

  // Dynamic section renderer
  return (
    <div>
      {sectionLayout.map((section: any, index: number) => (
        <SectionRenderer
          key={`${section.type}-${index}`}
          section={section}
          storeUrl={storeUrl}
          storeSlug={params.storeSlug}
          heroImage={heroImage}
          categories={categories}
          productItems={productItems}
          sectionIndex={index}
        />
      ))}
    </div>
  );
}

// ============================================================
// Section Renderer — maps section types to components
// ============================================================

interface SectionRendererProps {
  section: {
    type: string;
    config?: Record<string, unknown>;
    variant?: string;
    background_hint?: string;
  };
  storeUrl: string;
  storeSlug: string;
  heroImage?: string;
  categories: any[];
  productItems: any[];
  sectionIndex: number;
}

function SectionRenderer({
  section,
  storeUrl,
  storeSlug,
  heroImage,
  categories,
  productItems,
  sectionIndex,
}: SectionRendererProps) {
  const type = section.type;

  // Track which product slice to use (for multiple product sections)
  // First product section gets items 0-3, second gets 4-7, etc.

  switch (type) {
    // ── Hero sections ──
    case 'hero_slideshow':
    case 'hero_minimal':
    case 'hero_banner':
    case 'hero_bento':
    case 'hero_full_bleed':
    case 'hero_split':
      return <HeroSection imageUrl={heroImage} />;

    // ── Trust / USP bar ──
    case 'trust_bar':
      return <TrustBar />;

    // ── Product sections ──
    case 'product_carousel':
    case 'featured_products':
    case 'product_grid': {
      const title = type === 'product_carousel' ? 'Trending Now' :
                    type === 'featured_products' ? 'Featured Products' :
                    'Our Collection';
      // Show different product slices for different sections
      const sliceStart = sectionIndex <= 5 ? 0 : 4;
      const sliceEnd = sliceStart + 8;
      const items = productItems.slice(sliceStart, sliceEnd);
      if (items.length === 0) return null;
      return (
        <section style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <div className="container-store">
            <ProductGrid products={items} title={title} />
          </div>
        </section>
      );
    }

    // ── Category sections ──
    case 'category_grid':
    case 'collection_banner':
    case 'collection_list':
    case 'category_pills': {
      if (categories.length === 0) return null;
      return (
        <section className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-6">
            Shop by Category
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`${storeUrl}/collections/${cat.slug}`}
                className="flex-shrink-0 px-5 py-2.5 text-sm font-medium border transition-colors hover:opacity-70"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  borderColor: 'color-mix(in srgb, var(--color-text) 12%, transparent)',
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      );
    }

    // ── About brand ──
    case 'about_brand':
      return <AboutBrand />;

    // ── Newsletter / WhatsApp CTA ──
    case 'newsletter':
      return <NewsletterSection />;

    // ── Marquee banner (scrolling text) ──
    case 'marquee': {
      return (
        <section
          className="overflow-hidden py-3 md:py-4"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="animate-marquee whitespace-nowrap flex gap-8">
            {['Free Shipping on ₹499+', 'COD Available', 'Easy Returns', '100% Authentic', 'Free Shipping on ₹499+', 'COD Available', 'Easy Returns', '100% Authentic'].map((text, i) => (
              <span key={i} className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {text} <span className="mx-4">•</span>
              </span>
            ))}
          </div>
        </section>
      );
    }

    // ── Logo bar (brand partners / as seen in) ──
    case 'logo_bar': {
      return (
        <section
          className="py-8 md:py-10"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="container-store text-center">
            <p className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Trusted By
            </p>
            <div className="flex items-center justify-center gap-8 md:gap-12 opacity-40">
              {/* Placeholder — seller can add their logos later */}
              {['Brand 1', 'Brand 2', 'Brand 3', 'Brand 4'].map((name, i) => (
                <div key={i} className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // ── Testimonials ──
    case 'testimonials':
    case 'testimonial_cards': {
      return (
        <section
          className="py-12 md:py-16"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <div className="container-store text-center">
            <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--color-primary)' }}>
              What Customers Say
            </p>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-8" style={{ color: 'var(--color-text)' }}>
              Real Reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { text: 'Amazing quality! Will order again.', name: 'Priya S.' },
                { text: 'Fast delivery and beautiful packaging.', name: 'Rahul M.' },
                { text: 'Exactly as shown. Love it!', name: 'Anita K.' },
              ].map((review, i) => (
                <div key={i} className="p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text)' }}>"{review.text}"</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>— {review.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // ── Video section ──
    case 'video_section': {
      return (
        <section
          className="py-12 md:py-16"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="container-store text-center">
            <div className="aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Video placeholder — add your brand story video
                </p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // ── UGC gallery (user generated content / Instagram) ──
    case 'ugc_gallery': {
      return (
        <section
          className="py-12 md:py-16"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <div className="container-store text-center">
            <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--color-primary)' }}>
              #ShopWith{storeSlug.replace(/-/g, '')}
            </p>
            <h2 className="font-display text-lg md:text-xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
              As Seen On Instagram
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
              {productItems.slice(0, 6).map((product: any, i: number) => {
                const img = product.images?.[0];
                const url = typeof img === 'object' ? (img.thumbnailUrl || img.originalUrl) : img;
                return url ? (
                  <div key={i} className="aspect-square overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </section>
      );
    }

    // ── Announcement bar (usually handled by layout, skip) ──
    case 'announcement_bar':
      return null;

    // ── Stats bar (metrics / numbers) ──
    case 'stats_bar': {
      return (
        <section
          className="py-8 md:py-10"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="container-store">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Happy Customers', value: '10,000+' },
                { label: 'Products', value: '500+' },
                { label: 'Cities Delivered', value: '100+' },
                { label: 'Years in Business', value: '5+' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-bold font-display" style={{ color: 'var(--color-primary)' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // ── Countdown timer (sale / launch) ──
    case 'countdown_timer': {
      return (
        <section
          className="py-6 md:py-8 text-center"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
        >
          <div className="container-store">
            <p className="text-sm font-medium uppercase tracking-wider mb-1">Limited Time Offer</p>
            <p className="text-lg font-display font-bold">Sale ends soon — Shop now!</p>
          </div>
        </section>
      );
    }

    // ── Quote block ──
    case 'quote_block': {
      return (
        <section
          className="py-12 md:py-16"
          style={{ backgroundColor: 'var(--color-background)' }}
        >
          <div className="container-store text-center max-w-2xl mx-auto">
            <blockquote className="text-lg md:text-xl font-display italic" style={{ color: 'var(--color-text)' }}>
              &ldquo;Quality is remembered long after the price is forgotten.&rdquo;
            </blockquote>
            <p className="text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>— Our Promise</p>
          </div>
        </section>
      );
    }

    // ── Unknown section types — silently skip ──
    default:
      return null;
  }
}

// ============================================================
// Classic Layout (fallback when no section config exists)
// ============================================================

function ClassicLayout({
  storeUrl,
  heroImage,
  categories,
  productItems,
}: {
  storeUrl: string;
  heroImage?: string;
  categories: any[];
  productItems: any[];
}) {
  return (
    <div>
      <HeroSection imageUrl={heroImage} />
      <TrustBar />

      {categories.length > 0 && (
        <section className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
          <h2 className="font-display text-xl md:text-2xl font-bold mb-6">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`${storeUrl}/collections/${cat.slug}`}
                className="flex-shrink-0 px-5 py-2.5 text-sm font-medium border transition-colors hover:opacity-70"
                style={{ borderRadius: 'var(--radius-lg)', borderColor: 'color-mix(in srgb, var(--color-text) 12%, transparent)' }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
        <ProductGrid products={productItems} title="Featured Products" />
        {productItems.length >= 8 && (
          <div className="text-center mt-8">
            <Link href={`${storeUrl}/collections/all`} className="btn-secondary text-sm">View All Products</Link>
          </div>
        )}
      </section>

      <AboutBrand />
      <NewsletterSection />
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function pickHeroImage(products: any[]): string | undefined {
  for (const product of products) {
    const images = product.images;
    if (!images || !Array.isArray(images) || images.length === 0) continue;
    const first = images[0];
    if (typeof first === 'object' && first !== null) {
      if (first.heroUrl) return first.heroUrl;
      if (first.originalUrl) return first.originalUrl;
    }
    if (typeof first === 'string' && first.startsWith('http')) return first;
  }
  return undefined;
}
