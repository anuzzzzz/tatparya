# Tatparya — Session 18 Transition Document

**Date:** April 11–12, 2026
**Session:** 18 (continuation of Session 17, same day)
**Repo:** `anuzzzzz/tatparya` (main) + `anuzzzzz/tatparya-composition-engine` (data pipeline)
**Codebase:** ~30K LOC, ~110 files across 3 packages (shared, api, storefront)

---

## 1. THE GOAL

Tatparya is **"Shopify + Klaviyo for India, powered by AI."**

A seller uploads product photos and gets a complete, professional D2C store in under 10 minutes — with payments (Razorpay + COD), shipping, notifications, invoicing (GST-compliant), and analytics — all controllable through a **chat interface**. No design skills. No code. No Shopify learning curve.

The chat IS the product. Every action — from changing fonts to shipping an order — happens through Claude Haiku (44 action types including store.delete, zero regex).

A VC wants the complete product. Their tech team will do a **two-week code review** tracing full E2E flows: seller onboard → buyer purchase → seller fulfill → money trail → notifications.

---

## 2. WHERE WE STARTED THIS SESSION

Entry state from Session 17 (earlier on April 11):
- Store creation via chat was working but fragile (Haiku name-invention bug, debug logging added)
- Photo upload → product creation pipeline working
- Design AI generating store themes from name alone
- 43 action types in the chat system
- Dev auth broken (admin.listUsers fails on local Supabase, hardcoded DEV_OWNER_ID, devList returning all stores)
- Multiple untested Session 15 features (Razorpay, dashboard, SEO, search/filter)
- No store.delete action (couldn't reset test data easily)
- Products showing without images on storefront (missing link between R2 uploads and product records)

---

## 3. WHAT WE DID IN SESSION 18

### 3A. Systematic Bug Audit (18 bugs identified and triaged)

Ran a comprehensive audit of the entire codebase, verified each bug against actual code via GitHub API. Organized into 4 severity tiers:

**P0 — Silently Broken (5 bugs):**
1. Chat order actions bypassed state machine (updateRow instead of OrderService) → FIXED
2. Store design regenerated on EVERY photo upload, not just first → FIXED (designGenerated ref guard)
3. Conversation history was text-only — Haiku couldn't see product cards → FIXED (rich history with product/order/stats summaries)
4. product.publish from chat round-tripped through Haiku unnecessarily → FIXED (executeDirectAction bypasses Haiku)
5. ChatApiService storeId mismatch after store creation → FIXED (useRef instead of useMemo)

**P1 — Wrong Behavior (6 bugs):**
6. Order number race condition → FIXED (Postgres sequence via next_order_number RPC)
7. Stock deduction at order creation, not payment → FIXED (moved to paid/cod_confirmed transition)
8. Discount usage incremented before payment → FIXED (moved to paid/cod_confirmed transition)
9. store.regenerate_design blocked chat for 10-30s → FIXED (fire-and-forget)
10. Snapshot limited to 10 products / 5 orders → FIXED (enrichSnapshotWithMentions searches by name)
11. previousDesignConfig was a no-op → FIXED (removed dead state, server-side undo works)

**P2 — VC Demo Gaps (4 bugs):**
12. No price validation on client-submitted lineItems → FIXED (server-side price lookup in OrderService.createOrder)
13. Slug collision possible → FIXED (random suffix + retry on collision)
14. COD orders had no confirmation flow → FIXED (auto-transition to cod_confirmed)
15. sendImages auto-selected wrong store → FIXED (show "create store first" instead)

**P3 — Code Quality (3 bugs):**
16. Schema reference had stale store.create instructions → FIXED
17. TatparyaAction.payload typed as Record<string,any> → NOT FIXED (low priority)
18. api variable React anti-pattern → FIXED (useRef)

### 3B. Dev Auth Overhaul (4 bugs fixed)

The entire dev auth system was rebuilt for deterministic testing:

1. **dev-auth.ts**: Replaced admin.listUsers() (broken on local Supabase) with idempotent createUser + signInWithPassword fallback. Module-level cache so it runs once per server start.
2. **store.router.ts devList**: Added owner_id filter via getOrCreateDevUser — only returns YOUR stores, not every test store ever created. Killed hardcoded DEV_OWNER_ID in devCreate and devFullPipeline.
3. **auth-provider.tsx**: Sign-in awaited before devList call. ?newstore=true explicitly sets storeId to null. setStoreId now accepts string | null.
4. **use-chat.ts sendImages**: Removed silent store auto-select. Shows "create store first" if storeId is null.

### 3C. New Features Built

- **store.delete action**: Full cascade delete (collection_products, product_categories, variants, media_assets, products, categories, collections, discounts, orders, stores). Client resets storeId to null, clears messages, triggers creation flow. Marked DESTRUCTIVE — requires confirmation.
- **executeDirectAction**: Button actions (publish, archive, ship) bypass Haiku and call chat.confirm directly. Faster and more reliable than NL round-trip.
- **Image linking**: After R2 uploads + catalog AI complete, fire-and-forget call to media.set_product_images wires uploaded images to created products.
- **Rich conversation history**: buildConversationHistory now includes product cards, order cards, stats, and image uploads as text summaries so Haiku has full context.
- **Reactive welcome messages**: Returning users with existing stores see "Welcome back!" instead of "Say 'create my store'"
- **Suggestion buttons send label**: Fixed s.description || s.label → s.label so Haiku receives the command it expects.

### 3D. Session 18 Commits (chronological, newest first)

```
e43345c feat: store.delete cascade + storeDeleted client reset + fix suggestion label
5bfad7b feat: add store.delete to action whitelist, destructive set, and schema reference
49a7518 feat: store.delete action type + setStoreId accepts null
70aa3f2 fix: wire R2 uploaded images to catalog-created products in chat flow
3193b3b fix: suggestion sends label not description, smarter snapshot search, reactive welcome, history reset after creation, design guard reset on store change
af85b6e bug fixes
0e28d11 deterministic dev auth — one user, filtered devList, explicit storeId null, no silent store adoption
dc29f6e fix: snapshot enrichment for name mentions, slug collision safety, COD auto-confirm, remove store auto-select, fix stale schema docs, delete flow-manager dead code
77829ca rich conversation history for Haiku, direct action execution for buttons, atomic order numbers
3a574b3 guard design regen to first upload only, fix storeId ref, fire-and-forget regen, remove dead previousDesign state
dbdd143 fix: order state machine enforcement, move stock/discount to payment, server-side price validation
```

Plus earlier Session 17 commits from the same day:
```
50520aa fix: align user prompt with system prompt, add Haiku debug logging, prevent name invention
74f4861 fix: remove auto-checklist, improve product guidance, clear state on newstore
e91249f fix: remove redundant query.store_link from prompt + default action payload to {}
e0c5e50 feat: zero-friction onboarding (name + photos only) with go-live checklist
13a6b85 fix: suggestion buttons send correct text + stronger no-store Haiku guidance
2fb1177 feat: add dev-mode auto-authentication for local testing
441e051 fix: use null owner_id when no authenticated user (dev mode store creation)
b643974 fix: thread userId to store.create to satisfy owner_id NOT NULL constraint
3451adc dev: add ?newstore=true param to bypass dev store auto-select for creation flow testing
590923  refactor: move store creation from client-side regex to server-side LLM action system
```

---

## 4. WHERE WE ARE CURRENTLY

### What works:
- Store creation via chat (name → store.create → DB + URL shown)
- Store deletion via chat ("delete my store" → confirmation → cascade delete → fresh start)
- Photo upload → resize → triage → Catalog AI → products created
- R2 image upload + linking to products (fire-and-forget media.set_product_images)
- Design AI fires on first photo upload only (designGenerated ref guard)
- Design AI fire-and-forget (no longer blocks chat)
- 44-action chat system with Claude Haiku (zero regex)
- Order state machine enforced on chat path (via OrderService)
- Stock deduction on payment, not order creation
- Discount usage on payment, not order creation
- Server-side price validation (client can't submit fake prices)
- COD orders auto-confirmed
- Atomic order numbers (Postgres sequence)
- Direct action execution for buttons (bypasses Haiku)
- Rich conversation history (product cards, orders, stats included)
- Deterministic dev auth (one user, filtered devList)
- Suggestion buttons send correct label text
- Reactive welcome messages
- Slug collision protection with retry

### What's NOT yet tested manually:
- Full E2E: create store → upload photos → products appear WITH images on storefront
- Razorpay payment flow (Session 15, never tested)
- Seller dashboard (orders, products, analytics, settings)
- SEO (OG tags, JSON-LD, sitemap)
- Email notifications (Resend)
- store.delete via chat (just committed)
- COD checkout E2E
- Design undo

### Known remaining issues:
- **enrichSnapshotWithMentions**: Still passes filtered words to ilike which may not match well. Stop-word filtering was added but effectiveness untested.
- **Conversation history pollution**: After store creation, history may still confuse Haiku about mode. A historyResetIndex ref was discussed but implementation status unclear — verify in current code.
- **designGenerated ref**: Resets on storeId change (via useEffect), but needs testing with the delete → recreate flow.
- **Welcome messages**: Reactive useEffect added but needs testing — verify it fires when storeId transitions from null to a value.
- **flow-manager.ts**: Should be deleted (dead code). Prompt 4 instructed deletion but verify it's gone.
- **ROADMAP.md**: Still stale.
- **TypeScript errors**: Pre-existing in redis, catalog router, photo-pipeline test files.

---

## 5. ARCHITECTURE (CURRENT)

```
SELLER CHAT (/dashboard)
  use-chat.ts → tRPC chat.process → Haiku → execute → respond
  executeDirectAction → tRPC chat.confirm → execute (bypasses Haiku)

API (Fastify + tRPC, port 3001)
  Chat Router → Store Snapshot + Enrichment → Claude Haiku → Action Validator → Action Executor (44 types)
    ├─ Store CRUD (create, delete, update_name, etc.)
    ├─ Design AI (Director → Stylist → Validator) [fire-and-forget]
    ├─ Product CRUD + Catalog AI (GPT-4o Vision)
    ├─ Order management (12-state machine via OrderService)
    ├─ Section toggle/reorder
    ├─ Query engine (products, orders, revenue)
    └─ Media (R2 upload, hero banner, product images)

STOREFRONT (Next.js 14, port 3000)
  /[storeSlug]          → Homepage (blueprint sections)
  /[storeSlug]/products → PDP
  /[storeSlug]/collections → Search/sort/filter
  /[storeSlug]/cart     → Cart + discount codes
  /[storeSlug]/checkout → COD + Razorpay
  /dashboard            → Seller dashboard + chat
```

### Key Files (post Session 18):

| Area | File | Size | Notes |
|------|------|------|-------|
| Action types + whitelist | `packages/shared/src/types/chat.types.ts` | ~13KB | 44 action types, DESTRUCTIVE_ACTIONS set, generateActionSchemaReference() |
| Haiku system prompt | `packages/api/src/services/chat-llm.service.ts` | ~18KB | buildSystemPrompt + buildUserPrompt |
| Chat router | `packages/api/src/routers/chat.router.ts` | ~13KB | process + confirm endpoints, enrichSnapshotWithMentions |
| Action executor | `packages/api/src/services/action-executor.ts` | ~43KB | 44 action cases, deleteStore cascade, OrderService integration |
| Action validators | `packages/api/src/services/action-validators.ts` | ~10KB | Pre-execution validation |
| Order service | `packages/api/src/services/order.service.ts` | ~9KB | createOrder (price validation, deferred stock/discount), updateStatus (stock on paid, restore on cancel) |
| Order repository | `packages/api/src/repositories/order.repository.ts` | ~9KB | ORDER_TRANSITIONS validation, Postgres sequence order numbers |
| Client chat hook | `packages/storefront/src/lib/chat/use-chat.ts` | ~23KB | sendMessage, sendImages, executeDirectAction, image linking, rich history |
| Client auth | `packages/storefront/src/lib/chat/auth-provider.tsx` | ~5KB | Dev auth sign-in, devList with owner filter, setStoreId(null) |
| Chat UI shell | `packages/storefront/src/components/chat/chat-shell.tsx` | ~3KB | handleAction routes to executeDirectAction or sendMessage |
| Dev auth helper | `packages/api/src/lib/dev-auth.ts` | ~1KB | Idempotent createUser, signIn fallback, module-level cache |
| Store design AI | `packages/api/src/services/store-design-ai.service.ts` | ~48KB | Director → Stylist → Validator |
| Store snapshot | `packages/api/src/services/store-snapshot.service.ts` | ~5KB | 7 parallel queries |
| Product card | `packages/storefront/src/components/product-card.tsx` | ~10KB | Reads images[0].cardUrl/originalUrl |
| Store router | `packages/api/src/routers/store.router.ts` | ~29KB | devList filtered by owner, devCreate uses getOrCreateDevUser |

---

## 6. IMMEDIATE NEXT STEPS (Priority Order)

### P0: Manual E2E Test
The single most important thing. Delete store via chat or SQL, create fresh, upload photos, verify:
1. Store created with correct owner_id
2. Photos uploaded to R2
3. Products created by Catalog AI
4. Images linked to products (media.set_product_images fires)
5. Products visible on storefront WITH images
6. Design AI generates store theme on first upload
7. Store visitable at URL

### P1: Verify store.delete works via chat
Say "delete my store" in chat. Confirm:
- Haiku returns confirmationNeeded
- Click "Yes, do it" or type "yes"
- All data deleted (check Supabase Studio)
- Client resets to creation flow
- New store can be created immediately after

### P2: Fix any remaining image display issues
If products show without images after the linking fix, check:
- Are media_assets records getting original_url set during R2 upload?
- Does media.set_product_images in action-executor read hero_url/card_url/thumbnail_url or just original_url?
- The photo enhancer (which creates card_url etc) may not run during chat upload flow — only original_url may be available
- product-card.tsx falls through to originalUrl if cardUrl is null, so this should work

### P3: Razorpay E2E Test
Never tested since Session 15. Test with Razorpay test mode keys.

### P4: Update ROADMAP.md
Stale since Session 15. Reflects none of the Session 16-18 work.

### P5: TypeScript cleanup
Pre-existing errors in redis, catalog router, photo-pipeline test. Fix before VC code review.

---

## 7. PATTERNS & ANTI-PATTERNS (COMPREHENSIVE)

### Hard-won anti-patterns (DO NOT REPEAT):

1. **Never hardcode content in page components.** 14+ failed iterations proved this. Customer-facing content must come from store config via content generator.

2. **No flexible/polymorphic layouts.** Sessions 9-10 tried AI-composed layouts. Ugly and inconsistent. Blueprints are rigid, opinionated, data-informed.

3. **No regex-based intent detection.** FlowManager is dead code. Haiku is sole classifier for all 44 action types.

4. **No band-aids or quick fixes.** Every feature must be long-term and data-driven. Scrape → frequency matrix → render decision.

5. **Don't let LLMs freestyle.** 44-type whitelist, explicit payload examples, can't-do lists in system prompt.

6. **Audit before building.** Read all relevant files via GitHub API before prescribing changes. Partial reads produce wrong diagnoses.

7. **Research before implementing.** Spec all edge cases and test conversations BEFORE writing code. The onboarding flow proved this — multiple rounds of patching because we didn't spec first.

8. **Checklist/go-live UI is PULL not PUSH.** Never auto-show during creative flow.

9. **Schema changes go to LOCAL Supabase.** 127.0.0.1:54323 (Studio) or 127.0.0.1:54322 (postgres). Cloud project is separate.

10. **System prompt + user prompt must agree.** Conflicting instructions between buildSystemPrompt() and buildUserPrompt() caused Haiku to ignore rules.

11. **Don't pass entire user messages as SQL ILIKE patterns.** Extract meaningful search terms first.

12. **Deferred side effects for payments.** Stock deduction and discount usage belong at payment confirmation, not order creation. Razorpay modal abandonment was losing stock.

13. **Server-side price validation is mandatory.** Client-submitted prices cannot be trusted. Always cross-reference against DB.

14. **Fire-and-forget for long operations.** Design regeneration (10-30s), catalog regeneration, email sending — never block the chat response.

15. **Buttons with known entity IDs should bypass Haiku.** product.publish with a productId doesn't need NL → LLM → parse → execute. Use executeDirectAction → chat.confirm directly.

16. **useRef not useMemo for mutable service instances.** ChatApiService with setStoreId() mutates state outside React's knowledge. useRef keeps the instance stable.

17. **Dev auth must be deterministic.** One dev user, one store, filtered devList. No hardcoded UUIDs, no auto-selecting random stores, no silent adoption.

18. **Don't write vague CLI prompts.** They get misinterpreted. Use exact str_replace pairs: literal text to find, literal text to replace. Or push files directly via GitHub API.

19. **Image pipeline has two halves that run in parallel but must be joined.** R2 uploads create media_assets. Catalog AI creates products with images:[]. Someone must call media.set_product_images to connect them.

20. **suggestion buttons must send label, not description.** Haiku expects the label text as follow-up input.

### Patterns that work:

1. Blueprinted compositions from 168-store frequency analysis (9 verticals, 28 section types)
2. Two-pass AI design: Director → Stylist → Validator
3. Haiku as single brain: snapshot → classify → validate → execute, no parallel paths
4. Fire-and-forget for non-critical ops (email, design generation)
5. Composition engine stays standalone (separate repo, produces static JSON)
6. Scoped raw body parsers for Razorpay webhook HMAC verification
7. Two-phase onboarding: Creative mode (no interruptions) → Go Live (persistent button, pull not push)
8. OrderService as single source of truth for order state transitions + stock + discount side effects
9. enrichSnapshotWithMentions for products beyond the recent 10
10. store.delete as a first-class chat action with cascade + client state reset

---

## 8. DEVELOPMENT WORKFLOW

### Two-Brain System

**Opus (this chat)** = Architect + Memory
- Reads code via GitHub API (get_file_contents, list_commits)
- Makes architecture decisions based on full file reads
- Writes Claude CLI prompts as clean prose blocks (no markdown fences inside — breaks formatting)
- Can push small files directly via github:push_files
- Every CLI prompt MUST include a commit message at the end
- Maintains context across sessions via memory + transition documents
- Never pushes code directly for large files (too error-prone)

**Claude Code (VS Code extension)** = Executor
- Receives prompts from Opus
- Executes against the codebase with full file system access
- Runs builds, tests, scripts
- Commits and pushes to GitHub
- CRITICAL: Prompts must use exact str_replace pairs for large files, not vague instructions

**GitHub** = Sync point between the two.

### Session 18 Lesson on Prompt Methodology

We went through 6+ rounds of CLI prompts that introduced regressions because instructions were interpretive rather than literal. The fix: for large files (>10KB), write EXACT find/replace text. For small files (<5KB), push the complete file directly via github:push_files.

Do NOT:
- Write vague instructions like "add a check for X before Y"
- Assume Claude Code will find the right insertion point
- Write multiple prompts that touch the same file

DO:
- Provide the exact text block to find (copied from the file you read)
- Provide the exact replacement text
- One prompt per batch of related changes
- Verify the build compiles after each prompt

---

## 9. LOCAL DEVELOPMENT SETUP

- **Local Supabase**: `supabase start` (Docker). URL: 127.0.0.1:54321. Studio: 127.0.0.1:54323. Postgres: 127.0.0.1:54322.
- **Cloud Supabase**: dstnkgptfkccyizilqnh (SEPARATE from local — don't run migrations against cloud)
- **Dev user**: dev@tatparya.local / dev-tatparya-2024 (auto-created by dev-auth.ts)
- **Test stores**: Created via chat. Use "delete my store" to reset. Or TRUNCATE stores CASCADE in Studio.
- **Ports**: Storefront 3000, API 3001
- **Start**: `pnpm dev` from repo root
- **Test creation flow**: `localhost:3000/dashboard?newstore=true` (forces storeId to null)
- **Test existing store**: `localhost:3000/dashboard` (auto-selects dev user's store)
- **DB schema changes**: Run SQL in local Studio (127.0.0.1:54323), then create migration file in supabase/migrations/

---

## 10. LONG-TERM GOALS

### Product completeness (VC-ready):
- Full E2E flow traceability with zero gaps
- Every edge case handled (payment failure, stock check at checkout, cart expiry, buyer cancellation, refund flow)
- Security audit (XSS, CSRF, RLS, CORS)
- Mobile responsive on iPhone SE / Android
- Lighthouse >90
- Sentry for production error visibility

### GST invoicing (differentiator vs Shopify):
- Auto-generate GST-compliant PDF invoices on every order
- CGST/SGST or IGST split based on seller state vs buyer state
- HSN codes on products (Catalog AI already suggests these)
- GSTR-1/GSTR-3B data export for filing
- DB schema ready: gstin, business_name, hsn_code, gst_rate, state_code, registered_address

### Shipping:
- Shiprocket integration for automated label generation and tracking

### Notifications:
- WhatsApp via Gupshup (India-specific)
- Email notifications already built via Resend

### AI evolution:
- Catalog AI vertical_data (structured attributes per vertical)
- Vertical inference from product photos
- PDP adapts per vertical using shouldUsePdpFeature() from blueprints

### Go Live panel:
- Persistent button in chat bar after first product publish
- Required: Products published, Payments (COD default-on), Shipping rates, Business details
- Optional: Custom domain, Social links, GSTIN, Razorpay online payments
- Checkout gated until payments configured

---

## 11. ONBOARDING MODEL (DECIDED IN SESSION 17)

**Phase 1 — Creative Mode (zero friction):**
- Seller gives name + uploads photos → AI creates store, products, design
- All 44 actions available for unlimited customization
- Store always visitable at URL
- NO checklist interruptions during creative flow
- Checklist/go-live UI is PULL not PUSH

**Phase 2 — Go Live (Shopify structure, Dukaan simplicity):**
- Persistent "Go Live" button appears AFTER first product publish
- Opens panel with required + optional items
- COD default-on for India
- GST invoice auto-generation as differentiator

---

## 12. DATABASE NOTES

- **Order number sequence**: Postgres sequence `order_number_seq` + `next_order_number()` RPC function. Migration: `supabase/migrations/20260411_order_number_sequence.sql`
- **owner_id**: Nullable on stores table (dev mode creates stores without auth user initially)
- **vertical CHECK**: Includes 'pets' (9 verticals total)
- **GST fields ready**: gstin, business_name, hsn_code, gst_rate, state_code on stores and products
- **ORDER_TRANSITIONS**: 12-state machine in `packages/shared/src/schemas/order.schema.ts`
- **Stock**: Deducted on `paid` or `cod_confirmed`, restored on `cancelled` or `rto`
- **Discount usage**: Incremented on `paid` or `cod_confirmed` only
