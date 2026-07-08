---
name: Multi-tenant ERP security checklist
description: Recurring security gaps to check for when repairing/porting a multi-tenant Express + Drizzle app (e.g. company-scoped ERP/SaaS backends).
---

When repairing or completing a multi-tenant backend (companyId/tenantId-scoped tables), audit for these patterns specifically — they showed up together in one real port and are easy to miss individually:

- **Seed/bootstrap endpoints must be blocked in production.** An unauthenticated `/seed/init`-style route that creates a default admin and returns credentials in the response is a takeover path if it ever reaches a deployed environment. Gate with `NODE_ENV !== "production"` (404 in prod) and never echo passwords in the response.
- **Boot-time "ensure admin exists" logic must not reset an existing password.** A common bug: `ensureSuperAdmin()`-style functions upsert the admin user on every server start and overwrite the password hash even when the row already exists, silently undoing any password change on every restart. Only set the password hash on first creation; require an explicit, separately-authenticated "repair" action to force a reset.
- **Prefer cookie-only sessions over cookie + localStorage + Bearer.** If a JWT is both set as an httpOnly cookie and also returned in the response body for localStorage storage, the localStorage copy is readable by any injected script and defeats httpOnly's XSS protection. Pick one (cookie-only for same-origin web apps) and remove the other path from both client and server.
- **Every raw SQL `UPDATE ... WHERE id = X` on a tenant-scoped table needs `AND company_id = :companyId` too**, not just the read-path queries — it's easy to scope `SELECT`s correctly while missing it on a side-effect `UPDATE` (e.g. incrementing a customer's revenue counter after an invoice, or decrementing stock). Grep for raw `sql`/`db.execute` calls specifically; ORM query builders make this harder to forget but raw SQL doesn't.
- **Validate foreign-key ownership on write, not just the row being written.** A `POST` that creates a child record (e.g. a stock batch or product variant) scoped to the caller's own `companyId` can still reference a `productId`/parent id belonging to a *different* tenant if that id isn't itself verified to belong to the caller's company before the insert.
