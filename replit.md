# Sip N Bite

Web ordering and restaurant operations for QR-based table ordering at Sip N Bite.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live
- `artifacts/sip-n-bite/src/App.tsx` — customer ordering, order tracking, staff queue, and login surfaces
- `artifacts/sip-n-bite/src/index.css` — Material 3-inspired Sip N Bite theme
- `supabase/schema.sql` — tenant-aware tables, roles, payments, and RLS policies

## Architecture decisions
- Web-only MVP, optimized for phone QR ordering and staff tablet/desktop use.
- Supabase is the persistence and auth target; the exposed browser UI never decides payment truth.
- UPI starts as an intent/deep-link flow; “paid” must be server-verified before launch with real money.
- Restaurant-scoped records carry `restaurant_id`; RLS is required in addition to frontend role hiding.

## Product
- Guests identify their table, browse searchable categories, build a cart, choose Cash or UPI, and track an order.
- Managers see live orders, table activity, sales totals, and update order progress.
- Chefs use a focused queue to move received orders through preparation and readiness.
- The platform supports a configurable platform service fee and payment history.

## User preferences
- User requested a web-only Material 3-inspired Sip N Bite app instead of Android.

## Gotchas
- Never accept a client-submitted total or payment status without server-side recalculation and verification.
- Do not put Supabase service-role credentials in frontend code.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
