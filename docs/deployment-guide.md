# Deployment Guide

**Last Updated:** 2024-12-18  
**Version:** 1.0.0

---

## Overview

This guide covers deployment of ISO Document Management System to production environment using Docker and how it integrates with GitHub Actions CI/CD.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Access to SMB shared folder
- PostgreSQL 16+ (or use Docker image)
- Node.js 20+ (for local development)

## Environment Setup

### 1. Environment Variables

Create `.env.production` file:

```env
# Database
DATABASE_URL=postgresql://admin:password@postgres:5432/documents_db?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMB Storage (Production - Linux)
SMB_MOUNT_PATH=/shared  # Path in container (mounted from host /mnt/smb)

# App
API_PORT=3001
WEB_PORT=3000
NODE_ENV=production
CORS_ORIGIN=http://your-domain.com

# Optional: Redis
REDIS_URL=redis://redis:6379
```

### 2. SMB Share Access

**Mount SMB Share on Linux Host (Required)**

### Step 1: Install cifs-utils

```bash
sudo apt-get update
sudo apt-get install cifs-utils
```

### Step 2: Create Credentials File

Create secure credentials file:

```bash
sudo nano /etc/smb-credentials
```

Add content:

```
username=your-username
password=your-password
domain=bestpacific.com
```

Secure the file:

```bash
sudo chmod 600 /etc/smb-credentials
sudo chown root:root /etc/smb-credentials
```

### Step 3: Create Mount Script

Create mount script with error handling:

```bash
sudo nano /usr/local/bin/mount-smb.sh
```

Add content:

```bash
#!/bin/bash
MOUNT_POINT="/mnt/smb"
SMB_SHARE="//10.0.60.30/Public"
CREDENTIALS="/etc/smb-credentials"

# Check if already mounted
if mountpoint -q "$MOUNT_POINT"; then
    echo "SMB share already mounted"
    exit 0
fi

# Create mount point if not exists
mkdir -p "$MOUNT_POINT"

# Mount SMB share
mount -t cifs "$SMB_SHARE" "$MOUNT_POINT" \
  -o credentials="$CREDENTIALS",uid=1000,gid=1000,file_mode=0664,dir_mode=0775,iocharset=utf8,vers=3.0

if [ $? -eq 0 ]; then
    echo "SMB share mounted successfully"
    exit 0
else
    echo "Failed to mount SMB share"
    exit 1
fi
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/mount-smb.sh
```

### Step 4: Create Systemd Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/smb-mount.service
```

Add content:

```ini
[Unit]
Description=Mount SMB Share
After=network-online.target
Wants=network-online.target
Before=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mount-smb.sh
ExecStop=/usr/bin/umount /mnt/smb
RemainAfterExit=yes
Restart=on-failure
RestartSec=30
TimeoutStartSec=60

[Install]
WantedBy=multi-user.target
```

### Step 5: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable smb-mount.service

# Start service
sudo systemctl start smb-mount.service

# Check status
sudo systemctl status smb-mount.service

# View logs
sudo journalctl -u smb-mount.service -f
```

### Step 6: Verify Mount

```bash
# Check if mounted
ls /mnt/smb
mount | grep smb

# Test access
cd /mnt/smb && ls -la
```

### Step 7: Optional - Health Check Timer

Create health check service:

```bash
sudo nano /usr/local/bin/check-smb-mount.sh
```

Add content:

```bash
#!/bin/bash
MOUNT_POINT="/mnt/smb"

if ! mountpoint -q "$MOUNT_POINT"; then
    echo "SMB mount is not active, attempting to remount..."
    systemctl restart smb-mount.service
    exit 1
fi

echo "SMB mount is healthy"
exit 0
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/check-smb-mount.sh
```

Create timer:

```bash
sudo nano /etc/systemd/system/smb-mount-check.timer
```

Add content:

```ini
[Unit]
Description=Check SMB Mount Health
Requires=smb-mount.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Create service:

```bash
sudo nano /etc/systemd/system/smb-mount-check.service
```

Add content:

```ini
[Unit]
Description=Check SMB Mount Health
After=smb-mount.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-smb-mount.sh
```

Enable timer:

```bash
sudo systemctl enable smb-mount-check.timer
sudo systemctl start smb-mount-check.timer
```

**Docker Volume Mount**

After SMB share is mounted on host, configure Docker to use it:

In `docker-compose.prod.yml`:

```yaml
services:
  api:
    image: iso-docs-api:latest
    volumes:
      - /mnt/smb:/shared # Mount from host to container
    environment:
      - SMB_MOUNT_PATH=/shared # Path in container
    depends_on:
      - postgres
    restart: unless-stopped
```

**Important:** The systemd service mounts SMB share **before** Docker starts (via `Before=docker.service`), ensuring the mount is available when containers start.

**Verify Container Access:**

```bash
# Check if container can access mounted path
docker-compose -f docker-compose.prod.yml exec api ls /shared

# Test file operations
docker-compose -f docker-compose.prod.yml exec api touch /shared/test.txt
docker-compose -f docker-compose.prod.yml exec api ls -la /shared/test.txt
docker-compose -f docker-compose.prod.yml exec api rm /shared/test.txt
```

## Local Development

### Quick Start

```bash
# 1. Clone repository
cd documentsManager

