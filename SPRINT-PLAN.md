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

## Day 5-6: Multi-Vertical + Catalog AI

### Blueprints
- [ ] `HomeDecorBlueprint.tsx` — hero, featured products, lifestyle grid, testimonials, about, trust
- [ ] `BeautyBlueprint.tsx` — hero, bestsellers, ingredients spotlight, before-after, reviews, routine builder
- [ ] `FoodBlueprint.tsx` — hero, menu/categories, bestsellers, freshness promise, reviews
- [ ] Blueprint selector — store vertical → correct blueprint (fallback to RunwayBlueprint)
- [ ] Each blueprint reads from same config schema as RunwayBlueprint
- [ ] Test with Rad Living (home_decor) — should use HomeDecorBlueprint

### Catalog AI Extension
- [ ] Extend GPT-4o Vision prompt to generate `vertical_data` fields:
  - Fashion: material, care_instructions, fit (relaxed/regular/slim), occasion
  - Home decor: dimensions, material, weight, care_instructions
  - Beauty: ingredients, skin_type, usage_instructions, volume/weight
  - Food: ingredients, allergens, shelf_life, storage, nutritional_info
- [ ] PDP reads `vertical_data` and renders appropriate sections
- [ ] PDP layout adapts per vertical (tab labels, section order, which fields show)

### PDP Frequency Matrix
- [ ] Load `pdp-frequency-matrix.json` from composition engine output
- [ ] Decide which PDP elements render per vertical based on frequency thresholds
- [ ] >80% frequency = always show, 50-80% = show if data exists, <30% = hide

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
- [ ] Webhook endpoints exempt from rate limiting

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
- [ ] Webhook arrives before client verify → idempotent (already handled in design)
- [ ] Webhook retry handling (Razorpay retries for 24h)
- [ ] Partial payment / payment amount mismatch detection
- [ ] Refund initiation via dashboard

### Stock & Cart Edge Cases
- [ ] Out of stock → disable "Add to Cart" button, show badge
- [ ] Low stock warning ("Only X left!")
- [ ] Stock check at checkout time (not just at cart add)
- [ ] Concurrent stock updates — use DB CHECK(stock >= 0) constraint
- [ ] Cart item removed if product archived/deleted
- [ ] Cart expiry: Redis TTL or periodic cleanup
- [ ] Price change between add-to-cart and checkout → show warning

### Order Edge Cases
- [ ] Buyer cancellation (within X hours)
- [ ] Duplicate order prevention (idempotency key)
- [ ] Order status can only transition forward (already enforced by ORDER_TRANSITIONS)
- [ ] Refund state: only from delivered/paid/processing
- [ ] RTO handling: auto-restock

### Security
- [ ] Input sanitization: all user inputs (XSS prevention)
- [ ] SQL injection: already using Supabase client (parameterized), verify no raw SQL
- [ ] CSRF: verify Origin/Referer headers on mutations
- [ ] Rate limiting on auth endpoints (brute force prevention)
- [ ] Webhook signature verification (already designed)
- [ ] RLS policies audit — verify no bypass possible
- [ ] Secrets: no hardcoded keys, all from env
- [ ] CORS: lock down to known domains in production
- [ ] Content Security Policy headers

### UI Completeness
- [ ] Empty states: cart empty, no orders, no products, no collections, search no results
- [ ] Error states: API failure, network error, 500 page
- [ ] Loading states: skeleton loaders on all data-fetching pages
- [ ] Form validation: inline errors, submit disabled until valid
- [ ] Toast notifications: success/error/info for all mutations
- [ ] Confirm dialogs: delete product, cancel order, remove from cart

---

## Day 13-14: Testing + Polish

### E2E Flows (manual test each)
- [ ] Seller: signup → upload photos → store generates → customize via chat → see storefront
- [ ] Buyer: browse → search → filter → PDP → add to cart → checkout COD → confirmation
- [ ] Buyer: same flow but pay via Razorpay (test mode)
- [ ] Seller: receive order notification → view in dashboard → process → ship → deliver
- [ ] Seller: apply discount code → buyer uses at checkout → discount reflected
- [ ] Buyer: attempt purchase of out-of-stock item → blocked
- [ ] Buyer: payment fails → retry → success
- [ ] Seller: cancel order → stock restored
- [ ] Multiple stores: create 2nd store, verify complete isolation

### Mobile
- [ ] Full responsive audit on iPhone SE, iPhone 14, Pixel 7
- [ ] Touch targets: minimum 44px
- [ ] Bottom nav doesn't overlap content
- [ ] Cart drawer works on mobile
- [ ] Checkout form: proper input modes (numeric for phone/pincode)
- [ ] Razorpay modal on mobile

### Multi-Vertical Testing
- [ ] Fashion store (Saskia) — RunwayBlueprint
- [ ] Home decor store (Rad Living) — HomeDecorBlueprint
- [ ] Beauty store (test) — BeautyBlueprint
- [ ] Food store (test) — FoodBlueprint
- [ ] Each: PDP shows correct vertical-specific fields

### Code Quality
- [ ] Remove all console.log (replace with proper logger)
- [ ] Remove dead code / commented code
- [ ] TypeScript strict mode: no `any` escape hatches
- [ ] Consistent error handling patterns
- [ ] API error messages: user-friendly, no stack traces
- [ ] README.md: setup instructions, architecture overview, env vars

### Performance Final Pass
- [ ] Lighthouse: Performance >90, Accessibility >90, SEO >90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Largest Contentful Paint <2.5s
- [ ] No layout shift (CLS <0.1)

---

## Daily Execution Pattern

1. Morning: Opus (this chat) audits yesterday's work via GitHub, identifies issues
2. Opus writes Claude CLI prompts for the day's features
3. Anuj executes prompts in Claude Code
4. Evening: Opus reviews, writes fixes/next batch
5. End of day: Update ROADMAP.md checkboxes

## Definition of Done (per feature)
- TypeScript compiles (`pnpm build` passes)
- Works on mobile and desktop
- Error/empty/loading states handled
- Input validation (client + server)
- No console errors
- Follows existing code patterns
