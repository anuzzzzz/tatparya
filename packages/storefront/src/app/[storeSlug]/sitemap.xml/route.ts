import { api } from '@/lib/trpc';
import { storeBaseUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function toDate(d: string | null | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: { storeSlug: string } },
) {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    const base = storeBaseUrl(params.storeSlug);
    const now = new Date().toISOString().slice(0, 10);

    const entries: string[] = [];

    // Homepage
    entries.push(urlEntry(base, toDate(store.updatedAt), 'daily', '1.0'));

    // Static pages
    const staticPages = [
      { path: '/about',            changefreq: 'monthly', priority: '0.6' },
      { path: '/collections/all',  changefreq: 'daily',   priority: '0.8' },
      { path: '/pages/contact',    changefreq: 'monthly', priority: '0.3' },
      { path: '/pages/shipping',   changefreq: 'monthly', priority: '0.3' },
      { path: '/pages/returns',    changefreq: 'monthly', priority: '0.3' },
      { path: '/pages/privacy',    changefreq: 'monthly', priority: '0.3' },
      { path: '/pages/terms',      changefreq: 'monthly', priority: '0.3' },
      { path: '/pages/refund',     changefreq: 'monthly', priority: '0.3' },
    ];
    for (const { path, changefreq, priority } of staticPages) {
      entries.push(urlEntry(`${base}${path}`, now, changefreq, priority));
    }

    // Categories
    try {
      const categories: any[] = await api.category.getTree.query({ storeId: store.id });
      const flatCats = flattenCategories(categories);
      for (const cat of flatCats) {
        entries.push(urlEntry(
          `${base}/collections/${cat.slug}`,
          toDate(cat.updatedAt),
          'daily',
          '0.8',
        ));
      }
    } catch { /* no categories */ }

    // Products
    try {
      let page = 1;
      const limit = 100;
      while (true) {
        const result = await api.product.list.query({
          storeId: store.id,
          status: 'active',
          pagination: { page, limit },
        }) as any;
        const items: any[] = result.items || [];
        for (const product of items) {
          entries.push(urlEntry(
            `${base}/products/${product.slug}`,
            toDate(product.updatedAt),
            'weekly',
            '0.7',
          ));
        }
        if (!result.hasMore || items.length < limit) break;
        page++;
        if (page > 20) break; // safety cap
      }
    } catch { /* no products */ }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}

function flattenCategories(cats: any[]): any[] {
  const result: any[] = [];
  for (const cat of cats) {
    result.push(cat);
    if (cat.children?.length) result.push(...flattenCategories(cat.children));
  }
  return result;
}
