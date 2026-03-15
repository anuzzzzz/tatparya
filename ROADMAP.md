# Tatparya — What's Built & What's Left

> **Last updated:** Session 15, March 15 2026
> Update this file at the end of every session.

---

## BUILT & WORKING

### AI Pipelines
- Director AI (Claude Haiku) — typography, mood, rhythm (~5s)
- Stylist AI (Claude Sonnet + product images) — palette, layout, CSS (~23s)
- Validator — WCAG contrast, auto-fixes, score 100/100
- Catalog AI (GPT-4o Vision) — photos → names, descriptions, prices, tags, HSN codes
- Content Generator — testimonials, marquee, newsletter, section titles
- Photo Pipeline — classifier, triage, enhancer, quality gate, orchestrator
- Store Design AI (48KB) — full Director→Stylist→Validator pipeline
- Design tokens → CSS variables → live storefront rendering

### Chat System
- Chat UI at /dashboard with message thread, photo upload, action buttons
- Haiku LLM (server-side) — natural language → structured actions
- Action executor (42+ types), action validators (whitelist, rejects hallucinations)
- store.regenerate_design (27s), regenerate_catalog
- update: palette, fonts, hero_text, hero_cta, announcement, social_links
- undo_design (1-level snapshot)
- section.toggle, section.reorder
- product CRUD, collection CRUD
- query: products, orders, revenue (rich card responses)
- LLM prompt hardening — strict vocabulary, can't-do list, section picker

### Storefront Pages
- Homepage — hero, product grid, testimonials, newsletter, about, marquee, stats
- PDP — gallery, variants, quantity, add-to-cart, description/shipping/returns tabs, trust badges, sticky mobile bar, delivery estimate, WhatsApp share, size chart modal, image lightbox/zoom, pincode check, stock urgency, wishlist
- Collections page with pagination
- Cart — items, qty update, remove, subtotal, discount code apply
- About, 6 Policy pages, 404, loading skeleton

### Storefront Components
- RunwayBlueprint (fashion-specific layout)
- Navbar (sticky, transparent over hero, glass on scroll, categories from DB)
- Announcement bar, Footer (social icons, payment badges)
- Product card (hover zoom, discount badge, wishlist)
- Mobile bottom nav, Toast system, Cart drawer

### Commerce — COD Works E2E
- CheckoutForm — full Indian address form, phone validation, 38 states, landmark, notes
- Cart → Checkout via ?checkout=true
- CartSummaryMini sidebar
- OrderService.createOrder — subtotal, discounts, tax, shipping, stock decrement, events
- order.publicCheckout tRPC (guest, no auth)
- Order confirmation page — line items, address, payment, WhatsApp share
- OrderRepository — create, findById, list, updateStatus, generateOrderNumber, getRevenueSummary
- 12-state order machine with transition validation
- PaymentMethod: upi, card, netbanking, wallet, cod
- PaymentStatus: pending, authorized, captured, failed, refunded
- Stock decrement on order, restore on cancel/RTO
- Event bus: order.created, .paid, .shipped, .delivered, .cancelled, etc.

### Infrastructure
- pnpm monorepo (shared, api, storefront)
- Fastify + tRPC (port 3001), Next.js 14 (port 3000)
- Supabase (local 54321), Cloudflare R2, Redis
- Multi-tenant slug routing, force-dynamic caching fix
- RLS policies on all tables
- Auth middleware: publicProcedure, protectedProcedure, storeProcedure
- Full-text search index on products (tsvector with name/description/tags)
- Collections + collection_products junction table
- Invoices table, discounts table, cart_abandonments table

### DB Schema (6 migrations)
- stores, categories, products, variants, gst_rates
- orders, invoices, discounts, cart_abandonments
- collections, collection_products, product_categories
- wa_conversations, wa_messages, wa_sessions, wa_catalog_sync, wa_order_tracking
- media
- RLS on all tables with user_owns_store() helper

---

## NOT BUILT

### P0 — Store Can't Sell Without These
- [ ] Razorpay integration (service, webhook, checkout modal)
- [ ] Search on collections page (products have tsvector index, no frontend query)
- [ ] Sort dropdown on collections (price asc/desc, newest, name)
- [ ] Filter sidebar on collections (price range, category, tags)
- [ ] Collection dropdown/mega menu in nav

