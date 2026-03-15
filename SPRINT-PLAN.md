# Tatparya 14-Day Sprint Plan

> **Goal:** Complete product, every edge case handled. VC tech team reviews for 2 weeks.
> **Start:** March 15, 2026 (Session 15)
> **Deadline:** March 29, 2026

---

## Day 1-2: Payments + Buyer Discovery

### Razorpay Integration
- [ ] `razorpay.service.ts` — createOrder, verifyPaymentSignature, verifyWebhookSignature
- [ ] `razorpay-webhook.ts` — Fastify route, signature verification, idempotent status updates
- [ ] `order.router.ts` — initiatePayment + verifyPayment procedures
- [ ] `order.schema.ts` — InitiatePaymentInput, VerifyPaymentInput
- [ ] `checkout-form.tsx` — payment method selector (COD/Online), Razorpay modal, error recovery
- [ ] `env.ts` — add RAZORPAY_WEBHOOK_SECRET
- [ ] `app.ts` — register webhook before tRPC
- [ ] Payment failure → retry or switch to COD
- [ ] Payment pending cleanup (stale orders)

### Search, Sort, Filter
- [ ] Product search API — use existing tsvector index, `websearch_to_tsquery`
- [ ] Sort endpoint — price_asc, price_desc, newest, name_asc (query param)
- [ ] Filter endpoint — price range (min/max), category_id, tags (query params)
- [ ] `product.router.ts` — add `search` publicProcedure with all params
- [ ] Collections page UI — search bar with debounce, sort dropdown, filter sidebar
- [ ] Mobile filter: slide-out drawer
- [ ] Empty state for "no results"
- [ ] URL query params sync (shareable filtered URLs)
- [ ] Collection dropdown in navbar (mega menu with collection list)
- [ ] Breadcrumbs on collection pages

---

## Day 3-4: Seller Dashboard

