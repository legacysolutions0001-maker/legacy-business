# Super Admin Guide — Legacy Business ERP

## Default Login

| Field | Value |
|-------|-------|
| URL | `/super` |
| Username | `bhullar01` |
| Password | `Bhullar_01` |

> ⚠️ **Change the default password immediately after first login.**

---

## Accessing the Super Admin Panel

1. Open your Legacy Business ERP URL
2. Go to `/super` (e.g., https://yourapp.com/super)
3. Enter super admin credentials
4. You will be taken to the Super Admin Dashboard

---

## Company Management

### Create a New Company

1. Go to **Companies** in the super admin menu
2. Click **Add Company**
3. Fill in:
   - Company Name
   - Company Code (unique identifier, e.g., "DEMO01")
   - GST Number (optional)
   - PAN Number (optional)
   - Address details
   - Subscription Plan (Free/Basic/Pro)
4. Click **Create Company**

The company is created and immediately active.

### Suspend a Company

1. Find the company in the list
2. Click **Suspend**
3. Users of that company will see "Account Suspended" on login
4. The company's data is preserved

### Reactivate a Company

1. Find the suspended company
2. Click **Activate**
3. Users can log in immediately

### Delete a Company

> ⚠️ **Permanent.** All company data is deleted and cannot be recovered.

1. Find the company
2. Click **Delete**
3. Type the company code to confirm
4. Click **Delete Permanently**

---

## User Management

### Create a Company User

1. Go to **Users**
2. Click **Add User**
3. Select the company
4. Enter username, password, name, email
5. Set role (owner, manager, staff, accountant, viewer)
6. Click **Create User**

### Roles and Permissions

| Role | Access Level |
|------|-------------|
| `owner` | Full access to all company features |
| `manager` | All features except settings |
| `accountant` | Invoices, payments, reports, daybook |
| `staff` | Customers, inventory, basic operations |
| `viewer` | Read-only access |

### Change User Password

1. Find the user in the list
2. Click **Reset Password**
3. Enter new password
4. Click **Save**

### Deactivate a User

1. Find the user
2. Click the toggle to deactivate
3. User can no longer log in

---

## Impersonating a Company

Super admin can view any company's data:

1. Go to a company page
2. Click **View as Company**
3. All API calls will use that company's data

Or via API (for technical use):
```
X-Company-Id: <company_id>
```

---

## Subscription Management

1. Go to **Subscriptions**
2. Set plan per company:
   - **Free:** Basic features, limited records
   - **Basic:** All features, moderate limits
   - **Pro:** Unlimited records, priority support
3. Set subscription end date
4. Changes take effect immediately

---

## Audit Logs

All user actions are logged:

1. Go to **Settings** → **Audit Log**
2. Filter by:
   - Company
   - User
   - Action type
   - Date range
3. Export as CSV for compliance

Logged actions include: login, logout, create, update, delete, export, restore.

---

## Emergency Super Admin Recovery

If you lose access to the super admin account:

**Method 1: Repair endpoint (requires SESSION_SECRET)**
```bash
curl -X POST https://yourapp.com/api/seed/repair-super-admin \
  -H "Content-Type: application/json" \
  -d '{"masterKey": "<SESSION_SECRET value>"}'
```

**Method 2: Environment variable**
Set `SUPER_ADMIN_PASSWORD` to the new password and restart the server.
The password is reset on next boot.

**Method 3: Direct database**
```sql
UPDATE lb_users SET password_hash = '<new bcrypt hash>' WHERE username = 'bhullar01';
```
Generate bcrypt hash: `node -e "const b=require('bcryptjs'); b.hash('newpassword', 10).then(console.log)"`
