# Tatparya — What's Built & What's Left

> **Last updated:** Session 15, March 15 2026 (end of session)
> Update this file at the end of every session.

---

## BUILT & WORKING

### AI Pipelines
- Director AI (Claude Haiku), Stylist AI (Claude Sonnet), Validator (WCAG 100/100)
- Catalog AI (GPT-4o Vision), Content Generator, Photo Pipeline, Store Design AI
- Design tokens → CSS variables → live storefront rendering

### Chat System
- Chat UI, Haiku LLM, Action executor (42+ types), Action validators
- regenerate_design/catalog, update palette/fonts/hero/announcement/social, undo_design
- section toggle/reorder, product/collection CRUD, query products/orders/revenue

### Storefront Pages
- Homepage, PDP (full-featured), Collections (search/sort/filter), Cart, About, 6 Policies, 404

### Commerce — COD + Razorpay (Session 15)
- CheckoutForm with payment method selector (Online/COD)
- COD: form → publicCheckout → confirmation → stock decrement
- Razorpay: form → initiatePayment → modal → verifyPayment → confirmation
- RazorpayService (HMAC-SHA256 signature verification)
- Razorpay webhook (scoped raw body parser, idempotent)
- 12-state order machine, event bus, stock management

### Search/Sort/Filter (Session 15)
- Server-side sort in product repository (price/name/newest)
- Search bar with 300ms debounce, router.replace
- Price range filter, category pills, empty state

### Seller Dashboard (Session 15 — UNTESTED)
- Sidebar layout (Chat/Orders/Products/Analytics/Settings), mobile hamburger
- Auth: Supabase phone OTP, JWT tRPC client, dev bypass
- Orders: revenue stats, table, detail page, status actions, ship with tracking
- Products: grid/list view, inline edit, bulk actions
- Analytics: revenue cards, bar chart, recent orders, top products
- Settings: store info, business, payment, social, announcement

### SEO (Session 15 — UNTESTED)
- OG/Twitter tags on all pages, canonical URLs
- JSON-LD Product schema on PDP, Organization on homepage
- Dynamic per-store sitemap, robots.txt
- lib/seo.ts utilities

### Infrastructure
- pnpm monorepo, Fastify+tRPC, Next.js 14, Supabase, R2, Redis
- Multi-tenant, RLS, auth middleware, full-text search index
- Razorpay webhook before tRPC in Fastify

---

## ⚠️ NEEDS TESTING (Session 15 builds)
- [ ] pnpm build passes clean
- [ ] Razorpay flow (test mode)
- [ ] Search/sort/filter on collections
- [ ] Dashboard loads, orders/products/analytics/settings pages work
- [ ] SEO: view-source OG tags, /sitemap.xml, JSON-LD
- [ ] Full E2E: browse → cart → checkout → pay → confirmation

## NOT BUILT

### P1 — Multi-Vertical (blocked on scraper)
- [ ] BaseBlueprint + 7 vertical blueprints
- [ ] Catalog AI vertical_data
- [ ] PDP adapts per vertical

### P2 — Notifications
- [ ] Email via Resend (order confirmation, shipping)
- [ ] WhatsApp notifications

### P3 — Production
- [ ] Custom subdomains, Sentry, rate limiting, image optimization
- [ ] Shiprocket, GA/Pixel

### P4 — Edge Cases
- [ ] Payment failure recovery, out of stock, cart expiry
- [ ] Stock check at checkout, buyer cancellation, refund flow
- [ ] XSS audit, CSRF, RLS audit, CORS lockdown
- [ ] Mobile polish, empty/error/loading states, Lighthouse >90

---

## KEY FILES

| Area | File |
|------|------|
| Razorpay service | `packages/api/src/services/razorpay.service.ts` |
| Razorpay webhook | `packages/api/src/routes/razorpay-webhook.ts` |
| Checkout form | `packages/storefront/src/components/checkout-form.tsx` |
| Order router | `packages/api/src/routers/order.router.ts` |
| Product repo (sort) | `packages/api/src/repositories/product.repository.ts` |
| Collection filters | `packages/storefront/src/app/[storeSlug]/collections/[categorySlug]/collection-filters.tsx` |
| Dashboard layout | `packages/storefront/src/app/dashboard/layout.tsx` |
| Dashboard orders | `packages/storefront/src/app/dashboard/orders/page.tsx` |
| Dashboard order detail | `packages/storefront/src/app/dashboard/orders/[orderId]/page.tsx` |
| Dashboard products | `packages/storefront/src/app/dashboard/products/page.tsx` |
| Dashboard analytics | `packages/storefront/src/app/dashboard/analytics/page.tsx` |
| Dashboard settings | `packages/storefront/src/app/dashboard/settings/page.tsx` |
| SEO utilities | `packages/storefront/src/lib/seo.ts` |
| Sitemap | `packages/storefront/src/app/[storeSlug]/sitemap.xml/route.ts` |
| Auth provider | `packages/storefront/src/lib/chat/auth-provider.tsx` |
| Store design AI | `packages/api/src/services/store-design-ai.service.ts` |
| RunwayBlueprint | `packages/storefront/src/components/blueprints/runway/RunwayBlueprint.tsx` |
