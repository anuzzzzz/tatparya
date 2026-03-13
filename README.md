# Tatparya

AI-native D2C commerce platform built for India. Sellers get a storefront, product catalog, order management, and WhatsApp communication — all with AI assistance for store design, catalog generation, and photo processing.

---

## What's in here

| Package | Purpose |
|---|---|
| `packages/shared` | Zod schemas, TypeScript types, GST constants — consumed by all packages |
| `packages/api` | Fastify + tRPC API server |
| `packages/storefront` | Next.js 14 customer-facing storefront + seller dashboard |
| `packages/nl-engine` | Natural language engine (Phase 3 — scaffolded) |
| `packages/whatsapp-engine` | WhatsApp integration (Phase 6 — scaffolded) |
| `infrastructure/supabase` | DB migrations, seed data, Supabase config |

---

## Stack

**Frontend:** Next.js 14, React 18, Tailwind CSS 3.4, tRPC client, React Query v5

**Backend:** Fastify 5, tRPC 11, Node.js 20+ (ESM)

**Database:** PostgreSQL 17 via Supabase (Auth, Realtime, RLS), Redis via ioredis

**AI:** Anthropic Claude (store design, catalog, content), OpenAI (fallback), Replicate (image enhancement), Remove.bg

**Storage:** Cloudflare R2 (S3-compatible); falls back to local disk in dev

**Tooling:** pnpm 9 workspaces, Turborepo 2.4, Vitest 3, TypeScript strict mode

---

## Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker (for Supabase local)
- Redis

---

## Setup

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

Copy and fill in `.env.local` at the repo root. Required keys:

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Redis
REDIS_URL=redis://127.0.0.1:6379

# API
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=development

# URLs
STOREFRONT_BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3001
APP_DOMAIN=tatparya.in

# AI (at least one required)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
AI_PROVIDER=anthropic

# Storage (optional in dev — falls back to local disk)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tatparya-media
R2_PUBLIC_URL=

# Image services
REMOVE_BG_API_KEY=

# Payments (Phase 5)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# WhatsApp (Phase 6)
GUPSHUP_API_KEY=
```

**3. Start Supabase**

```bash
supabase start
# Copy the printed API URL and keys into .env.local
```

Supabase runs on:
- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- DB (direct): `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**4. Run migrations**

```bash
pnpm db:migrate
```

**5. Start Redis**

