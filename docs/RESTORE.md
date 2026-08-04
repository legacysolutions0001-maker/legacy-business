# Data Restore Guide — Legacy Business ERP

## ⚠️ Important Warnings

> **Restoring will OVERWRITE existing data.** Always create a backup of your current data before restoring.

> **Confirmation required.** You must type `RESTORE` to confirm the operation.

---

## When to Restore

- Data was accidentally deleted
- Database was corrupted
- Migrating to a new server
- Recovering from a hardware failure

---

## Step 1: Create a Current Backup

Before restoring, backup your current data:

1. Go to **Backup & Export**
2. Click **Download JSON Backup** or **Download Excel Backup**
3. Save the file safely

---

## Step 2: Locate Your Backup File

You need a `.json` backup file (not `.xlsx` or `.csv`).

The file should:
- Start with `{"exportedAt":"..."`
- Have `.json` extension
- Be named like `legacy-erp-backup-2025-07-18.json`

---

## Step 3: Restore Process

### Via the Web Interface

1. Go to **Backup & Export**
2. Scroll to **Restore Data**
3. Click **Choose File** and select your `.json` backup
4. Review the backup summary (date, company, tables)
5. Type `RESTORE` in the confirmation box
6. Click **Restore Now**
7. Wait for the process to complete (may take 1-5 minutes for large datasets)
8. You will see a summary of what was restored

### What Gets Restored

The restore operation imports these tables:
- ✅ Customers
- ✅ Suppliers
- ✅ Products & Variants
- ✅ Employees
- ✅ Daybook entries
- ✅ Company settings

These are NOT overwritten by restore (preserved for safety):
- ❌ Invoices (manually re-enter or contact support)
- ❌ Payment records
- ❌ Salary records
- ❌ User accounts

> **Full restore** (including invoices) is available via the admin panel. Contact support for assistance.

---

## Step 4: Verify After Restore

After restore completes:

1. Go to **Customers** — verify your customers are present
2. Go to **Inventory** — check products and stock levels
3. Go to **Dashboard** — review the summary numbers
4. Check one or two recent invoices
5. Verify company settings (GST number, address, etc.)

---

## Partial Restore (Single Table)

To restore only a specific table without affecting others:

1. Go to **Backup & Export** → **Advanced Restore**
2. Upload your backup file
3. Select which tables to restore
4. Confirm and restore

This is useful when only one module's data was corrupted or deleted.

---

## Emergency Database Restore

If the database itself is corrupted:

1. Connect to PostgreSQL:
   ```bash
   psql -U postgres -d legacy_business
   ```
2. The API server runs migrations automatically on start — run it to recreate tables:
   ```bash
   pnpm --filter @workspace/api-server run dev
   ```
3. Then use the web interface to restore from your backup file

---

## Troubleshooting Restore Issues

### "Invalid backup format"
- Ensure you're using a `.json` file (not `.xlsx`)
- The file must have been created by Legacy Business ERP's export function
- Do not edit the JSON file manually

### "Company mismatch"
- The backup was from a different company
- You can still restore — the system will re-map the company ID

### "Restore failed — constraint violation"
- Some records conflict with existing data
- The restore uses `ON CONFLICT DO NOTHING` so conflicting records are skipped
- Check the restore summary for skipped rows

### "File too large"
- Large backups (>50MB) may time out in the browser
- Contact your system administrator to restore via command line:
  ```bash
  # Via API endpoint directly
  curl -X POST http://localhost:8080/api/backup/restore \
    -H "Cookie: lb_token=your-token" \
    -H "Content-Type: application/json" \
    -d '{"data": <backup-data>, "confirm": "RESTORE"}'
  ```

---

## Restore Logs

All restore operations are recorded in the **Audit Log**:
- Go to Settings → Audit Log
- Filter by action type "Restore"
- See what was restored, when, and by whom