### P1 — Seller Can't Operate Without These
- [ ] Seller auth UI (login/signup page — Supabase Auth + middleware exists, no UI)
- [ ] Seller onboarding flow (guided wizard or improved chat flow)
- [ ] Order management dashboard (table with status, fulfillment, tracking)
- [ ] Product management grid (visual editor alongside chat)
- [ ] Analytics (page views, orders, revenue, conversion)
- [ ] Store settings page (payment config, shipping, store info)

### P2 — Platform Completeness
- [ ] Multi-vertical blueprints (home_decor, beauty, food, jewellery, electronics)
- [ ] Catalog AI vertical_data (material, dimensions, care, features, weight)
- [ ] PDP layout adapts per vertical
- [ ] PDP frequency matrix consumption (data exists, not wired)
- [ ] GST calculation in cart/checkout totals
- [ ] Shipping rate calculation (currently hardcoded)

### P3 — Production & Scale
- [ ] Custom subdomains (storename.tatparya.in)
- [ ] SEO (meta tags, OG images, sitemap.xml, robots.txt)
- [ ] Email notifications (order confirmation, shipping update) via Resend
- [ ] WhatsApp notifications (order confirmation)
- [ ] Shiprocket integration (rates, labels, tracking)
- [ ] Error monitoring (Sentry)
- [ ] API rate limiting
- [ ] Image optimization (remove.bg on product cards, lazy loading)
- [ ] Google Analytics / Pixel
- [ ] WhatsApp commerce (5 tables, zero code)

### P4 — Edge Cases & Security
- [ ] Payment failure recovery (retry, switch to COD)
- [ ] Out of stock handling (disable add-to-cart, show badge)
- [ ] Cart expiry / stale cart cleanup
- [ ] Concurrent stock update handling (optimistic locking)
- [ ] Order cancellation from buyer side
- [ ] Refund flow
- [ ] Input sanitization audit
- [ ] CSRF protection
- [ ] Mobile responsive polish pass
- [ ] Empty states everywhere
- [ ] Error states everywhere
- [ ] Loading states audit
- [ ] Accessibility audit
- [ ] Performance (bundle size, image lazy load, CDN)

---

## KEY FILES

| Area | File |
|------|------|
| Checkout form | `packages/storefront/src/components/checkout-form.tsx` |
| Cart view + drawer | `packages/storefront/src/components/cart-drawer.tsx` |
| Cart page | `packages/storefront/src/app/[storeSlug]/cart/page.tsx` |
| Order confirmation | `packages/storefront/src/app/[storeSlug]/order/[orderId]/order-confirmation-client.tsx` |
| Order router | `packages/api/src/routers/order.router.ts` |
| Order service | `packages/api/src/services/order.service.ts` |
| Order repository | `packages/api/src/repositories/order.repository.ts` |
| Order schema | `packages/shared/src/schemas/order.schema.ts` |
| Env vars | `packages/api/src/env.ts` |
| Fastify app | `packages/api/src/app.ts` |
| tRPC context (auth) | `packages/api/src/trpc/context.ts` |
| tRPC procedures | `packages/api/src/trpc/trpc.ts` |
| Action executor | `packages/api/src/services/action-executor.ts` |
| Chat LLM | `packages/api/src/services/chat-llm.service.ts` |
| Store design AI | `packages/api/src/services/store-design-ai.service.ts` |
| RunwayBlueprint | `packages/storefront/src/components/blueprints/RunwayBlueprint.tsx` |
| Store provider | `packages/storefront/src/components/store-provider.tsx` |
| Store router | `packages/api/src/routers/store.router.ts` |
| Product router | `packages/api/src/routers/product.router.ts` |
| Cart router | `packages/api/src/routers/cart.router.ts` |
| DB: core tables | `supabase/migrations/20250201000001_core_tables.sql` |
| DB: order tables | `supabase/migrations/20250201000002_order_tables.sql` |
| DB: collections | `supabase/migrations/20250201000005_collections_categories.sql` |
| DB: RLS policies | `supabase/migrations/20250201000004_rls_policies.sql` |