### Auth
- [ ] Login page (`/auth/login`) — email/password via Supabase Auth
- [ ] Signup page (`/auth/signup`) — email, password, name, phone
- [ ] Forgot password flow
- [ ] Auth context provider — wrap dashboard, redirect if not authed
- [ ] JWT token management — pass to tRPC client in Authorization header
- [ ] Remove dev bypass from dashboard
- [ ] Protected routes — /dashboard/* requires auth

### Order Management
- [ ] `/dashboard/orders` — paginated table: order#, date, buyer, total, status, payment
- [ ] Order detail page — line items, address, timeline of status changes
- [ ] Status update buttons: confirm → process → ship (enter tracking) → deliver
- [ ] Cancellation with reason
- [ ] Revenue summary cards at top (today/week/month — uses existing getRevenueSummary)
- [ ] Filter by status, date range, payment method
- [ ] Export orders as CSV

### Product Management
- [ ] `/dashboard/products` — grid/list view of all products
- [ ] Quick edit: name, price, stock, status toggle (draft/active/archived)
- [ ] Bulk actions: publish, archive, delete
- [ ] Image reorder via drag
- [ ] Link to PDP preview

### Store Settings
- [ ] `/dashboard/settings` — store name, description, logo
- [ ] Payment settings: enable/disable COD, Razorpay key configuration
- [ ] Shipping settings: flat rate, free shipping threshold
- [ ] Social links, announcement bar config
- [ ] Business info: GSTIN, address (for invoices)

---

## Day 5-6: All 8 Verticals + Catalog AI

### Architecture: BaseBlueprint + Vertical Overrides
All 8 verticals need distinct storefronts. Build shared infrastructure, not 8 copies:

1. `BaseBlueprint.tsx` — shared section renderer, component registry
   - Takes ordered list of section configs, renders each
   - Shared sections: hero, product_grid, testimonials, newsletter, about, footer_trust
   - Reads config.sections array

2. Each vertical blueprint extends BaseBlueprint by defining:
   - Section order (which sections appear and in what sequence)
   - Section variants (e.g. hero_editorial vs hero_product_focus)
   - Unique sections only that vertical needs
   - PDP field configuration

### Blueprints (all 8 verticals)
- [ ] `BaseBlueprint.tsx` — shared section renderer, section component registry
- [ ] `RunwayBlueprint` — REFACTOR to use BaseBlueprint (fashion: hero_editorial, lookbook, style guide, trend)
- [ ] `HomeDecorBlueprint` — hero, room inspiration grid, material spotlight, lifestyle gallery, testimonials (Chumbak, Ellementry)
- [ ] `BeautyBlueprint` — hero, bestsellers, ingredient spotlight, routine builder, before-after, reviews (Minimalist, Plum, Sugar, Forest Essentials, Mamaearth, Bella Vita, Beardo)
- [ ] `FoodBlueprint` — hero, menu/categories, bestsellers, freshness promise, nutritional highlights, reviews (Whole Truth, Sleepy Owl)
- [ ] `JewelleryBlueprint` — hero, collections by occasion, bestsellers, craftsmanship, certification trust, reviews (CaratLane, Melorra, Tarinika, Amama)
- [ ] `ElectronicsBlueprint` — hero, product categories, specs comparison, tech features, warranty trust, reviews (boAt, Noise, CrossBeats)
- [ ] `FMCGBlueprint` — hero, shop by category, combo deals, value packs, subscription CTA, trust badges (derive from food + general patterns)
- [ ] `GeneralBlueprint` — safe default: hero, featured products, categories, testimonials, about, newsletter

### Blueprint Selector
- [ ] `getBlueprintForVertical(vertical: string)` utility
- [ ] Homepage `page.tsx` calls it with `store.vertical`
- [ ] Fallback: unknown vertical → GeneralBlueprint

### Scraping (composition engine)
- [ ] Add FMCG source URLs to `indian-d2c-brands.json` (Mamaearth essentials, The Man Company, Pee Safe, Sirona)
- [ ] Run homepage scraper for FMCG stores
- [ ] Run PDP scraper for all verticals with new URLs
- [ ] Generate updated `section-frequency-matrix.json` and `pdp-frequency-matrix.json`

### Catalog AI Extension (all 8 verticals)
- [ ] Extend GPT-4o Vision prompt per vertical to generate `vertical_data`:
  - Fashion: material, care_instructions, fit, occasion, style_notes
  - Home decor: dimensions (L×W×H), material, weight, care_instructions, room_suggestion
  - Beauty: ingredients, skin_type, usage_instructions, volume/weight, concerns_addressed
  - Food: ingredients, allergens, shelf_life, storage_instructions, nutritional_info
  - Jewellery: metal_type, purity, stone_type, certification, occasion, weight_grams
  - Electronics: specifications (key-value), warranty, compatibility, in_the_box
  - FMCG: quantity, usage_frequency, ingredients, certifications, shelf_life
  - General: key_features (bullets), specifications (key-value)
- [ ] PDP reads `vertical_data` per vertical
- [ ] PDP tab labels adapt per vertical ("Specifications" for electronics, "Ingredients" for beauty, etc.)

### PDP Frequency Matrix
- [ ] Load `pdp-frequency-matrix.json` as static asset
- [ ] PDP checks vertical + element → frequency threshold
- [ ] >80% = always show, 50-80% = show if data, <30% = hide
- [ ] Elements: size_chart, reviews, pincode, delivery_estimate, share, wishlist, compare, EMI, bulk_pricing, certification

---

## Day 7-8: SEO + Notifications + Analytics

### SEO
- [ ] Dynamic meta tags per page (Next.js Metadata API)
  - Homepage: store name + tagline
  - PDP: product name + price + description
  - Collections: collection name + count
- [ ] Open Graph images (auto-generated or product hero image)
- [ ] `sitemap.xml` generation — all products, collections, pages
- [ ] `robots.txt` — allow all, point to sitemap
- [ ] Canonical URLs
- [ ] Structured data (JSON-LD): Product, Organization, BreadcrumbList

### Email Notifications (Resend)
- [ ] `email.service.ts` — Resend SDK integration
- [ ] Order confirmation email template (HTML)
- [ ] Shipping update email template
- [ ] Wire to event bus: order.created → send confirmation, order.shipped → send tracking
- [ ] Seller notification: new order received

### WhatsApp Notifications (light — not full commerce)
- [ ] Order confirmation via WhatsApp (Gupshup or direct API)
- [ ] Shipping update with tracking link
- [ ] Wire to event bus same as email

### Analytics
- [ ] `/dashboard/analytics` page
- [ ] Revenue chart (daily/weekly/monthly) — query orders table
- [ ] Order count trend
- [ ] Top products by revenue
- [ ] Conversion funnel: visits → add-to-cart → checkout → paid (needs page view tracking)
- [ ] Page view tracking — simple middleware or client-side ping to API
- [ ] Google Analytics snippet injection (store config field for GA ID)

---

## Day 9-10: Production Hardening

### Custom Subdomains
- [ ] `storename.tatparya.in` routing
- [ ] Wildcard DNS setup documentation
- [ ] Next.js middleware: extract subdomain → resolve store slug
- [ ] SSL: use Cloudflare for wildcard cert
- [ ] Fallback: continue supporting `/store-slug` paths

### Error Monitoring
- [ ] Sentry SDK in API (Fastify plugin)
- [ ] Sentry SDK in storefront (Next.js integration)
- [ ] Source maps upload
- [ ] Error boundaries in React components
- [ ] Global error handler in API

### Rate Limiting
- [ ] Redis-based rate limiter on API
- [ ] Per-IP limits: 100 req/min general, 10 req/min for mutations
- [ ] Per-store limits: 1000 req/min
- [ ] Webhook endpoints exempt

### Image Optimization
- [ ] remove.bg integration on product card images (or at upload time)
- [ ] Next.js Image component with proper sizing
- [ ] Lazy loading for below-fold images
- [ ] WebP conversion at upload
- [ ] R2 CDN caching headers

### Performance
- [ ] Bundle analysis — remove unused deps
- [ ] Code splitting per route
- [ ] API response caching (Redis) for public endpoints
- [ ] Database query optimization (check N+1s)
- [ ] Lighthouse audit: target >90 on all metrics

---

## Day 11-12: Edge Cases & Security

### Payment Edge Cases
- [ ] Razorpay modal closed without paying → order stays payment_pending → cleanup cron
- [ ] Double-click submit prevention (disable button, debounce)
- [ ] Webhook arrives before client verify → idempotent
- [ ] Webhook retry handling (Razorpay retries for 24h)
- [ ] Partial payment / amount mismatch detection
- [ ] Refund initiation via dashboard

### Stock & Cart Edge Cases
- [ ] Out of stock → disable Add to Cart, show badge
- [ ] Low stock warning ("Only X left!")
- [ ] Stock check at checkout time (not just cart add)
- [ ] Concurrent stock updates — DB CHECK(stock >= 0)
- [ ] Cart item removed if product archived/deleted
- [ ] Cart expiry: Redis TTL or periodic cleanup
- [ ] Price change between cart and checkout → warning

### Order Edge Cases
- [ ] Buyer cancellation (within X hours)
- [ ] Duplicate order prevention (idempotency key)
- [ ] Order transitions enforced (already via ORDER_TRANSITIONS)
- [ ] Refund state: only from delivered/paid/processing
- [ ] RTO: auto-restock

### Security
- [ ] Input sanitization: XSS prevention
- [ ] SQL injection: verify Supabase parameterized, no raw SQL
- [ ] CSRF: verify Origin/Referer on mutations
- [ ] Rate limiting on auth endpoints (brute force)
- [ ] Webhook signature verification
- [ ] RLS policies audit — no bypass possible
- [ ] Secrets: no hardcoded keys
- [ ] CORS: lock to known domains in production
- [ ] Content Security Policy headers

### UI Completeness
- [ ] Empty states: cart, orders, products, collections, search
- [ ] Error states: API failure, network, 500 page
- [ ] Loading states: skeleton loaders on all data pages
- [ ] Form validation: inline errors, disabled submit
- [ ] Toast notifications: success/error/info
- [ ] Confirm dialogs: delete, cancel, remove

---

## Day 13-14: Testing + Polish

### E2E Flows
- [ ] Seller: signup → upload photos → store generates → customize → storefront
- [ ] Buyer: browse → search → filter → PDP → cart → COD checkout → confirmation
- [ ] Buyer: same flow, Razorpay test mode
- [ ] Seller: order notification → dashboard → process → ship → deliver
- [ ] Discount: seller creates code → buyer applies → reflected in total
- [ ] Out of stock: buyer blocked at add-to-cart
- [ ] Payment fail → retry → success
- [ ] Seller cancel → stock restored
- [ ] Multi-tenant: 2nd store, verify isolation

### Mobile
- [ ] Responsive audit: iPhone SE, iPhone 14, Pixel 7
- [ ] Touch targets ≥ 44px
- [ ] Bottom nav clear of content
- [ ] Cart drawer on mobile
- [ ] Checkout: numeric inputMode for phone/pincode
- [ ] Razorpay modal on mobile

### Multi-Vertical Testing (all 8)
- [ ] Fashion (Saskia) — RunwayBlueprint, PDP: material/fit/care
- [ ] Home decor (Rad Living) — HomeDecorBlueprint, PDP: dimensions/material/room
- [ ] Beauty (test store) — BeautyBlueprint, PDP: ingredients/skin_type/usage
- [ ] Food (test store) — FoodBlueprint, PDP: nutritional/allergens/shelf_life
- [ ] Jewellery (test store) — JewelleryBlueprint, PDP: purity/certification/metal
- [ ] Electronics (test store) — ElectronicsBlueprint, PDP: specs/warranty/compatibility
- [ ] FMCG (test store) — FMCGBlueprint, PDP: quantity/shelf_life/certifications
- [ ] General (test store) — GeneralBlueprint, PDP: features/specifications
- [ ] Each: correct homepage blueprint sections
- [ ] Each: correct PDP vertical fields shown/hidden

### Code Quality
- [ ] Remove console.log → proper logger
- [ ] Remove dead/commented code
- [ ] TypeScript strict: eliminate `any`
- [ ] Consistent error handling
- [ ] User-friendly API errors (no stack traces)
- [ ] README.md: setup, architecture, env vars

### Performance Final Pass
- [ ] Lighthouse: Performance >90, Accessibility >90, SEO >90
- [ ] FCP <1.5s, TTI <3s, LCP <2.5s, CLS <0.1

---

## Execution Pattern

1. Opus audits yesterday's work via GitHub, identifies issues
2. Opus writes Claude CLI prompts for the day's features
3. Anuj executes prompts in Claude Code
4. Opus reviews, writes fixes/next batch
5. Update ROADMAP.md checkboxes

## Definition of Done
- `pnpm build` passes
- Works on mobile + desktop
- Error/empty/loading states
- Client + server validation
- No console errors
- Follows existing patterns
