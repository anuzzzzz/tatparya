import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { ImageGallery } from '@/components/image-gallery';
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

  const images = (product as any).images || [];
  const variants = (product as any).variants || [];
  const discount = product.compareAtPrice ? discountPercent(product.price, product.compareAtPrice) : 0;

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

      {/* Full description */}
      {product.description && (
        <section
          className="mt-12 pt-8 border-t max-w-3xl"
          style={{ borderColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}
        >
          <h2 className="font-display text-lg font-bold mb-4">Description</h2>
          <div
            className="prose prose-sm max-w-none leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {product.description.split('\n').map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
