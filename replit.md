# Legacy Business ERP

A multi-tenant ERP platform for small businesses in India. Super admins issue
license keys, companies activate them, and each company gets an isolated
PostgreSQL-backed workspace for Inventory, Invoices, HR, CRM, and more.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required environment variables (put in repo-root `.env`)

```
DATABASE_URL=<postgres connection string>
SESSION_SECRET=<random secret for JWT signing>
FIREBASE_PROJECT_ID=legacy-business-erp
FIREBASE_STORAGE_BUCKET=legacy-business-erp.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT_JSON=<single-line JSON of the Firebase service account>
SUPER_ADMIN_USERNAME=bhullar01
SUPER_ADMIN_PASSWORD=Bhullar_01
COMPANY_NAME=legacy solutions
SUPPORT_EMAIL=legacysolutions0001@gmail.com
SUPPORT_PHONE=+91 7452888421
NODE_ENV=development
PORT=5000
```

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- Frontend: React + Vite + Tailwind + shadcn/ui (`artifacts/legacy-business`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Auth: JWT stored in httpOnly cookies; roles: `super_admin`, `owner`, `sub_admin`, `worker`
- License: Firebase Firestore (company/license records); local PG for all business data
- Electron: Desktop wrapper (`electron/`)

## Architecture decisions

- **Firebase = license & subscription truth source only.** All business data
  (inventory, invoices, HR, CRM, etc.) is stored in the local PostgreSQL DB and
  NEVER written to Firebase. This is by design for privacy and performance.
- **Activation flow:** Super admin creates company → auto-generates license key →
  syncs to Firestore. Customer runs Setup Wizard → verifies against Firestore →
  company + owner written to local PG → device registered.
- **Limit enforcement (all enforced server-side):**
  - `maxUsers` — enforced in `POST /api/company/users` (HTTP 403 when reached)
  - `maxDevices` — enforced in `POST /api/license/activate` (HTTP 422 when reached)
  - `maxBranches` — enforced in `POST /api/branches` (HTTP 403 when reached)
- **Firestore undefined values:** All Firestore writes go through
  `syncCompanyToFirestore` which strips `undefined` fields before calling
  `docRef.set()` — Firestore rejects documents with `undefined` values.

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/api-server/src/routes/` | All REST endpoints |
| `artifacts/api-server/src/lib/firebase-admin.ts` | Firebase Admin SDK — license verify, sync, activation |
| `artifacts/api-server/src/middlewares/auth.ts` | JWT middleware, role guards |
| `artifacts/api-server/src/routes/license.ts` | License verify, activate, device management |
| `artifacts/api-server/src/routes/super.ts` | Super admin CRUD for companies, users, subscriptions |
| `artifacts/api-server/src/routes/auth.ts` | Login, logout, /me, password change |
| `artifacts/api-server/src/routes/users.ts` | User management (user limit enforced here) |
| `artifacts/api-server/src/routes/branches.ts` | Branch management (branch limit enforced here) |
| `lib/db/src/schema/` | Drizzle ORM schema for all tables |
| `electron/main.js` | Electron main process (desktop build) |
| `artifacts/legacy-business/src/` | React frontend (ERP UI) |
| `artifacts/legacy-business/public/` | Static assets including logos |

## User preferences

- Super admin: bhullar01 / Bhullar_01
- Company: legacy solutions
- Support: legacysolutions0001@gmail.com | +91 7452888421

## Gotchas

- **Never store business data in Firebase.** Only company registration / license /
  subscription records live in Firestore.
- **Run `pnpm --filter @workspace/db run push` after schema changes** — migrations
  are not auto-applied in production.
- **FIREBASE_SERVICE_ACCOUNT_JSON must be single-line JSON** in `.env` — the private
  key newlines are already encoded as `\n` inside the JSON string.
- `.env` and `firebase-service-account.json` are in `.gitignore` — never commit them.
