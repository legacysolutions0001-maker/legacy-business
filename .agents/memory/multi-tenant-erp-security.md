---
name: Multi-tenant ERP security checklist
description: Recurring security gaps when building/repairing tenant-scoped ERP routes in this project (Legacy Business ERP)
---

## Rules to apply on every new route or stock-mutation

### 1. Seed / admin endpoints — never expose in production
- Gate `/api/seed` and `/api/super` with `NODE_ENV !== "production"` OR a SESSION_SECRET master key check.
- Never reset super-admin password on every boot — only when `forceResetPassword` flag is explicitly passed.

### 2. Auth storage — cookies only, no localStorage
- Tokens must live in HttpOnly cookies. Never return a bearer token to the client. LocalStorage is XSS-accessible.

### 3. Every query scoped by companyId
- Raw SQL UPDATEs must include `AND company_id = ${companyId}` — Drizzle `.where()` alone doesn't protect raw `db.execute(sql...)` calls.
- Post-update reads (e.g. fetching `currentStock` for a ledger entry) must also include `eq(table.companyId, companyId)` — not just `eq(table.id, id)`.

### 4. FK ownership validation on writes
- Before inserting a child record that references a parent (e.g. stock batch → product, variant → product, ledger → product), SELECT the parent with both `id` AND `companyId` filters. If not found, return 404.
- Item loops in invoices/purchase/returns must validate each `item.productId` belongs to the caller's company before updating stock or writing ledger rows.

### 5. Numeric param validation
- Every `:id` route param and numeric query param (`productId`, `limit`, `offset`) must be `parseInt`-ed and checked with `isNaN` → return 400 immediately. Never pass a NaN silently to Drizzle.

### 6. Enum query param validation
- For `type` or `status` query params, validate against an explicit Set of valid values and return 400 on unknown values.

### 7. Stock ledger inserts — non-blocking
- Wrap `db.insert(stockTransactionsTable)` in `.catch(() => {})` so a ledger failure never kills the main transaction response.

### 8. External service references
- Never hardcode cloud service URLs (render.com, supabase.co, neon.tech, railway.app, etc.) in source code. Use env vars or remove them. The app targets localhost PostgreSQL only.

**Why:** All of the above were found as real vulnerabilities in code review passes on this project. Each rule maps to a confirmed finding that required a fix.

**How to apply:** Read this file at the start of any new route file or stock-mutation change. Run through checklist items 3–7 for every new handler before committing.