# 2. Install dependencies
npm install

# 3. Start database
docker-compose up -d postgres redis

# 4. Setup environment
cp env.example.txt .env.local
# Edit .env.local with your settings

# 5. Setup database
npm run db:generate
npm run db:push
cd apps/api && npx ts-node prisma/seed.ts

# 6. Start development servers
npm run dev
```

### Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api/docs
- **Database:** localhost:5432

### Default Credentials

- Username: `admin`
- Password: `admin123`

## Production Deployment

### 1. Build Docker Images

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Or build individually
docker build -f apps/api/Dockerfile -t iso-docs-api .
docker build -f apps/web/Dockerfile -t iso-docs-web .
```

### 2. Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Database Migration

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Or if using db push
docker-compose -f docker-compose.prod.yml exec api npx prisma db push

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec api npx ts-node prisma/seed.ts
```

## CI/CD Integration (GitHub Actions)

### Workflows Overview

- **Location**: `.github/workflows`
- **Workflows**:
  - `ci.yml`: Lint, type-check, test (API/Web), build
  - `docker.yml`: Build & push Docker images lên GitHub Container Registry (GHCR)
  - `security.yml`: CodeQL + dependency review
  - `deploy.yml`: Trigger deployment scripts (staging/production)

Chi tiết hơn xem `.github/workflows/README.md`.

### Typical Deployment Flow

1. Developer push code lên `main` hoặc tạo tag `v*`
2. GitHub Actions:
   - Chạy CI (lint, type-check, test, build)
   - Build & push images lên GHCR (`docker.yml`)
   - Chạy security checks (`security.yml`)
3. Trên server production:
   - Pull images mới (nếu dùng GHCR) **hoặc** rebuild trực tiếp bằng `docker-compose.prod.yml`
   - Chạy `docker-compose -f docker-compose.prod.yml up -d --build`
   - Chạy migrations: `docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy`

> Lưu ý: hiện tại file `deploy.yml` chỉ trigger shell scripts, bạn có thể nối nó với SSH deploy, Kubernetes, hay các công cụ khác tùy hạ tầng thực tế.

### 4. Verify Deployment

```bash
# Health check
curl http://localhost:3001/api/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Docker Compose Configuration

### Production Compose File

```yaml
version: "3.8"

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: iso-docs-web
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: iso-docs-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:password@postgres:5432/documents_db
      - JWT_SECRET=${JWT_SECRET}
      - SMB_MOUNT_PATH=/shared # Path in container
    ports:
      - "3001:3001"
    volumes:
      - /mnt/smb:/shared # Mount from host (mounted by systemd service)
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    container_name: iso-docs-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: documents_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d documents_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Reverse Proxy (Nginx)

### Nginx Configuration

```nginx
upstream api {
    server localhost:3001;
}

upstream web {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL/TLS Setup

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Update Nginx for HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of config
}
```

## Backup & Recovery

### Database Backup

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U admin documents_db > backup_$(date +%Y%m%d).sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U admin documents_db < backup_20241218.sql
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * docker-compose -f /path/to/docker-compose.prod.yml exec postgres \
  pg_dump -U admin documents_db > /backups/documents_$(date +\%Y\%m\%d).sql
```

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3001/api/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U admin -d documents_db
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f api

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api
```

## Troubleshooting

### Common Issues

**1. SMB Mount Failed**

```bash
# Check if SMB share is mounted on host
ls /mnt/smb
mount | grep smb

# Check systemd service status
sudo systemctl status smb-mount.service

# View service logs
sudo journalctl -u smb-mount.service -f

# Test mount manually
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials

# Check credentials file
sudo cat /etc/smb-credentials

# Test network connectivity
ping 10.0.60.30
telnet 10.0.60.30 445

# Test SMB access from container
docker-compose -f docker-compose.prod.yml exec api ls /shared
```

**2. Database Connection Error**

```bash
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# Check connection string
docker-compose -f docker-compose.prod.yml exec api env | grep DATABASE_URL
```

**3. SMB Mount Not Available in Container**

```bash
# Verify host mount
ls /mnt/smb

# Check Docker volume mount
docker-compose -f docker-compose.prod.yml exec api ls /shared

# Check container user permissions
docker-compose -f docker-compose.prod.yml exec api id

# Verify mount options (uid/gid should match container user)
mount | grep smb
```

**4. Permission Denied**

```bash
# Check file permissions on mounted share
ls -la /mnt/smb

# Check mount options (uid/gid)
mount | grep smb

# Verify container user
docker-compose -f docker-compose.prod.yml exec api id

# Fix: Update mount options in mount-smb.sh
# uid=1000,gid=1000 should match container user
```

docker-compose -f docker-compose.prod.yml exec api ls -la /shared

# Fix permissions (if needed)

chmod -R 755 /mnt/shared

````

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      replicas: 3
    # ... rest of config
````

### Load Balancer

Use Nginx or Traefik as load balancer for multiple API instances.

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Restrict SMB share access
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Audit logging enabled

## Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Support

For issues or questions:

- Check logs: `docker-compose logs -f`
- Review documentation: `/docs`
- Contact: [Your support email]
