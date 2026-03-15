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
    return {
      title: store.name,
      description: store.description || `Shop at ${store.name}`,
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
