# Phase 5: Seller Dashboard — Files to Commit

## Build Verification
- ✅ 35 storefront tests pass
- ✅ 105 API tests pass (1 pre-existing failure: health.test.ts)
- ✅ Next.js build: 15 routes (7 storefront + 8 dashboard), all green
- ✅ Middleware active (74.3 kB)

## Modified Files (4)

### 1. `packages/storefront/package.json`
Added dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `date-fns`, `lucide-react`, `react-hot-toast`, `clsx`

### 2. `packages/storefront/src/lib/trpc.ts`
Fixed cross-package type import (removed `.js` extension, added `@ts-ignore`)

### 3. `packages/storefront/src/components/variant-selector.tsx`
Fixed invalid CSS property: `ringColor` → `outlineColor`

### 4. `pnpm-lock.yaml`
Updated lockfile for new dependencies

## New Files (19)

### Auth Layer (3 files)
- `src/lib/supabase/client.ts` — Supabase browser client
- `src/lib/supabase/auth-provider.tsx` — Auth context (user, session, storeId, signOut, authenticated tRPC)
- `src/lib/supabase/trpc-auth.ts` — tRPC client with Bearer token headers

### Dashboard Components (6 files)
- `src/components/dashboard/providers.tsx` — React Query + AuthProvider + Toaster
- `src/components/dashboard/guard.tsx` — Auth check + store auto-select + shell wrapper
- `src/components/dashboard/shell.tsx` — Layout shell (sidebar + header + main)
- `src/components/dashboard/sidebar.tsx` — Nav: Overview, Orders, Products, AI Catalog, Settings
- `src/components/dashboard/header.tsx` — Top bar with user phone + "View Store" link
- `src/components/dashboard/ui.tsx` — Card, StatCard, Badge, StatusBadge, Button, EmptyState, LoadingSpinner, PageHeader

### Dashboard Pages (9 files)
- `src/app/dashboard/layout.tsx` — Root layout with `force-dynamic` (prevents SSG)
- `src/app/dashboard/page.tsx` — Home: stats (revenue, orders, products), quick actions, recent orders
- `src/app/dashboard/login/page.tsx` — Phone OTP login (+91, 2-step: send → verify)
- `src/app/dashboard/orders/page.tsx` — Order list: status filter, search, pagination, responsive table
- `src/app/dashboard/orders/[id]/page.tsx` — Order detail: line items, totals, customer info, status update buttons
- `src/app/dashboard/products/page.tsx` — Product list: status filter, search, delete, link to edit
- `src/app/dashboard/products/[id]/page.tsx` — Product edit/create: name, description, pricing, GST, images, status
- `src/app/dashboard/catalog/page.tsx` — AI Catalog: upload photos → Claude Vision → draft listing (the magic moment)
- `src/app/dashboard/settings/page.tsx` — Store settings: general, WhatsApp config, design tokens (color + layout)

### Middleware (1 file)
- `src/middleware.ts` — Protects `/dashboard/*`, redirects to `/dashboard/login` if unauthenticated

## Route Map

```
/dashboard                    → Home (stats + quick actions)
/dashboard/login              → Phone OTP login
/dashboard/orders             → Order list
/dashboard/orders/[id]        → Order detail + status update
/dashboard/products           → Product list
/dashboard/products/[id]      → Product edit (also handles /new)
/dashboard/catalog            → AI Catalog (photo → listing)
/dashboard/settings           → Store settings (+ onboarding create)
```

## Architecture Pattern
Each dashboard page follows the same pattern:
```tsx
export default function Page() {
  return (
    <DashboardProviders>      {/* React Query + Auth + Toaster */}
      <DashboardGuard title="...">  {/* Auth check + store select + shell */}
        <PageContent />            {/* The actual page content */}
      </DashboardGuard>
    </DashboardProviders>
  );
}
```

## Git Commands
```bash
cd /path/to/tatparya
git add -A
git commit -m "phase 5: seller dashboard (auth, orders, products, AI catalog, settings)"
git push origin main
```
