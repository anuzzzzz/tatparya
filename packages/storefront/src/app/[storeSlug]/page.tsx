import { api } from '@/lib/trpc';
import { HeroSection } from '@/components/hero-section';
import { ProductGrid } from '@/components/product-grid';
import { TrustBar } from '@/components/trust-bar';
import { AboutBrand } from '@/components/about-brand';
import { NewsletterSection } from '@/components/newsletter-section';
import Link from 'next/link';

interface HomePageProps {
  params: { storeSlug: string };
}

export default async function StoreHomePage({ params }: HomePageProps) {
  const store = await api.store.get.query({ slug: params.storeSlug });
  const storeUrl = `/${params.storeSlug}`;

  // Fetch featured products (active, first page)
  const products = await api.product.list.query({
    storeId: store.id,
    status: 'active',
    pagination: { page: 1, limit: 8 },
  });

  // Fetch category tree
  let categories: any[] = [];
  try {
    categories = await api.category.getTree.query({ storeId: store.id });
  } catch {
    // Categories might not exist yet
  }

  // Pick the best product image for hero background
  // Prefer heroUrl > originalUrl, from first product that has images
  const productItems = (products as any).items || [];
  const heroImage = pickHeroImage(productItems);

  return (
    <div>
      {/* 1. Hero */}
      <HeroSection imageUrl={heroImage} />

      {/* 2. Trust Bar — COD, shipping, returns, secure */}
      <TrustBar />

      {/* 3. Categories (if any) */}
      {categories.length > 0 && (
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
      )}

      {/* 4. Featured Products */}
      <section className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
        <ProductGrid
          products={productItems}
          title="Featured Products"
        />

        {productItems.length >= 8 && (
          <div className="text-center mt-8">
            <Link href={`${storeUrl}/collections/all`} className="btn-secondary text-sm">
              View All Products
            </Link>
          </div>
        )}
      </section>

      {/* 5. About Brand (AI-generated bio) */}
      <AboutBrand />

      {/* 6. WhatsApp / Newsletter Signup */}
      <NewsletterSection />
    </div>
  );
}

/**
 * Pick the best product image for the hero background.
 * Prefers heroUrl (1200×1600) > originalUrl, skipping products with no images.
 */
function pickHeroImage(products: any[]): string | undefined {
  for (const product of products) {
    const images = product.images;
    if (!images || !Array.isArray(images) || images.length === 0) continue;

    const first = images[0];
    // New format: object with url variants
    if (typeof first === 'object' && first !== null) {
      if (first.heroUrl) return first.heroUrl;
      if (first.originalUrl) return first.originalUrl;
    }
    // Legacy format: plain URL string
    if (typeof first === 'string' && first.startsWith('http')) {
      return first;
    }
  }
  return undefined;
}
