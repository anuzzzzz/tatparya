# Tatparya — Session 15 Transition Document

> **Date:** March 15, 2026 (Session 14-15 sprint)
> **Repos:** github.com/anuzzzzz/tatparya + github.com/anuzzzzz/tatparya-composition-engine
> **Context:** 14-day sprint to complete product for VC tech review

---

## WHERE WE CAME FROM

Tatparya started as an AI-powered D2C e-commerce platform — "entire selling layer ready in under 10 minutes." Seller uploads product photos, gets a complete store with payments, shipping, notifications, analytics, all controllable via a chat interface.

### Evolution across sessions (key milestones)

**Sessions 1-8:** Core infrastructure. pnpm monorepo, Fastify+tRPC API, Next.js 14 storefront, Supabase, Cloudflare R2. Store generation pipeline (Director AI → Stylist AI → Validator). Catalog AI (GPT-4o Vision for photo → product data). Basic storefront pages.

**Sessions 9-10:** First attempt at flexible polymorphic layouts. This FAILED — too many degrees of freedom produced inconsistent output. AI couldn't handle unconstrained layout decisions.

**Sessions 11-12:** PIVOT to blueprinted compositions. Abandoned flexible-sections architecture. Created RunwayBlueprint (fashion-specific, handcrafted 29KB component). Started TinyFish scraping pipeline to make layout decisions data-driven instead of AI-driven.

**Session 13:** Composition engine matured. Homepage scraper done (107 stores initially). Section frequency matrix generated. PDP scraper added (35 product URLs across 7 verticals).

