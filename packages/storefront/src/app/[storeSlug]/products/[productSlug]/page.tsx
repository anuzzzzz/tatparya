import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { ImageGallery } from '@/components/image-gallery';
import { ProductTabs } from '@/components/product-tabs';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetailClient } from './product-detail-client';
import { formatPrice, discountPercent } from '@/lib/utils';
import { storeBaseUrl, pickOgImage, absoluteImageUrl, truncate } from '@/lib/seo';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: { storeSlug: string; productSlug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    const product = await api.product.get.query({ storeId: store.id, slug: params.productSlug });
    const base = storeBaseUrl(params.storeSlug);
    const url = `${base}/products/${params.productSlug}`;
    const title = `${product.name} | ${store.name}`;
    const description = truncate(product.description, 160)
      || `${product.name} — ${formatPrice(product.price)} at ${store.name}`;
    const ogImage = pickOgImage((product as any).images || []);

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        title,
        description,
        url,
        siteName: store.name,
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: product.name }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      robots: { index: true, follow: true },
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
    relatedProducts = ((allProducts as any).items || []).filter((p: any) => p.id !== product.id).slice(0, 4);
  } catch {}

  // ── JSON-LD: Product schema ──────────────────────────────
  const base = storeBaseUrl(params.storeSlug);
  const productUrl = `${base}/products/${params.productSlug}`;
  const imageUrls = rawImages
    .map((img: any) => {
      const raw = typeof img === 'object'
        ? (img.ogUrl || img.heroUrl || img.cardUrl || img.originalUrl)
        : typeof img === 'string' ? img : null;
      return absoluteImageUrl(raw);
    })
    .filter(Boolean) as string[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    url: productUrl,
    ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
    ...(product.hsnCode ? { sku: product.hsnCode } : {}),
    brand: {
      '@type': 'Brand',
      name: store.name,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: productUrl,
      ...(product.compareAtPrice && product.compareAtPrice > product.price
        ? { priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
        : {}),
    },
  };

  return (
    <div className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
