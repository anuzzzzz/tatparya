import { api } from '@/lib/trpc';
import { HeroSection } from '@/components/hero-section';
import { ProductGrid } from '@/components/product-grid';
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

  return (
    <div>
      {/* Hero */}
      <HeroSection />

      {/* Categories (if any) */}
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

      {/* Featured Products */}
      <section className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
        <ProductGrid
          products={(products as any).items || []}
          title="Featured Products"
        />

        {((products as any).items || []).length >= 8 && (
          <div className="text-center mt-8">
            <Link href={`${storeUrl}/collections/all`} className="btn-secondary text-sm">
              View All Products
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