**Session 14:** Chat wired to Director-Stylist pipeline (27s E2E store generation). LLM prompt hardening (action whitelist, can't-do list, section picker). PDP polished (size chart, zoom, pincode, urgency, wishlist). RunwayBlueprint reads config fonts/titles. Nav fetches categories. Shopify parity audit identified 35 gaps.

**Session 15 (this session):** Sprint build. 7 major features in one session. Verified clean — all 17 routes return 200, zero TypeScript errors.

---

## ANTI-PATTERNS (learned the hard way)

### 1. Never hardcode content in page components
14+ failed iterations proved this. Customer-facing content (about, stats, values, hero copy) MUST come from store config via the content generator service. New pages = routes composing existing section components + reading config. Missing config keys → expand content generator. Only exception: policy pages (template text + store name).

### 2. No flexible/polymorphic layouts
Sessions 11-12 tried letting AI compose layouts from arbitrary section combinations. Result: inconsistent, ugly, unpredictable output. Fix: rigid, opinionated blueprints that define section order per vertical. AI only picks which blueprint to use + fills content/palette. AI never touches layout, spacing, or typography.

### 3. No band-aids or quick fixes
Every feature must be long-term and data-driven. When we needed to decide which sections a food store homepage should have, the answer wasn't "guess" — it was "scrape 34 food D2C stores and compute the frequency matrix." Correct pattern always: scrape → frequency matrix → render decision.

### 4. Don't let LLMs freestyle
Haiku (the chat LLM) hallucinated action types constantly until we added a VALID_ACTION_TYPES whitelist. The LLM prompt needed explicit can't-do lists, exact payload structures, and full action examples. The more constrained the LLM, the better the output.

### 5. Audit before building
Always read the codebase (grep, git log, GitHub API) before making recommendations or writing prompts. Multiple times we almost built things that already existed (auth was already done, event bus was already there, full-text search index already created).

### 6. Test before shipping more
Session 15 built 7 features without manual testing. We got lucky — the verification pass found zero issues. But the pattern should be: build → test → fix → build more. Not: build → build → build → pray.

---

## PATTERNS THAT WORK

### 1. Opus writes prompts, Claude Code executes
Opus (this chat) audits code via GitHub API, makes architecture decisions, writes Claude CLI prompts as clean prose blocks. Claude Code (VS Code extension) executes prompts against the codebase. GitHub is the sync point. Opus NEVER pushes code directly. This separation of concerns works well — Opus has the context and judgment, Claude Code has the file system.

### 2. No markdown fences inside prompts
Markdown code fences inside Claude CLI prompts break the prompt formatting. All prompts are written as clean prose with inline code references.

### 3. Blueprint configs > monolithic components
Don't create 8 separate 30KB blueprint components. Instead, create vertical-specific CONFIGS (section order, mandatory sections, PDP features) that feed a shared SectionRenderer. The renderer already handles all section types. The blueprints are data, not code.

### 4. Fire-and-forget for non-critical operations
Email notifications use .catch() instead of await — never block the order flow for email delivery. Graceful degradation when RESEND_API_KEY is not set. Same pattern applies to analytics, notifications, logging.

### 5. Scoped raw body parsers for webhooks
Razorpay webhook needs the raw request body for HMAC signature verification. Fastify normally parses JSON automatically. Solution: register a scoped content-type parser on the webhook route BEFORE tRPC plugin registration.

### 6. Composition engine stays standalone
The scraping pipeline is a separate repo, not merged into the main codebase. It produces data files (frequency matrices) that the main repo consumes as static assets. This keeps the main repo clean and the scraping pipeline independently runnable.

### 7. Frequency matrix thresholds
>80% = must-have per vertical, 50-80% = expected, 30-50% = optional, <30% = rare/omit. This is the decision framework for which sections to include in each blueprint.

---

## WHERE WE ARE NOW

### Codebase: ~30K LOC, ~110 files

### What's built and verified (pnpm build clean, all routes 200)

**Buyer storefront (complete):**
- Homepage with polymorphic section rendering (20+ section types)
- PDP with gallery, variants, size chart, zoom, pincode check, urgency, wishlist
- Collections with server-side search/sort/filter, debounced search bar, empty state
- Cart with discount codes, quantity management
- Checkout with COD + Razorpay online payment
- Order confirmation with WhatsApp share
- About, 6 policy pages, 404
- SEO: OG/Twitter tags, JSON-LD Product/Organization/WebSite schemas, per-store sitemap, robots.txt, canonical URLs

**Seller dashboard:**
- Sidebar layout (Chat/Orders/Products/Analytics/Settings)
- Auth: Supabase phone OTP, JWT tRPC client, dev bypass
- Orders: revenue stats, paginated table, status filter, detail page with status actions + tracking
- Products: grid/list toggle, inline edit, bulk actions
- Analytics: revenue cards, bar chart, recent orders, top products
- Settings: store info, business details, payment config, social links, announcement

**Commerce:**
- COD checkout E2E (form → order → confirmation → stock decrement)
- Razorpay (service → webhook → modal → signature verification → idempotent status update)
- 12-state order machine with transition validation
- Email notifications via Resend (order confirmation, shipping update, seller notification)
- Fire-and-forget pattern, graceful degradation

**AI pipeline:**
- Director AI (Claude Haiku) — typography, mood, rhythm
- Stylist AI (Claude Sonnet + product images) — palette, layout, CSS
- Validator — WCAG contrast, auto-fixes
- Catalog AI (GPT-4o Vision) — photos → product data
- Content Generator — testimonials, section titles, about text
- Chat LLM — 42+ action types, hardened prompt, action whitelist

**Composition engine (separate repo):**
- TinyFish scraper: 168 stores successfully scraped (265 attempted) across 9 verticals
- Section frequency matrix: 111 sub-verticals × 28 section types
- PDP frequency matrix: 35 products across 7 verticals

### What's in progress
- Multi-vertical blueprints prompt sent to Claude Code (9 vertical configs)

### What's NOT built
- WhatsApp notifications (Gupshup API)
- Sentry error monitoring
- API rate limiting (Redis)
- Custom subdomains
- Shiprocket integration
- Edge cases: payment failure recovery, stock check at checkout, cart expiry, buyer cancellation, refund flow
- Security: XSS audit, CSRF, RLS audit, CORS lockdown
- Mobile responsive polish pass
- Empty/error/loading states audit
- Code cleanup (console.log → logger, remove `any` types)
- Lighthouse performance optimization

---

## LONG-TERM GOAL

Tatparya = "Shopify + Klaviyo for India, powered by AI."

A seller uploads product photos and gets a complete, professional D2C store in under 10 minutes — with payments (Razorpay + COD), shipping (Shiprocket), notifications (email + WhatsApp), invoicing (GST-compliant), and analytics — all controllable through a chat interface. No design skills needed. No code. No Shopify learning curve.

The AI doesn't just generate the store — it makes data-driven decisions. Which sections to show on a jewellery store vs a food store? Not guesswork — frequency analysis of 168 real Indian D2C stores. What PDP elements does a beauty brand need? Data from scraping 35 real product pages.

### VC thesis
VC tech team will review code for 2 weeks. They trace E2E flows:
1. Seller onboard → upload photos → store appears
2. Buyer discovers → browses → adds to cart → pays (COD or Razorpay)
3. Seller sees order in dashboard → ships with tracking
4. Money trail is clean (order → payment → verification → settlement)
5. Notifications fire at each step (email, eventually WhatsApp)

Every edge case must be handled. The product must feel complete, not demo-ware.

---

## IMMEDIATE NEXT STEPS (priority order)

### 1. Multi-vertical blueprints (IN PROGRESS)
Prompt already sent to Claude Code. Creates 9 vertical configs (fashion, beauty, food, jewellery, home_decor, electronics, fmcg, general, pets) with data-driven section orders from the 168-store frequency matrix.

### 2. Edge cases & robustness
- Stock check at checkout time (prevent overselling)
- Payment failure recovery (retry or switch to COD)
- Cart expiry / stale cart cleanup
- Double-click prevention on checkout button
- Price change warning between cart and checkout

### 3. WhatsApp notifications
Gupshup API integration for order confirmation and shipping updates. India-specific — most sellers communicate with buyers on WhatsApp.

### 4. Error monitoring (Sentry)
SDK install for API + storefront. Without this, production errors are invisible.

### 5. Rate limiting
Redis-based rate limiting on API endpoints, especially auth (brute force prevention).

### 6. Full E2E testing
Manual walkthrough of every flow with both test stores (Saskia fashion, Rad Living home_decor). Browser DevTools open, checking for console errors, network failures, edge cases.

### 7. Mobile polish pass
Every page on iPhone SE / Android viewport. Fix overflow, touch targets, sticky elements.

### 8. Code cleanup
Remove console.log statements, replace `any` types, delete dead code, add missing error boundaries.

---

## KEY FILES FOR NEXT SESSION

| Area | File |
|------|------|
| Homepage (section rendering) | `packages/storefront/src/app/[storeSlug]/page.tsx` |
| RunwayBlueprint (fashion) | `packages/storefront/src/components/blueprints/runway/RunwayBlueprint.tsx` |
| Checkout + Razorpay | `packages/storefront/src/components/checkout-form.tsx` |
| Razorpay service | `packages/api/src/services/razorpay.service.ts` |
| Order router (email wiring) | `packages/api/src/routers/order.router.ts` |
| Email service | `packages/api/src/services/email.service.ts` |
| Dashboard layout | `packages/storefront/src/app/dashboard/layout.tsx` |
| SEO utilities | `packages/storefront/src/lib/seo.ts` |
| Store design AI | `packages/api/src/services/store-design-ai.service.ts` |
| Chat LLM | `packages/api/src/services/chat-llm.service.ts` |
| Auth provider | `packages/storefront/src/lib/chat/auth-provider.tsx` |
| Sprint tracking | `ROADMAP.md`, `SPRINT-PLAN.md` |

---

## WORKFLOW REMINDERS

- Opus writes Claude CLI prompts as clean prose (no markdown fences inside)
- Claude Code executes in VS Code against the codebase
- GitHub is the sync point — always push after changes
- Audit-first: read the repo before writing prompts
- Update ROADMAP.md at end of every session
- Test stores: Saskia (fashion, slug `saskia-mmh6onn2`), Rad Living (home_decor, slug `rad-living-mmh6onq7`)
- Dev store ID in auth provider: `1532a530-2d4a-4b14-92db-79da88b27ebc`
