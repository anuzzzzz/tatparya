# Tatparya — ROADMAP

Single source of truth for build state. Updated end of every session.
**Last updated: Session 14 — March 15, 2026**

---

## BUILT AND WORKING

### AI Pipelines
- **Director AI** — Haiku, ~5s, orchestrates the full store generation flow
- **Stylist AI** — Sonnet + image analysis, ~23s, generates design tokens from brand inputs
- **Validator** — WCAG 100/100 contrast checker, runs after every palette generation
- **Catalog AI** — GPT-4o Vision, classifies and enriches product images
- **Content Generator** — AI-written section titles, eyebrows, store bio, hero copy
- **Photo Pipeline** — classifier → triage → enhancer → quality gate → orchestrator
- **Store Design AI** — 48KB service, full end-to-end pipeline from brief to deployed store
- **Design tokens → CSS vars** — full token-to-variable mapping, injected per-store at runtime

### Chat System (Dashboard)
- Chat UI at `/dashboard` — message thread, typing indicator, rich cards (product/order/stats/action buttons)
- Haiku LLM — server-side streaming, system prompt with store context
- **Action executor** — 42+ action types dispatched from LLM intent
- Action validators with whitelist — prevents prompt injection
- `store.regenerate_design` — full redesign in ~27s from chat
- `store.regenerate_catalog` — re-runs catalog AI on existing products
- Palette / fonts / hero_text / hero_cta / announcement / social_links — live update via chat
- `undo_design` — 1-level snapshot rollback
- `section.toggle` / `section.reorder` — homepage section management
- Product CRUD — create, update, delete, toggle status via chat
- Collection CRUD — create, update, delete via chat
- `query.products` / `query.orders` / `query.revenue` — read-only queries surfaced as cards
- LLM prompt hardening — injection-resistant system prompt, action schema validation

### Storefront

**Homepage**
- Polymorphic section registry (hero variants, product carousel/editorial/grid, trust bar, marquee, testimonials, stats bar, category tiles, about, newsletter, UGC gallery, countdown, quote block)
- Background alternation + vibeWeight spatial rhythm
- RunwayBlueprint — full fashion vertical layout
- ClassicLayout fallback

**Product Detail Page (PDP)**
- Image gallery with thumbnail strip and mobile dot indicator
- Image lightbox — click to zoom, arrow key nav, Esc to close
- Variant selector
- Quantity stepper
- Add to cart (with loading/success states)
- Tabs — description, shipping, returns
- Trust badges
- Sticky mobile add-to-cart bar (IntersectionObserver)
- Delivery estimate
- WhatsApp share / WhatsApp inquiry
- Size chart modal — vertical-aware (fashion/bags/jewellery)
- Pincode delivery check — 6-digit input, shows delivery days + COD/express
- Stock urgency badge — "Only X left", seeded by product ID for consistency
- Wishlist heart toggle

**Collections**
- `/collections/all` and `/collections/[categorySlug]`
- Search via `?search=` query param
- Price range filter, sort (price/name asc/desc)
- Pagination
- Product count display
- Category pills (when viewing all)

**Cart**
- Cart page with line items, quantity update, remove
- Discount code input
- `?checkout=true` triggers checkout flow inline
- CartSummaryMini sidebar on desktop

**Checkout (COD E2E)**
- CheckoutForm — full Indian address form (name, phone, address, city, state, pincode)
- Phone validation (10-digit Indian mobile)
- Guest checkout via `order.publicCheckout` tRPC mutation
- Subtotal calc, discount codes, tax, shipping

**Order Confirmation**
- Line items with images, address summary, payment method, total
- WhatsApp share of order

**Other Pages**
- About page
- 6 policy pages (shipping, returns, privacy, terms, contact, FAQ) via `/pages/[pageSlug]`
- 404 with store-slug-aware "Go Home" link
- Loading skeleton

**Components**
- `RunwayBlueprint` — fashion vertical homepage + PDP cards with image placeholder fallback
- `Navbar` — sticky + glass on scroll, categories from DB, mobile hamburger menu
- `AnnouncementBar` — sticky alongside navbar (shared sticky container, no overlap)
- `Footer` — default / minimal / dark variants, social icons, payment badges (Visa/Mastercard/UPI/COD/Net Banking)
- `ProductCard` — hover zoom, discount badge, wishlist
- Mobile bottom nav (Home / Shop / Cart / Account)
- Toast notification system
- Cart drawer