```bash
# Homebrew
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**6. Build shared package**

```bash
pnpm --filter @tatparya/shared build
```

**7. Start dev servers**

```bash
pnpm dev
```

This runs all packages in parallel via Turborepo. Individually:

```bash
pnpm --filter @tatparya/api dev        # http://localhost:3001
pnpm --filter @tatparya/storefront dev # http://localhost:3000
```

**Verify:**

```bash
curl http://localhost:3001/health
curl http://localhost:3001/trpc/health.check
```

---

## Database

**13 core tables:** `stores`, `products`, `product_variants`, `categories`, `orders`, `order_items`, `invoices`, `discounts`, `customers`, `campaigns`, `messages`, `cart_abandonments`, `media`

All tables have Row-Level Security (RLS) enabled. Auth is handled by Supabase.

**Migration files** live in `infrastructure/supabase/migrations/`:

| File | What it creates |
|---|---|
| `20250201000001_core_tables.sql` | `stores`, `products`, `product_variants` |
| `20250201000002_order_tables.sql` | `orders`, `order_items`, `invoices` |
| `20250201000003_whatsapp_tables.sql` | `customers`, `campaigns`, `messages`, `cart_abandonments` |
| `20250201000004_rls_policies.sql` | All RLS policies |
| `20250201000005_collections_categories.sql` | `categories` + collections |
| `20250201000006_media_table.sql` | `media` table |

**Useful DB commands:**

```bash
pnpm db:migrate   # Push pending migrations
pnpm db:reset     # Wipe + migrate + seed GST data
pnpm db:seed      # Seed demo store (Rangoli Fashion)
```

The `seed-demo.sql` file at the root seeds a full demo store with products, variants, categories, and orders. Requires a user to be logged in first (phone OTP via Supabase Auth) — the seed script references `auth.uid()`.

---

## API

The API is a Fastify server exposing tRPC procedures. All procedures go through `/trpc/*`.

**Routers:**

| Router | Procedures |
|---|---|
| `health` | `check`, `deep` |
| `store` | CRUD, slug availability |
| `product` | CRUD, search, variants |
| `category` | CRUD, tree structure |
| `cart` | Add/remove items, stock reservations |
| `order` | Create, state transitions |
| `discount` | Coupon validation and application |
| `media` | Upload, process, delete |
| `catalog` | AI-powered catalog generation |
| `chat` | LLM-powered content and Q&A |

**Context per request:** authenticated user (via Supabase JWT), Supabase client (scoped to that user), store ID from header or slug.

**Middleware chain:** `publicProcedure` → `authedProcedure` → `storeOwnerProcedure`

---

## AI Features

**Store design generation** (`store-design-ai.service.ts`, 1007 LOC)
Generates complete design tokens (colors, typography, spacing, layout) from a store description and vertical. Uses Claude.

**Catalog AI** (`catalog-ai.service.ts`, 356 LOC)
Generates product titles, descriptions, SEO metadata, and variant suggestions from raw seller input.

**Content generator** (`content-generator.service.ts`, 304 LOC)
Produces marketing copy, WhatsApp messages, and collection descriptions.

**Photo pipeline** (4 services)
Orchestrated pipeline: triage → classify → quality gate → enhance. Uses Replicate for enhancement, Remove.bg for background removal.

**AI provider selection:**
Set `AI_PROVIDER=anthropic` or `AI_PROVIDER=openai` in env. The catalog and chat services support both.

---

## Composition Library

`composition-library.json` (683 KB) is a reference dataset of UI archetypes crawled from 142 D2C stores across 9 verticals. It contains 129 deduplicated compositions and 75 archetypes used for store design suggestions and A/B testing blueprints.

```
Stats:
  total_stores_crawled:    142
  unique_compositions:     129
  archetypes:              75
  verticals:               fashion, beauty, food, jewellery, home, electronics, fmcg, general
  sources:                 curated_d2c, top_shopify, structural_crawl
```

This file is excluded from `.gitignore` (it's committed). It is not a runtime dependency — the AI services read it at startup to inform design generation.

---

## Supported Verticals

Fashion, Jewellery, Food & Beverage, Beauty, Home Décor, Electronics, FMCG, General

Each vertical defines its own variant attributes (e.g., fashion gets size + color, jewellery gets material + karat). Configured in `packages/shared/src/constants/verticals.ts`.

---

## GST

HSN-to-GST rate lookup is seeded into a `gst_rates` table. The pricing service uses this to compute tax breakdowns at checkout. The `gst-rates.ts` constant mirrors this for frontend use.

Sample rates:
- `6211` (readymade garments) → 5%
- `7117` (imitation jewellery) → 12%
- `3304` (beauty/makeup) → 18%

---

## Testing

```bash
pnpm test                              # All packages
pnpm --filter @tatparya/api test       # API tests only
pnpm --filter @tatparya/shared test    # Schema tests only
```

Test files are colocated in `packages/api/src/__tests__/`. Key test files:

| File | What it tests |
|---|---|
| `health.test.ts` | HTTP + tRPC health endpoints |
| `checkout.test.ts` | Cart → order flow |
| `pricing.test.ts` | GST, discounts, rounding |
| `order-state-machine.test.ts` | Order status transitions |
| `catalog-ai.test.ts` | Catalog AI output shape |
| `event-bus.test.ts` | Redis Streams pub/sub |
| `photo-pipeline.test.ts` | Image processing pipeline |
| `composition-integration.test.ts` | Composition archetype loading |

Tests run in Node environment with a 10s default timeout. Integration tests hit a real Supabase instance (configure `DATABASE_URL` in test env).

---

## Scripts Reference

```bash
# Root
pnpm dev          # Start all packages (turbo parallel)
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm typecheck    # TypeScript check across all packages
pnpm lint         # ESLint across all packages
pnpm clean        # Delete dist/ and .turbo/ everywhere
pnpm db:migrate   # supabase db push
pnpm db:reset     # supabase db reset
pnpm db:seed      # supabase db reset --seed-from seed-demo.sql

# Per-package (filter syntax)
pnpm --filter @tatparya/api dev
pnpm --filter @tatparya/storefront dev
pnpm --filter @tatparya/shared build
```

---

## Ports

| Service | Port |
|---|---|
| Storefront (Next.js) | 3000 |
| API (Fastify) | 3001 |
| Supabase API | 54321 |
| Supabase DB (PostgreSQL) | 54322 |
| Supabase Studio | 54323 |
| Redis | 6379 |

---

## Project Status

| Phase | Status |
|---|---|
| Phase 1 — Foundation (monorepo, DB, auth, tRPC) | Done |
| Phase 2 — Commerce core (cart, orders, pricing) | Done |
| Phase 3 — NL Engine | Scaffolded |
| Phase 4 — Storefront compositions + AI design | In progress |
| Phase 5 — Payments (Razorpay) | Pending |
| Phase 6 — WhatsApp Engine (Gupshup) | Scaffolded |

See `PHASE1_SETUP.md` for the original setup checklist with verification steps.
