# Deployment Automation Guide

**Last Updated:** 2025-01-06  
**Version:** 2.0.0

---

## Overview

Scripts tự động hóa deployment để giảm downtime và đơn giản hóa quy trình deploy.

## Scripts Available

### 1. `scripts/deploy-simple.sh` - Script Đơn Giản (Khuyến nghị bắt đầu)

Script đơn giản nhất, phù hợp cho deploy nhanh.

**Usage:**
```bash
./scripts/deploy-simple.sh
```

**Chức năng:**
- Pull code từ Git
- Backup database tự động
- Build và deploy containers
- Chạy migrations
- Cleanup images cũ

**Thời gian:** ~3-5 phút (có downtime ngắn)

---

### 2. `scripts/deploy.sh` - Script Đầy Đủ (Zero-Downtime)

Script đầy đủ với zero-downtime deployment và nhiều tính năng.

**Usage:**
```bash
# Deploy đầy đủ
./scripts/deploy.sh

# Skip backup (nếu đã backup thủ công)
./scripts/deploy.sh --skip-backup

# Skip migration (nếu không có migration mới)
./scripts/deploy.sh --skip-migration

# Skip cả hai
./scripts/deploy.sh --skip-backup --skip-migration
```

**Chức năng:**
- ✅ Health checks tự động
- ✅ Zero-downtime deployment
- ✅ Database backup tự động
- ✅ Rollback support
- ✅ Logging chi tiết
- ✅ Cleanup tự động

**Thời gian:** ~5-8 phút (zero-downtime)

---

### 3. `scripts/deploy-remote.sh` - Remote Deployment

Deploy từ máy local lên server qua SSH.

**Usage:**
```bash
# Deploy lên server
./scripts/deploy-remote.sh user@192.168.1.100

# Với SSH key
SSH_KEY=~/.ssh/id_rsa ./scripts/deploy-remote.sh user@192.168.1.100

# Skip backup
./scripts/deploy-remote.sh user@192.168.1.100 --skip-backup
```

**Chức năng:**
- Push code lên GitHub (nếu cần)
- SSH vào server và chạy deploy
- Tự động hóa toàn bộ quy trình

---

## Quick Start

### Trên Server (Linux)

```bash
# 1. Clone repository (lần đầu)
git clone https://github.com/your-org/documentsManager.git
cd documentsManager

# 2. Setup environment
cp .env.example .env.production
# Edit .env.production với thông tin của bạn

# 3. Deploy lần đầu
chmod +x scripts/deploy-simple.sh
./scripts/deploy-simple.sh

# 4. Deploy các lần sau (chỉ cần chạy script)
./scripts/deploy-simple.sh
```

### Từ Local Machine (Windows/Mac/Linux)

```bash
# 1. Push code lên GitHub
git add .
git commit -m "Deploy: Update features"
git push origin main

# 2. Deploy lên server qua SSH
chmod +x scripts/deploy-remote.sh
./scripts/deploy-remote.sh user@your-server.com
```

---

## Quy Trình Deploy Chi Tiết

### Trước Khi Deploy

1. **Commit và Push Code:**
   ```bash
   git add .
   git commit -m "Deploy: Description of changes"
   git push origin main
   ```

2. **Kiểm tra Code:**
   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

### Trên Server

#### Option 1: Deploy Đơn Giản (Có Downtime Ngắn)

```bash
cd ~/documentsManager
./scripts/deploy-simple.sh
```

**Quy trình:**
1. Pull code mới từ Git
2. Backup database
3. Stop containers cũ
4. Build images mới
5. Start containers mới
6. Run migrations
7. Cleanup

**Downtime:** ~30-60 giây (trong lúc rebuild)

#### Option 2: Deploy Zero-Downtime

```bash
cd ~/documentsManager
./scripts/deploy.sh
```

**Quy trình:**
1. Pull code mới
2. Backup database
3. Build images mới
4. Start containers mới (song song với cũ)
5. Health check containers mới
6. Switch traffic (nếu có load balancer)
7. Stop containers cũ
8. Run migrations
9. Cleanup

**Downtime:** 0 giây (zero-downtime)

---

## Cấu Hình

### Environment Variables

Đảm bảo file `.env.production` có các biến sau:

```env
# Database
DATABASE_URL=postgresql://admin:password@postgres:5432/documents_db

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# App
API_PORT=3001
WEB_PORT=3000
NODE_ENV=production

# SMB
SMB_MOUNT_PATH=/shared
SMB_BASE_PATH=your-path
SMB_MOUNT_PATH_HOST=/mnt/smb
```

### SSH Configuration (Cho Remote Deploy)

Tạo SSH key pair (nếu chưa có):

```bash
ssh-keygen -t rsa -b 4096 -C "deploy@your-server"
```

Copy public key lên server:

```bash
ssh-copy-id user@your-server.com
```

Test connection:

```bash
ssh user@your-server.com "echo 'SSH connection OK'"
```

---

## Troubleshooting

### Lỗi: Permission Denied

```bash
# Fix: Make scripts executable
chmod +x scripts/*.sh
```

### Lỗi: Docker Compose Not Found

```bash
# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Lỗi: Database Connection Failed

```bash
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### Lỗi: Build Failed

```bash
# Check Docker logs
docker-compose -f docker-compose.prod.yml build --no-cache 2>&1 | tee build.log

# Check disk space
df -h

# Clean Docker cache
docker system prune -a
```

### Rollback Manual

Nếu deploy thất bại, rollback thủ công:

```bash
# 1. Restore database backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U admin documents_db < backups/db_backup_YYYYMMDD_HHMMSS.sql

# 2. Checkout code cũ
git checkout <previous-commit-hash>
git pull origin main

# 3. Rebuild và restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## Best Practices

### 1. Luôn Backup Trước Khi Deploy

```bash
# Backup thủ công (nếu cần)
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U admin documents_db > backup_manual_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Test Trên Staging Trước

```bash
# Deploy lên staging environment trước
./scripts/deploy-remote.sh staging@staging-server.com
```

### 3. Monitor Sau Khi Deploy

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
```

### 4. Deploy Vào Giờ Thấp Điểm

Tránh deploy vào giờ cao điểm để giảm rủi ro.

### 5. Thông Báo Team

Thông báo team trước khi deploy production.

---

## Automation với GitHub Actions (Tùy Chọn)

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/documentsManager
            git pull origin main
            ./scripts/deploy.sh
```

---

## So Sánh Scripts

| Feature | deploy-simple.sh | deploy.sh | deploy-remote.sh |
|---------|------------------|-----------|------------------|
| Độ đơn giản | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Zero-downtime | ❌ | ✅ | ✅ |
| Health checks | ❌ | ✅ | ✅ |
| Backup tự động | ✅ | ✅ | ✅ |
| Logging | Cơ bản | Chi tiết | Chi tiết |
| Rollback | Manual | Auto | Auto |
| Thời gian | 3-5 phút | 5-8 phút | 5-8 phút |
| Downtime | 30-60s | 0s | 0s |

---

## Next Steps

1. **CI/CD Integration:** Setup GitHub Actions để tự động deploy khi push code
2. **Monitoring:** Thêm monitoring và alerting
3. **Blue-Green Deployment:** Cải thiện zero-downtime với blue-green
4. **Canary Deployment:** Deploy từng phần để test

---

## Support

Nếu gặp vấn đề:
1. Check logs: `./deploy.log`
2. Check Docker logs: `docker-compose logs -f`
3. Review documentation: `docs/deployment-guide.md`

