# Installation Guide — Legacy Business ERP

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 24.0+ | https://nodejs.org |
| pnpm | 10.0+ | `npm install -g pnpm` |
| PostgreSQL | 14+ | https://www.postgresql.org |
| Git | Any | https://git-scm.com |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/legacy-business-erp.git
cd legacy-business-erp
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

This installs all packages across the monorepo (API server, frontend, shared libraries).

---

## Step 3: Configure Environment Variables

### API Server

Create `artifacts/api-server/.env` (or set system environment variables):

```env
# Required — PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/legacy_business

# Required — Secret key for JWT signing (use a long random string)
SESSION_SECRET=your-secret-key-min-32-chars-long

# Optional — Super admin credentials (defaults shown)
SUPER_ADMIN_USERNAME=bhullar01
SUPER_ADMIN_PASSWORD=Bhullar_01

# Optional — Backup directory
BACKUP_DIR=/path/to/backups

# Port (set by workflow automatically on Replit)
PORT=8080
```

### Generate a secure SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4: Create the Database

```bash
# Create database (PostgreSQL)
createdb legacy_business

# Push schema (Drizzle will create all tables)
pnpm --filter @workspace/db run push
```

---

## Step 5: Start Development Servers

### Option A: Both servers separately

```bash
# Terminal 1: API server
cd artifacts/api-server
PORT=8080 SESSION_SECRET=your-secret DATABASE_URL=postgresql://... pnpm run dev

# Terminal 2: Frontend
cd artifacts/legacy-business
PORT=21973 pnpm run dev
```

### Option B: Using Replit (recommended)

Simply open the project in Replit — workflows start automatically.

---

## Step 6: First Login

1. Open http://localhost:21973 in your browser
2. Click "Super Admin Login" or go to `/super`
3. Login with:
   - Username: `bhullar01`
   - Password: `Bhullar_01`
4. Create your first company
5. Create a company user
6. Log in as the company user at `/login`

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | — | JWT signing secret (min 32 chars) |
| `PORT` | ✅ | — | API server port |
| `SUPER_ADMIN_USERNAME` | ❌ | `bhullar01` | Super admin username |
| `SUPER_ADMIN_PASSWORD` | ❌ | `Bhullar_01` | Super admin password |
| `BACKUP_DIR` | ❌ | `./backups` | Server-side backup storage path |
| `NODE_ENV` | ❌ | `development` | Set to `production` in prod |

---

## Troubleshooting

### "Database connection refused"
- Verify PostgreSQL is running: `pg_ctl status` or `systemctl status postgresql`
- Check your `DATABASE_URL` is correct
- Ensure the database exists: `psql -l | grep legacy_business`

### "SESSION_SECRET not set"
- The API server refuses to start without this variable
- Add it to your environment or `.env` file

### "Cannot find migrations folder"
- Run `pnpm --filter @workspace/api-server run build` once to create the dist/ folder
- Migrations are automatically copied to dist/ on each build

### "Port already in use"
- Change `PORT` in the workflow or your `.env`
- Check: `lsof -i :8080` (Linux/Mac) or `netstat -ano | findstr :8080` (Windows)

### TypeScript errors
```bash
pnpm run typecheck  # Run full typecheck
```
