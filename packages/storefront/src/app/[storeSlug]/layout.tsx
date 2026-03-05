import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { designTokensToCssVars, cssVarsToStyle, buildGoogleFontsUrl } from '@/lib/store-config';
import { StoreProvider } from '@/components/store-provider';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { WhatsAppButton } from '@/components/whatsapp-button';
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

      {/* V3.2: Per-store custom CSS from Stylist AI */}
      {(config as any)?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: (config as any).customCSS }} />
      )}

      <div style={cssVarsToStyle(cssVars)} className="min-h-screen flex flex-col">
        <StoreProvider store={store as any}>
          <Navbar />
          {/*
            The navbar is `fixed`, so main content needs top padding.
            The homepage hero handles its own overlap with the transparent navbar.
            All other pages (products, collections, cart, etc.) need clearance.
            
            We use pt-16 (64px) which matches h-16 (md navbar height).
            The homepage page.tsx will use negative margin on the hero
            to pull it back behind the navbar.
          */}
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
          <WhatsAppButton />
        </StoreProvider>
      </div>
    </>
  );
}