### Commerce — Order System
- `OrderService.createOrder` — subtotal, discount codes, tax, shipping, stock decrement, event emission
- `OrderRepository` — create / findById / list / updateStatus / generateOrderNumber / getRevenueSummary
- 12-state order machine
- `PaymentMethod` enum — upi / card / netbanking / wallet / cod
- `PaymentStatus` enum — pending / authorized / captured / failed / refunded
- Stock decrement on order, restore on cancel / RTO
- Event bus for all order lifecycle events

### Infrastructure
- pnpm monorepo
- Fastify + tRPC API (port 3001)
- Next.js 14 App Router (port 3000)
- Supabase local (port 54321)
- Cloudflare R2 for image storage
- Redis
- Multi-tenant slug routing middleware
- `force-dynamic` caching fix on store pages

---

## NOT BUILT

### P0 — Blockers for real revenue
- **Razorpay** — online payment gateway integration (UPI/card/netbanking live)
- **Search / sort / filter** — server-side on collections (currently client-side sort only)

### P1 — Needed before seller onboarding
- Seller auth (login, signup, session management)
- Order management UI (seller dashboard — view, update status, filter by state)
- Product management UI (bulk upload, image manager, edit without chat)
- Basic analytics dashboard (revenue chart, top products, order funnel)

### P2 — AI completeness
- Multi-vertical blueprints (beauty, jewellery, home decor — beyond Runway/fashion)
- Catalog AI `vertical_data` consumption — currently generated but not rendered on PDP
- PDP frequency matrix — AI-scored section ordering not yet consumed by storefront
- Suggestion chips in chat UI — visible but not wired to actions

### P3 — Scale + ops
- Custom domains (CNAME routing per store)
- SEO — dynamic sitemap, OG tags, structured data
- Email notifications (order confirmation, shipping update)
- WhatsApp notifications via WABA API
- Shiprocket / Delhivery integration for real tracking
- Error monitoring (Sentry)
- Rate limiting on tRPC mutations
- Image optimization pipeline (WebP conversion, CDN resizing)
- Analytics event tracking (GA4 / Posthog)

---

## KEY FILES REFERENCE

| Feature Area | File Path |
|---|---|
| **Checkout form** | `packages/storefront/src/components/checkout-form.tsx` |
| **Cart drawer** | `packages/storefront/src/components/cart-drawer.tsx` |
| **Cart page** | `packages/storefront/src/app/[storeSlug]/cart/page.tsx` |
| **Order confirmation** | `packages/storefront/src/app/[storeSlug]/order/[orderId]/page.tsx` |
| **Order router (tRPC)** | `packages/api/src/routers/order.router.ts` |
| **Order service** | `packages/api/src/services/order.service.ts` |
| **Order repository** | `packages/api/src/repositories/order.repository.ts` |
| **Order schema** | `packages/api/src/schemas/order.schema.ts` |
| **API env config** | `packages/api/src/env.ts` |
| **Fastify app entry** | `packages/api/src/app.ts` |
| **Chat action executor** | `packages/api/src/services/chat/action-executor.ts` |
| **Chat LLM service** | `packages/api/src/services/chat/chat-llm.service.ts` |
| **Store design AI** | `packages/api/src/services/store-design-ai.service.ts` |
| **RunwayBlueprint** | `packages/storefront/src/components/blueprints/runway/RunwayBlueprint.tsx` |
| **Store provider (context)** | `packages/storefront/src/components/store-provider.tsx` |
| **Store router (tRPC)** | `packages/api/src/routers/store.router.ts` |
| **PDP client component** | `packages/storefront/src/app/[storeSlug]/products/[productSlug]/product-detail-client.tsx` |
| **Image gallery + lightbox** | `packages/storefront/src/components/image-gallery.tsx` |
| **Size chart modal** | `packages/storefront/src/components/size-chart-modal.tsx` |
| **Pincode check** | `packages/storefront/src/components/pincode-check.tsx` |
| **Navbar** | `packages/storefront/src/components/navbar.tsx` |
| **Footer** | `packages/storefront/src/components/footer.tsx` |
| **Store layout** | `packages/storefront/src/app/[storeSlug]/layout.tsx` |
| **Homepage sections** | `packages/storefront/src/app/[storeSlug]/page.tsx` |
| **Collections page** | `packages/storefront/src/app/[storeSlug]/collections/[categorySlug]/page.tsx` |
| **Dashboard chat UI** | `packages/storefront/src/app/dashboard/page.tsx` |
| **Chat thread component** | `packages/storefront/src/components/chat/chat-thread.tsx` |
