import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { PolicyPageClient } from './policy-client';

const VALID_PAGES: Record<string, string> = {
  shipping: 'Shipping Policy',
  returns: 'Returns & Refund Policy',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  contact: 'Contact Us',
  faq: 'Frequently Asked Questions',
};

interface PolicyPageProps {
  params: { storeSlug: string; pageSlug: string };
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const title = VALID_PAGES[params.pageSlug];
  if (!title) return { title: 'Page Not Found' };
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    return {
      title: `${title} | ${store.name}`,
      description: `${title} for ${store.name}`,
    };
  } catch {
    return { title };
  }
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const pageTitle = VALID_PAGES[params.pageSlug];
  if (!pageTitle) notFound();

  let store;
  try {
    store = await api.store.get.query({ slug: params.storeSlug });
  } catch {
    notFound();
  }
  if (!store) notFound();

  return (
    <PolicyPageClient
      store={store as any}
      pageSlug={params.pageSlug}
      pageTitle={pageTitle}
      storeSlug={params.storeSlug}
    />
  );
}
