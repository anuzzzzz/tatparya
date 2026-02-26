# Tatparya — Phase 1: Foundation & Monorepo

## What's Included (47 files)

```
tatparya/
├── package.json                          # pnpm monorepo root
├── pnpm-workspace.yaml                   # Workspace config
├── turbo.json                            # Turborepo pipeline
├── tsconfig.base.json                    # Shared TS config
├── .env.example                          # Environment template
├── .gitignore
│
├── packages/
│   ├── shared/                           # Shared types, schemas, constants
│   │   ├── src/schemas/
│   │   │   ├── common.schema.ts          # Phone, pincode, address, pagination
│   │   │   ├── store.schema.ts           # Store + design token schemas
│   │   │   ├── product.schema.ts         # Product + variant schemas
│   │   │   └── order.schema.ts           # Order state machine + invoice schemas
│   │   ├── src/types/
│   │   │   ├── events.types.ts           # Event bus contract (30+ event types)
│   │   │   └── config.types.ts           # Font pairings, design presets
│   │   ├── src/constants/
│   │   │   ├── gst-rates.ts              # HSN → GST rate lookup + calculator
│   │   │   └── verticals.ts              # Vertical definitions (fashion, etc.)
│   │   └── src/__tests__/schemas.test.ts # 25+ schema & GST calculation tests
│   │
│   ├── api/                              # Fastify + tRPC API server
│   │   ├── src/env.ts                    # Environment validation (Zod)
│   │   ├── src/app.ts                    # Fastify factory with tRPC plugin
│   │   ├── src/index.ts                  # Server entry point
│   │   ├── src/lib/
│   │   │   ├── db.ts                     # Supabase client (anon + service role)
│   │   │   ├── redis.ts                  # Redis client wrapper
│   │   │   └── event-bus.ts              # Redis Streams event bus
│   │   ├── src/trpc/
│   │   │   ├── trpc.ts                   # tRPC init + auth/store middleware
│   │   │   ├── context.ts                # Per-request context (user, db, storeId)
│   │   │   └── router.ts                 # Root router
│   │   ├── src/routers/
│   │   │   ├── health.router.ts          # Health check (basic + deep)
│   │   │   └── store.router.ts           # Store CRUD + slug check
│   │   └── src/__tests__/
│   │       ├── setup.ts                  # Test env setup
│   │       ├── health.test.ts            # API health tests
│   │       └── event-bus.test.ts         # Event bus unit tests
│   │
│   ├── storefront/                       # Scaffolded (Phase 4)
│   ├── nl-engine/                        # Scaffolded (Phase 3)
│   └── whatsapp-engine/                  # Scaffolded (Phase 6)
│
├── infrastructure/supabase/
│   ├── config.toml                       # Supabase local config
│   ├── migrations/
│   │   ├── 001_core_tables.sql           # stores, products, variants, categories
│   │   ├── 002_order_tables.sql          # orders, invoices, discounts
│   │   ├── 003_whatsapp_tables.sql       # customers, campaigns, messages
│   │   └── 004_rls_policies.sql          # RLS on every table
│   └── seed.sql                          # GST rate lookup data
│
└── verticals/fashion/
    └── schema.ts                         # Fashion vertical config
```

---

## Step-by-Step Setup

### 1. Create the project

```bash
# Create project directory
mkdir tatparya && cd tatparya

# Copy all the files I've given you into this directory structure
# (use VS Code to create the folders and paste file contents)
```

### 2. Set up environment

```bash
# Copy env template
cp .env.example .env.local
```

### 3. Start Supabase locally

```bash
# Initialize Supabase (first time only)
supabase init

# Copy our migrations into the supabase directory that was created
# (supabase init creates supabase/ — copy our migrations there)
cp infrastructure/supabase/migrations/* supabase/migrations/
cp infrastructure/supabase/seed.sql supabase/seed.sql

# Start Supabase (Docker must be running)
supabase start
```

This will output your local Supabase keys. **Copy the anon key and service_role key into `.env.local`:**

```bash
# Supabase will print something like:
# API URL: http://127.0.0.1:54321
# anon key: eyJhbGciOi...
# service_role key: eyJhbGciOi...

# Update .env.local with these values
```

### 4. Start Redis

```bash
# Option A: Using Homebrew
brew services start redis

# Option B: Using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Install dependencies

```bash
# From the tatparya root directory
pnpm install
```

### 6. Build shared package first

```bash
pnpm --filter @tatparya/shared build
```

### 7. Run tests

```bash
# Shared package tests (schema validation, GST calculations)
pnpm --filter @tatparya/shared test

# API tests (health check, event bus)
pnpm --filter @tatparya/api test
```

### 8. Start the API server

```bash
pnpm --filter @tatparya/api dev
```

You should see:

```
┌─────────────────────────────────────────────┐
│                                             │
│   🚀 Tatparya API running                  │
│                                             │
│   Local:    http://localhost:3001            │
│   Health:   http://localhost:3001/health     │
│   tRPC:     http://localhost:3001/trpc       │
│                                             │
└─────────────────────────────────────────────┘
```

### 9. Verify everything works

```bash
# Health check
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}

# tRPC health
curl http://localhost:3001/trpc/health.check
# → {"result":{"data":{"status":"ok","version":"0.1.0","timestamp":"..."}}}

# Check Supabase dashboard (tables, RLS)
open http://127.0.0.1:54323
```

---

## Testing Checklist

- [ ] `pnpm install` succeeds from root
- [ ] `supabase start` launches local DB with all 13 tables
- [ ] Supabase dashboard shows: stores, products, variants, categories, orders, invoices, discounts, cart_abandonments, customers, customer_segments, whatsapp_templates, campaigns, messages, gst_rates
- [ ] RLS policies visible on every table in Supabase dashboard
- [ ] GST seed data loaded (22 HSN codes in gst_rates table)
- [ ] `pnpm --filter @tatparya/shared test` — all schema + GST tests pass
- [ ] `pnpm --filter @tatparya/api test` — health + event bus tests pass
- [ ] `pnpm --filter @tatparya/api dev` starts on port 3001
- [ ] `curl localhost:3001/health` returns OK
- [ ] Redis connected (check API logs for "✅ Redis connected")

---

## What's Next: Phase 2

Phase 2 adds the **Commerce Core**:
- Product CRUD with variants (size/color)
- Full-text search (Hindi + English)
- Cart with stock reservation (Redis-backed)
- Order state machine with event emission
- Pricing engine (discounts, coupons, GST)

Say **"Start Phase 2"** when this phase is verified and working.
