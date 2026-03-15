export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { designTokensToCssVars, cssVarsToStyle, buildGoogleFontsUrl } from '@/lib/store-config';
import { StoreProvider } from '@/components/store-provider';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { AnnouncementBar } from '@/components/announcement-bar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { ToastProvider } from '@/components/toast';
import type { DesignTokens, StoreConfig } from '@tatparya/shared';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { storeSlug: string };
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    const { storeBaseUrl, pickOgImage, truncate } = await import('@/lib/seo');
    const url = storeBaseUrl(params.storeSlug);
    const description = truncate(store.description, 160) || `Shop at ${store.name}`;

    // Try to find a hero image from products
    let ogImage: string | null = null;
    try {
      const products = await api.product.list.query({ storeId: store.id, status: 'active', pagination: { page: 1, limit: 4 } });
      const items = (products as any).items || [];
      for (const p of items) {
        ogImage = pickOgImage(p.images || []);
        if (ogImage) break;
      }
    } catch { /* no hero image */ }

    return {
      title: { default: store.name, template: `%s | ${store.name}` },
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        title: store.name,
        description,
        siteName: store.name,
        url,
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: store.name }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: store.name,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Store Not Found' };
  }
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  let store;
  try {
    store = await api.store.get.query({ slug: params.storeSlug });
  } catch {
    notFound();
  }

  if (!store) notFound();

  const config = store.storeConfig as unknown as StoreConfig;
  const design = config.design as DesignTokens;
  const cssVars = designTokensToCssVars(design);
  const fontsUrl = buildGoogleFontsUrl(design);

  return (
    <>
      {/* Load Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={fontsUrl} />

      {/* Disabled until customCSS quality is consistent
      {(config as any)?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: (config as any).customCSS }} />
      )}
      */}

      <div style={cssVarsToStyle(cssVars)} className="min-h-screen flex flex-col">
        <StoreProvider store={store as any}>
          <ToastProvider>
            {/* Sticky header stack — announcement bar sits above navbar, both stick together */}
            <div className="sticky top-0 z-50 w-full">
              <AnnouncementBar />
              <Navbar />
            </div>
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <WhatsAppButton />
            <MobileBottomNav />
          </ToastProvider>
        </StoreProvider>
      </div>
    </>
  );
}
