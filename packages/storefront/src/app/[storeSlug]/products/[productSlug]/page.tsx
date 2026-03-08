import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { ImageGallery } from '@/components/image-gallery';
import { ProductTabs } from '@/components/product-tabs';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetailClient } from './product-detail-client';
import { formatPrice, discountPercent } from '@/lib/utils';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: { storeSlug: string; productSlug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    const product = await api.product.get.query({ storeId: store.id, slug: params.productSlug });
    return {
      title: `${product.name} | ${store.name}`,
      description: product.description?.slice(0, 160) || `${product.name} - ${formatPrice(product.price)}`,
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  let store, product;
  try {
    store = await api.store.get.query({ slug: params.storeSlug });
    product = await api.product.get.query({ storeId: store.id, slug: params.productSlug });
  } catch {
    notFound();
  }

  if (!product) notFound();

  const rawImages = (product as any).images || [];
  const images = rawImages.map((img: any) =>
    typeof img === 'string' ? { originalUrl: img, cardUrl: img, thumbnailUrl: img } : img
  );
  const variants = (product as any).variants || [];
  const discount = product.compareAtPrice ? discountPercent(product.price, product.compareAtPrice) : 0;

  // Fetch related products (same store, excluding current)
  let relatedProducts: any[] = [];
  try {
    const allProducts = await api.product.list.query({
      storeId: store.id,
      status: 'active',
      pagination: { page: 1, limit: 5 },
    });
    relatedProducts = ((allProducts as any).items || (allProducts as any).products || []).filter((p: any) => p.id !== product.id).slice(0, 4);
  } catch {}

  return (
    <div className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Images */}
        <ImageGallery images={images} />

        {/* Product info + add to cart (client component) */}
        <ProductDetailClient
          product={product as any}
          variants={variants}
          storeId={store.id}
          storeSlug={params.storeSlug}
          discount={discount}
        />
      </div>

      {/* Description / Shipping / Returns tabs */}
      <ProductTabs description={product.description || undefined} />

      {/* You May Also Like */}
      {relatedProducts.length > 0 && (
        <section
          className="mt-16 pt-12 border-t"
          style={{ borderColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}
        >
          <ProductGrid products={relatedProducts} title="You May Also Like" />
        </section>
      )}
    </div>
  );
}
