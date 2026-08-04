# Windows Installation Guide — Legacy Business ERP

## Option 1: Use the Windows Installer (Recommended)

1. Download `Legacy Business Setup.exe` from the releases page
2. Right-click → "Run as administrator"
3. Follow the installation wizard:
   - Accept the License Agreement
   - Choose installation directory (default: `C:\Program Files\Legacy Business ERP`)
   - Choose whether to create desktop and Start Menu shortcuts
4. Click **Install**
5. Launch the application when prompted

On first launch, you will be asked to configure your database connection.

---

## Option 2: Portable Version

1. Download `Legacy Business Portable.exe`
2. Copy to any folder (USB drive, D:\ drive, etc.)
3. Double-click to run — no installation needed
4. Data is stored in `%APPDATA%\Legacy Business ERP\`

---

## Option 3: Manual Installation (Developer)

### Prerequisites

**Node.js 24:**
1. Download from https://nodejs.org/en/download/
2. Select "Windows Installer (.msi)" — 64-bit
3. Install with default settings
4. Verify: Open Command Prompt → `node --version`

**pnpm:**
```cmd
npm install -g pnpm
```

**PostgreSQL 16:**
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer
3. Set a password for the `postgres` user — **remember this password**
4. Keep default port: 5432
5. Install pgAdmin 4 when offered (useful for database management)

### Clone and Setup

```cmd
git clone https://github.com/your-org/legacy-business-erp.git
cd legacy-business-erp
pnpm install
```

### Create Database

Using pgAdmin 4:
1. Open pgAdmin 4
2. Right-click "Databases" → Create → Database
3. Name: `legacy_business`
4. Click Save

Or using Command Prompt:
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE legacy_business;"
```

### Set Environment Variables (Windows)

Open "Environment Variables" → System Properties → Advanced:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres:yourpassword@localhost:5432/legacy_business` |
| `SESSION_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Push Database Schema

```cmd
pnpm --filter @workspace/db run push
```

### Start the Application

```cmd
:: API Server (new Command Prompt window)
set PORT=8080
pnpm --filter @workspace/api-server run dev

:: Frontend (another Command Prompt window)
set PORT=21973
pnpm --filter @workspace/legacy-business run dev
```

Open browser: http://localhost:21973

---

## Windows Firewall Configuration

If accessing from other computers on your network:

1. Open Windows Defender Firewall
2. Advanced Settings → Inbound Rules → New Rule
3. Rule Type: Port
4. TCP, port 8080 and 21973
5. Allow the connection
6. Name: "Legacy Business ERP"

---

## Running as a Windows Service

To auto-start Legacy Business ERP with Windows:

### Using NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Open Command Prompt as Administrator:

```cmd
nssm install "LegacyBusinessAPI" "node" "C:\path\to\artifacts\api-server\dist\index.mjs"
nssm set "LegacyBusinessAPI" AppDirectory "C:\path\to\artifacts\api-server"
nssm set "LegacyBusinessAPI" AppEnvironmentExtra "PORT=8080" "DATABASE_URL=..." "SESSION_SECRET=..."
nssm start "LegacyBusinessAPI"
```

---

## Creating a Desktop Shortcut Manually

1. Right-click Desktop → New → Shortcut
2. Target: `http://localhost:21973`
3. Name: `Legacy Business ERP`
4. Change icon: use `electron\icons\icon.ico`

---

## Troubleshooting (Windows)

### "VCRUNTIME140.dll not found"
Install Microsoft Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### PostgreSQL connection refused
- Open Services (Win+R → services.msc)
- Find "postgresql-x64-16" → Start

### "Access Denied" during installation
- Right-click the installer → "Run as administrator"

### Application doesn't start after install
- Check Windows Event Viewer for errors
- Verify DATABASE_URL is set correctly in app settings
- Try running from Command Prompt to see error output
