# Production Deployment Guide — Legacy Business ERP

## Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|-----------|------|----------|
| Replit | Easy | Free/Paid | Quick start, demos |
| Ubuntu VPS | Medium | $5-20/mo | Small teams |
| Windows Server | Medium | Varies | Windows-only environments |
| Electron app | Easy | Free | Desktop usage |

---

## Option 1: Replit Deployment

1. Open the project in Replit
2. Click **Deploy** (publish button in the preview pane)
3. Set secrets in Replit Secrets:
   - `SESSION_SECRET` (required)
   - `SUPER_ADMIN_PASSWORD` (change from default!)
4. The database is automatically provisioned by Replit
5. Your app is live at `https://your-app.replit.app`

---

## Option 2: Ubuntu VPS

### Install Prerequisites

```bash
# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Process manager
npm install -g pm2
```

### Setup PostgreSQL

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE legacy_business;
CREATE USER legacy_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE legacy_business TO legacy_user;
\q
```

### Clone and Build

```bash
git clone <repo-url> /opt/legacy-business-erp
cd /opt/legacy-business-erp
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://legacy_user:strong_password_here@localhost:5432/legacy_business"
export SESSION_SECRET="$(openssl rand -hex 32)"
export NODE_ENV=production

# Build API server
PORT=8080 pnpm --filter @workspace/api-server run build

# Build frontend
PORT=21973 BASE_PATH=/ pnpm --filter @workspace/legacy-business run build
```

### Start with PM2

```bash
# Create ecosystem file
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'legacy-business-api',
      script: './artifacts/api-server/dist/index.mjs',
      cwd: '/opt/legacy-business-erp',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        DATABASE_URL: 'postgresql://legacy_user:password@localhost:5432/legacy_business',
        SESSION_SECRET: 'your-secret-here',
      },
    },
  ],
};
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Follow the printed command to auto-start on reboot
```

### Nginx Reverse Proxy

```bash
sudo apt-get install -y nginx
```

```nginx
# /etc/nginx/sites-available/legacy-business
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    root /opt/legacy-business-erp/artifacts/legacy-business/dist/public;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/legacy-business /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Security Checklist for Production

- [ ] Change `SUPER_ADMIN_PASSWORD` from default
- [ ] Use a strong `SESSION_SECRET` (32+ random chars)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up firewall (only ports 80/443 and 22 open)
- [ ] Regular database backups (see BACKUP.md)
- [ ] Keep Node.js and packages updated
- [ ] Use a non-root user to run the application
- [ ] Enable PostgreSQL SSL connections

---

## Environment Variables for Production

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/legacy_business
SESSION_SECRET=<64-char random hex string>
SUPER_ADMIN_USERNAME=your_admin_username
SUPER_ADMIN_PASSWORD=<strong password>
BACKUP_DIR=/var/backups/legacy-business
```
