# Backup Guide — Legacy Business ERP

## Overview

Legacy Business ERP provides multiple backup options to protect your data:

| Method | Format | Scope | Best For |
|--------|--------|-------|----------|
| Full Excel Backup | .xlsx | All data | Regular weekly backups |
| Full JSON Backup | .json | All data | Technical restore |
| Individual CSV | .csv | One table | Sharing specific data |
| Auto Backup | .json | All data | Automatic protection |

---

## Manual Backup

### Full Excel Backup (Recommended)

1. Go to **Backup & Export** in the sidebar
2. Click **Download Excel Backup**
3. A single `.xlsx` file downloads with all your data in separate sheets
4. Save to:
   - USB pen drive
   - Google Drive / OneDrive folder
   - Network share

The Excel file contains these sheets:
- Customers, Suppliers, Products, Product Variants
- Invoices, Purchase Orders
- Payments, Cash & Bank
- Employees, Salary Records
- Daybook, E-Way Bills
- Stock Batches, Company Settings

### Full JSON Backup (for IT use)

1. Click **Download JSON Backup**
2. Produces a single `.json` file with all company data
3. This file is used for the restore operation

### Individual Table CSV

1. Click **CSV** next to any table name
2. Opens directly in Excel, Google Sheets, or LibreOffice
3. Useful for sharing specific data with accountants/auditors

---

## Automatic Backup Scheduler

Configure automatic backups so you never forget:

1. Go to **Backup & Export** → **Backup Scheduler**
2. Choose frequency:
   - **Daily** — 2:00 AM every day
   - **Weekly** — Sunday at 2:00 AM
   - **Monthly** — 1st of each month at 2:00 AM
3. Select backup location (see below)
4. Click **Save Schedule**

The system will automatically download/save backup files on schedule.

---

## Backup Storage Locations

### Browser Download (Default)

Files download to your browser's default download folder
(usually `C:\Users\YourName\Downloads`).

**Recommended:** Move to a dedicated backup folder immediately.

### Custom Folder

Use the folder picker to save backups directly to:

| Location | Path Example | Notes |
|----------|-------------|-------|
| D: Drive | `D:\Backups\LegacyERP` | Good for data drives |
| OneDrive | `C:\Users\Name\OneDrive\Backups` | Auto-syncs to cloud |
| External HDD | `E:\LegacyERPBackup` | Plug in before backup |
| USB Pen Drive | `F:\Backup` | Portable, keep offsite |
| Network Share | `\\server\backups\erp` | Central company backup |

> **Note:** For external drives and USB drives, ensure they are connected before the automatic backup runs. If the drive is not available, the backup will use the fallback download method.

---

## Backup Best Practices

✅ **DO:**
- Take a full backup every week
- Keep backups in at least 2 locations (local + cloud)
- Test your backup by verifying it opens correctly in Excel
- Take a backup before:
  - Major data entry sessions
  - Software updates
  - Any bulk data changes

❌ **DON'T:**
- Keep backups only on the same computer as the database
- Delete old backups immediately (keep at least 4 weeks)
- Use backup filenames without dates

### Recommended Backup Schedule

| Frequency | What | Where |
|-----------|------|-------|
| Daily | Quick JSON backup | OneDrive auto-sync folder |
| Weekly | Full Excel backup | USB pen drive + OneDrive |
| Monthly | Full JSON backup | External HDD (store offsite) |

---

## Backup File Naming

Backups are named with the date:
```
legacy-erp-backup-2025-07-18.json
legacy-erp-backup-2025-07-18.xlsx
products-2025-07-18.csv
```

---

## Backup Verification

After downloading a backup:

1. **Excel backup:** Open the `.xlsx` file — check that sheets contain data
2. **JSON backup:** Open in a text editor — should start with `{` and contain your data
3. **Size check:** A typical backup with 1 year of data is 500KB–10MB

### Using the Verify Feature

1. Go to **Backup & Export** → **Verify Backup**
2. Upload your backup file
3. The system reports what data it contains and validates the format
4. If valid, you can proceed to restore

---

## Backup History

The **Backup History** panel shows your recent backups:
- Date and time of each backup
- File size
- Storage location
- Status (Success/Failed)
- Option to download again or delete
