# Legacy Business ERP

A production-grade commercial ERP system for managing multiple client companies, licenses, inventory, invoicing, HR, payroll, CRM, and more. Includes a Super Admin portal for managing companies and subscriptions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/legacy-business run dev` — React frontend (port 21973, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (Replit-managed or Supabase)
- Required env: `SESSION_SECRET` — JWT signing secret

## Super Admin

- Username: read from `SUPERADMIN_USERNAME` secret (fallback: `bhullar01`)
- Password: read from `SUPERADMIN_PASSWORD` secret (fallback: `Bhullar_01`)
- Login URL: `/super` (click "Super Administrator Login" at bottom of login page)
- Super admin is auto-created/verified on every server startup

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter routing
- API: Express 5 + pino logger + express-rate-limit
- Auth: JWT (httpOnly cookie) + bcryptjs — CSRF-safe cookie-only sessions
- DB: PostgreSQL + Drizzle ORM + drizzle-zod validation
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/legacy-business/src/` — React frontend (pages, components, contexts)
- `artifacts/legacy-business/src/pages/super/` — Super admin UI pages
- `artifacts/api-server/src/routes/` — All 39 API route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth + role guards
- `lib/db/src/schema/` — 35+ Drizzle table definitions
- `lib/db/migrations/` — SQL migration files
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for contracts)

## Architecture decisions

- Cookie-only JWT sessions (no Bearer token in response body) to prevent XSS token theft
- `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` env vars checked before hardcoded fallbacks
- Super admin verified (not overwritten) on each boot — password changes persist across restarts
- Force password reset only via `POST /seed/repair-super-admin` with master key
- Rate limiting enabled on all routes via express-rate-limit
- `requireResolvedCompany` middleware allows super admin to act on behalf of any company via `X-Company-Id` header

## Product

- **Super Admin Portal**: manage companies, licenses, subscriptions, users, notifications
- **Company ERP**: Dashboard, Invoices, Inventory, Customers, Suppliers, HR, Salary, Purchase, Returns, Cash & Bank, CRM, Appointments, Expenses, Projects, Day Book, E-Way Bills, Reports, Backup, Messaging, Ledger

## User preferences

- Never hardcode credentials — always read from Replit Secrets
- Secrets: GITHUB_TOKEN, GITHUB_URL, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD, SESSION_SECRET
- Env var names in code: `SUPERADMIN_USERNAME` (no underscore between SUPER and ADMIN)

## Gotchas

- `DATABASE_URL` is runtime-managed by Replit — do not set it manually via `setEnvVars`
- To switch to Supabase, override `DATABASE_URL` at the OS level or via `.env` file
- `seed.ts` reads both `SUPERADMIN_USERNAME` AND `SUPER_ADMIN_USERNAME` for compatibility
- Build must complete before `pnpm run start` — the `dev` script runs build then start
- Migrations run automatically on server startup via `runMigrations()` in `server.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- GitHub repo: https://github.com/legacysolutions0001-maker/legacy-business
