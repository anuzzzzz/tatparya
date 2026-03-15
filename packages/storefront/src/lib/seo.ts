/**
 * SEO utilities — absolute URL helpers for metadata and JSON-LD.
 * Mirrors imageUrl() from utils.ts but always returns an absolute HTTPS URL.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://tatparya.in').replace(/\/$/, '');
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_URL || '').replace(/\/$/, '');

export function siteUrl(): string {
  return SITE_URL;
}

export function storeBaseUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

/**
 * Resolve an image URL to an absolute HTTPS URL suitable for OG/Twitter metadata.
 * Returns null if the URL cannot be made absolute (e.g. data URIs, unresolvable keys).
 */
export function absoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Already absolute
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  // Data URIs are too large for OG tags
  if (url.startsWith('data:')) return null;
  // Local upload served by Next.js public/
  if (url.startsWith('/uploads/')) return `${SITE_URL}${url}`;
  // R2 key
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${url}`;
  // Can't resolve without R2 base URL
  return null;
}

/**
 * Pick the best absolute image URL from a product images array.
 * Prefers ogUrl > heroUrl > cardUrl > originalUrl.
 */
export function pickOgImage(images: unknown[]): string | null {
  if (!Array.isArray(images)) return null;
  for (const img of images) {
    if (!img) continue;
    let url: string | null = null;
    if (typeof img === 'object' && img !== null) {
      const i = img as Record<string, unknown>;
      url = (i['ogUrl'] || i['heroUrl'] || i['cardUrl'] || i['originalUrl']) as string | null;
    } else if (typeof img === 'string') {
      url = img;
    }
    const abs = absoluteImageUrl(url);
    if (abs) return abs;
  }
  return null;
}

/**
 * Truncate a string to maxLen characters, respecting word boundaries.
 */
export function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
}
