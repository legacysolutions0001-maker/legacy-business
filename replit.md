# Legacy Business ERP

A multi-tenant ERP for Indian small/medium businesses: inventory, invoicing, purchase orders, CRM, HR/payroll, e-way bills, day book, cash & bank ledger, and reporting.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/legacy-business run dev` — run the ERP frontend
- `pnpm run typecheck` — full typecheck across all packages (use this to verify artifacts, not `build` — `build` requires workflow-provided `PORT`/`BASE_PATH`)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `curl -X POST <api>/api/seed/init` — seed a demo company + super admin (safe to re-run; upserts)
- Required env: `DATABASE_URL` — Postgres connection string (provisioned via Replit's built-in Postgres)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth (`jsonwebtoken` + `bcryptjs`), cookie sessions, pino logging
- DB: PostgreSQL + Drizzle ORM (~30 tables: companies, users, customers, suppliers, products, invoices, purchase orders, salary, expenses, daybook, e-way bills, cash/bank, subscriptions, projects, CRM leads/deals, HR/attendance, etc.)
- Frontend: React + Vite, shadcn/radix UI, wouter routing, TanStack Query
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/*.ts` — Drizzle schema, one file per domain area
- `artifacts/api-server/src/routes/*.ts` — one Express router file per domain area (customers, inventory, invoices, purchase, HR, CRM, etc.)
- `artifacts/api-server/src/routes/seed.ts` — `ensureSuperAdmin()` (runs on boot) and `/api/seed/init`, `/api/seed/demo` demo-data seeders
- `artifacts/legacy-business/src/pages/*.tsx` — one page per ERP module
- `artifacts/legacy-business/src/contexts/AuthContext.tsx` — client auth/session state
- `lib/api-spec/openapi.yaml` — source-of-truth API contract used for codegen

## Architecture decisions

- Multi-tenant by `companyId` — most tables scope data to a company; `super_admin` role (no `companyId`) manages companies/subscriptions across tenants via `/api/super/*`.
- Auth is a custom JWT-in-httpOnly-cookie scheme (`lb_token`), not Replit Auth/Clerk — this predates the current session and was kept as-is per the existing codebase.
- The OpenAPI spec (`lib/api-spec/openapi.yaml`) covers only a subset of routes (health, leads, deals, expenses, leaves, projects, tasks, appointments); most ERP routes (inventory, invoices, purchase, customers, etc.) are hand-written and not yet reflected in the spec/codegen. Treat the spec as incomplete, not authoritative, until reconciled.

## Product

Company owners sign in with a company code + username/password to manage inventory, sales invoices, purchases, customers/suppliers, CRM pipeline, HR/payroll, day book, e-way bills, cash & bank ledgers, and reports. A separate super-admin login manages companies and subscriptions platform-wide.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Default super admin credentials come from `SUPER_ADMIN_USERNAME`/`SUPER_ADMIN_PASSWORD` env vars, falling back to `bhullar01` / `Bhullar_01` if unset — change these via secrets for any real deployment.
- After a fresh DB push, call `POST /api/seed/init` once to get a working demo company/login; otherwise there is no company/user data to sign in with.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
