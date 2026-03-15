import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { AboutPageClient } from './about-client';
import { storeBaseUrl, truncate } from '@/lib/seo';

interface AboutPageProps {
  params: { storeSlug: string };
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    const url = `${storeBaseUrl(params.storeSlug)}/about`;
    const title = `${store.name} — About Us`;
    const description = truncate(store.description, 160) || `Learn about ${store.name} — our story, mission, and values.`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { type: 'website', title, description, url, siteName: store.name },
      twitter: { card: 'summary_large_image', title, description },
    };
  } catch {
    return { title: 'About' };
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
  let store;
  try {
    store = await api.store.get.query({ slug: params.storeSlug });
  } catch {
    notFound();
  }
  if (!store) notFound();

  const products = await api.product.list.query({
    storeId: store.id,
    status: 'active',
    pagination: { page: 1, limit: 4 },
  });
  const productItems = (products as any).items || [];

  const heroImage = pickBestImage(productItems);

  return <AboutPageClient store={store as any} heroImage={heroImage} storeSlug={params.storeSlug} />;
}

function pickBestImage(products: any[]): string | null {
  for (const product of products) {
    if (!product.images?.length) continue;
    const img = product.images[0];
    const url = typeof img === 'object'
      ? (img.heroUrl || img.originalUrl)
      : typeof img === 'string' && img.startsWith('http') ? img : null;
    if (url) return url;
  }
  return null;
}
