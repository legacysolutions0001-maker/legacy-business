# Database Guide — Legacy Business ERP

## Overview

Legacy Business ERP uses **PostgreSQL** with **Drizzle ORM**. All tables are prefixed
with `lb_` to avoid conflicts with other databases.

---

## Connection

Set the `DATABASE_URL` environment variable:

```
postgresql://username:password@host:5432/database_name
```

Examples:
```bash
# Local development
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/legacy_business

# Docker
DATABASE_URL=postgresql://postgres:password@db:5432/legacy_business

# Replit (managed, auto-set)
DATABASE_URL=<automatically provided>
```

---

## Schema Management

### Apply changes (development)

```bash
pnpm --filter @workspace/db run push
```

This pushes your Drizzle schema to the database, creating/altering tables as needed.

> ⚠️ `push` is for development. For production, use migrations.

### Run migrations (production / API server boot)

The API server runs migrations automatically on startup via `runMigrations()`.
Migrations live in `lib/db/migrations/`.

To run manually:
```bash
pnpm --filter @workspace/db run push
```

---

## Table Reference

### Core System Tables

| Table | Description |
|-------|-------------|
| `lb_companies` | Company registry (multi-tenant) |
| `lb_users` | User accounts with roles |
| `lb_roles` | Custom role definitions |
| `lb_feature_toggles` | Feature flags per company |
| `lb_audit_log` | All user actions (immutable) |
| `lb_notifications` | System and user notifications |
| `lb_activity` | Activity feed entries |
| `lb_legacy_business_settings` | Company settings |
| `lb_branches` | Company branches |
| `lb_subscriptions` | Subscription plans and billing |

### Business Tables

| Table | Description |
|-------|-------------|
| `lb_customers` | Customer CRM records |
| `lb_suppliers` | Supplier database |
| `lb_products` | Product catalog |
| `lb_product_variants` | SKU variants (size, color, etc.) |
| `lb_stock_batches` | Stock batch tracking |
| `lb_stock_transactions` | Inventory movements |
| `lb_invoices` | Sales invoices |
| `lb_invoice_items` | Line items per invoice |
| `lb_purchase_orders` | Purchase orders |
| `lb_purchase_order_items` | PO line items |
| `lb_payments` | Payment records |
| `lb_sales_returns` | Sales return notes |
| `lb_purchase_returns` | Purchase return notes |
| `lb_daybook` | Daily journal entries |
| `lb_cash_bank_ledger` | Cash and bank transactions |
| `lb_expenses` | Expense records |
| `lb_eway_bills` | GST E-Way Bill records |

### HR Tables

| Table | Description |
|-------|-------------|
| `lb_employees` | Employee profiles |
| `lb_attendance` | Daily attendance records |
| `lb_leaves` | Leave applications |
| `lb_salary_records` | Monthly salary slips |

### CRM Tables

| Table | Description |
|-------|-------------|
| `lb_leads` | Sales leads |
| `lb_deals` | Deals in pipeline |
| `lb_appointments` | Customer appointments |
| `lb_messages` | Internal team messages |
| `lb_tasks` | Tasks and to-dos |
| `lb_projects` | Project management |

---

## Multi-Company Isolation

Every business table has a `company_id` foreign key:

```sql
-- All queries are scoped to a single company
SELECT * FROM lb_invoices WHERE company_id = 42;
```

The API middleware enforces this automatically — users can only see their own company's data.
Super admin can access any company using the `X-Company-Id` header.

---

## Indexes

Key indexes for performance:

```sql
-- Company scoping (on all business tables)
CREATE INDEX ON lb_invoices (company_id);
CREATE INDEX ON lb_products (company_id);

-- Date range queries
CREATE INDEX ON lb_invoices (invoice_date);
CREATE INDEX ON lb_daybook (date);

-- Username lookup (login)
CREATE INDEX ON lb_users (username);

-- Status filtering
CREATE INDEX ON lb_invoices (status);
```

---

## Backup and Restore

### Quick backup
```bash
pg_dump -U postgres -d legacy_business > backup_$(date +%Y%m%d).sql
```

### Restore from SQL dump
```bash
psql -U postgres -d legacy_business < backup_20250718.sql
```

### Using the application backup
See [BACKUP.md](BACKUP.md) for the built-in backup system.

---

## Maintenance

### Check database size
```sql
SELECT pg_size_pretty(pg_database_size('legacy_business'));
```

### List all ERP tables
```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'lb_%' ORDER BY tablename;
```

### Count rows per table
```sql
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE relname LIKE 'lb_%'
ORDER BY n_live_tup DESC;
```

### Vacuum (clean up dead rows)
```sql
VACUUM ANALYZE;
```
