import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { ProductGrid } from '@/components/product-grid';
import { CollectionFilters } from './collection-filters';
import Link from 'next/link';
import type { Metadata } from 'next';

interface CollectionPageProps {
  params: { storeSlug: string; categorySlug: string };
  searchParams: { search?: string; page?: string; minPrice?: string; maxPrice?: string; sort?: string };
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    if (params.categorySlug === 'all') {
      return { title: `All Products | ${store.name}` };
    }
    // Try to find category name from tree
    const categories = await api.category.getTree.query({ storeId: store.id });
    const cat = findCategory(categories, params.categorySlug);
    return {
      title: `${cat?.name || 'Collection'} | ${store.name}`,
      description: `Shop ${cat?.name || 'products'} at ${store.name}`,
    };
  } catch {
    return { title: 'Collection' };
  }
}

// Recursively find category by slug in tree
function findCategory(categories: any[], slug: string): any | null {
  for (const cat of categories) {
    if (cat.slug === slug) return cat;
    if (cat.children?.length) {
      const found = findCategory(cat.children, slug);
      if (found) return found;
    }
  }
  return null;
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const store = await api.store.get.query({ slug: params.storeSlug });
  const storeUrl = `/${params.storeSlug}`;
  const isAll = params.categorySlug === 'all';

  // Find the category (unless "all")
  let category: any = null;
  let categories: any[] = [];
  try {
    categories = await api.category.getTree.query({ storeId: store.id });
    if (!isAll) {
      category = findCategory(categories, params.categorySlug);
      if (!category) notFound();
    }
  } catch {
    if (!isAll) notFound();
  }

  // Build query params
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;

  const productQuery: any = {
    storeId: store.id,
    status: 'active',
    pagination: { page, limit },
  };

  if (category) {
    productQuery.categoryId = category.id;
  }
  if (searchParams.search) {
    productQuery.search = searchParams.search;
  }
  if (searchParams.minPrice) {
    productQuery.minPrice = parseFloat(searchParams.minPrice);
  }
  if (searchParams.maxPrice) {
    productQuery.maxPrice = parseFloat(searchParams.maxPrice);
  }

  const result = await api.product.list.query(productQuery);
  const products = (result as any).items || [];
  const total = (result as any).total || 0;
  const hasMore = (result as any).hasMore || false;

  const title = isAll ? 'All Products' : category?.name || 'Collection';

  return (
    <div
      className="container-store"
      style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
        <Link href={storeUrl} className="hover:opacity-70 transition-opacity">
          Home
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>{title}</span>
      </nav>

      {/* Header + filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {total} {total === 1 ? 'product' : 'products'}
          </p>
        </div>

        <CollectionFilters
          categories={categories}
          currentSlug={params.categorySlug}
          storeUrl={storeUrl}
          searchParams={searchParams}
        />
      </div>

      {/* Category pills (if viewing all) */}
      {isAll && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-4">
          <Link
            href={`${storeUrl}/collections/all`}
            className="flex-shrink-0 px-4 py-2 text-xs font-medium transition-colors"
            style={{
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
            }}
          >
            All
          </Link>
          {categories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`${storeUrl}/collections/${cat.slug}`}
              className="flex-shrink-0 px-4 py-2 text-xs font-medium border transition-colors hover:opacity-70"
              style={{
                borderRadius: 'var(--radius-lg)',
                borderColor: 'color-mix(in srgb, var(--color-text) 12%, transparent)',
              }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Search bar results indicator */}
      {searchParams.search && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 mb-6 text-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>Results for &ldquo;{searchParams.search}&rdquo;</span>
          <Link
            href={`${storeUrl}/collections/${params.categorySlug}`}
            className="ml-auto text-xs font-medium hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Clear
          </Link>
        </div>
      )}

      {/* Product grid */}
      <ProductGrid products={products} />

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-10">
          {page > 1 && (
            <Link
              href={buildPageUrl(storeUrl, params.categorySlug, searchParams, page - 1)}
              className="btn-secondary text-xs !py-2 !px-4"
            >
              Previous
            </Link>
          )}
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Page {page} of {Math.ceil(total / limit)}
          </span>
          {hasMore && (
            <Link
              href={buildPageUrl(storeUrl, params.categorySlug, searchParams, page + 1)}
              className="btn-secondary text-xs !py-2 !px-4"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageUrl(
  storeUrl: string,
  categorySlug: string,
  searchParams: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  if (searchParams.search) params.set('search', searchParams.search);
  if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
  if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
  if (searchParams.sort) params.set('sort', searchParams.sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `${storeUrl}/collections/${categorySlug}${qs ? `?${qs}` : ''}`;
}
