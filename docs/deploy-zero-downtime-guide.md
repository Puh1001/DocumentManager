# Hướng Dẫn Deploy Zero-Downtime Từ Local

**Last Updated:** 2025-01-06

---

## Quick Start

### Deploy Zero-Downtime Từ Local (Windows/Mac/Linux)

```bash
# 1. Push code lên GitHub
git add .
git commit -m "Deploy: Your changes"
git push origin main

# 2. Deploy lên server (zero-downtime)
./scripts/deploy-remote.sh user@your-server.com
```

**Chỉ 2 lệnh!** Script sẽ tự động:

- ✅ Push code lên GitHub
- ✅ SSH vào server
- ✅ Pull code mới
- ✅ Backup database
- ✅ Build images mới
- ✅ Deploy zero-downtime
- ✅ Health checks tự động
- ✅ Run migrations

---

## Chi Tiết

### Bước 1: Setup SSH Key (Lần Đầu)

**Windows (PowerShell):**

```powershell
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "deploy@your-server"

# Copy public key lên server
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh user@your-server.com "cat >> ~/.ssh/authorized_keys"
```

**Linux/Mac:**

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "deploy@your-server"

# Copy public key lên server
ssh-copy-id user@your-server.com
```

**Test connection:**

```bash
ssh user@your-server.com "echo 'SSH OK'"
```

---

### Bước 2: Deploy

**Option 1: Deploy Zero-Downtime (Khuyến nghị)**

```bash
./scripts/deploy-remote.sh user@your-server.com
```

**Option 2: Deploy với Options**

```bash
# Skip backup (nếu đã backup thủ công)
./scripts/deploy-remote.sh user@your-server.com --skip-backup

# Skip migration (nếu không có migration mới)
./scripts/deploy-remote.sh user@your-server.com --skip-migration

# Skip cả hai
./scripts/deploy-remote.sh user@your-server.com --skip-backup --skip-migration
```

**Option 3: Deploy với SSH Key**

```bash
SSH_KEY=~/.ssh/id_rsa ./scripts/deploy-remote.sh user@your-server.com
```

---

## Cách Hoạt Động Zero-Downtime

### Quy Trình

1. **Build Images Mới** (song song với containers cũ đang chạy)

   ```bash
   docker-compose build --no-cache
   ```

2. **Stop Containers Cũ Gracefully** (với timeout 10s)

   ```bash
   docker-compose stop --timeout 10 api web
   ```

   - Containers cũ vẫn nhận requests trong 10 giây
   - Sau đó graceful shutdown

3. **Start Containers Mới** (ngay lập tức)

   ```bash
   docker-compose up -d --no-deps --build api web
   ```

   - Containers mới start với images mới
   - Downtime: ~1-2 giây (trong lúc switch)

4. **Health Checks**

   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3000/
   ```

   - Đảm bảo containers mới healthy trước khi tiếp tục

5. **Cleanup**
   ```bash
   docker-compose rm -f api web
   ```

   - Xóa containers cũ đã stopped

**Tổng Downtime:** ~1-2 giây (chỉ trong lúc switch containers)

---

## So Sánh

| Method                        | Downtime   | Thời Gian | Độ Phức Tạp |
| ----------------------------- | ---------- | --------- | ----------- |
| **Manual (cũ)**               | 3-5 phút   | 5-8 phút  | Cao         |
| **deploy-simple.sh**          | 30-60 giây | 3-5 phút  | Thấp        |
| **deploy.sh (zero-downtime)** | 1-2 giây   | 5-8 phút  | Trung bình  |
| **deploy-remote.sh**          | 1-2 giây   | 5-8 phút  | Thấp        |

---

## Troubleshooting

### Lỗi: Permission Denied

```bash
# Fix: Make script executable
chmod +x scripts/deploy-remote.sh
```

### Lỗi: SSH Connection Failed

```bash
# Test SSH connection
ssh user@your-server.com "echo 'Test'"

# Check SSH key
ssh-add -l

# Add SSH key to agent
ssh-add ~/.ssh/id_rsa
```

### Lỗi: Script Not Found on Server

```bash
# Script sẽ tự động pull code nếu chưa có
# Hoặc pull thủ công:
ssh user@your-server.com "cd ~/documentsManager && git pull origin main"
```

### Lỗi: Health Check Failed

```bash
# Check logs trên server
ssh user@your-server.com "cd ~/documentsManager && docker-compose logs api web"

# Check containers status
ssh user@your-server.com "cd ~/documentsManager && docker-compose ps"
```

---

## Advanced: True Zero-Downtime với Blue-Green

Nếu cần **thực sự zero-downtime** (0 giây), cần setup blue-green deployment:

### Setup Blue-Green với Docker Compose

**1. Tạo `docker-compose.blue.yml` và `docker-compose.green.yml`**

**2. Deploy Process:**

```bash
# Start Green (new version) với port khác
docker-compose -f docker-compose.green.yml up -d

# Health check Green
curl http://localhost:3002/api/health  # Green API
curl http://localhost:3003/            # Green Web

# Switch traffic (update nginx/load balancer)
# Stop Blue
docker-compose -f docker-compose.blue.yml down

# Rename Green → Blue
docker-compose -f docker-compose.green.yml down
docker-compose -f docker-compose.blue.yml up -d
```

**Lợi ích:**

- ✅ Thực sự zero-downtime (0 giây)
- ✅ Có thể rollback ngay lập tức
- ✅ Test version mới trước khi switch

**Nhược điểm:**

- ❌ Phức tạp hơn
- ❌ Cần load balancer/nginx
- ❌ Cần 2 ports cho mỗi service

---

## Best Practices

### 1. Luôn Test Trên Staging Trước

```bash
# Deploy staging trước
./scripts/deploy-remote.sh staging@staging-server.com

# Test kỹ, rồi mới deploy production
./scripts/deploy-remote.sh prod@prod-server.com
```

### 2. Deploy Vào Giờ Thấp Điểm

Tránh deploy vào giờ cao điểm để giảm rủi ro.

### 3. Monitor Sau Khi Deploy

```bash
# Check logs
ssh user@your-server.com "cd ~/documentsManager && docker-compose logs -f"

# Check health
curl http://your-server.com/api/health
```

### 4. Có Rollback Plan

```bash
# Rollback nhanh nếu có lỗi
ssh user@your-server.com "cd ~/documentsManager && git checkout <previous-commit> && ./scripts/deploy-simple.sh"
```

---

## Ví Dụ Thực Tế

### Scenario 1: Deploy Feature Mới

```bash
# 1. Commit và push
git add .
git commit -m "feat: Add new KPI chart feature"
git push origin main

# 2. Deploy zero-downtime
./scripts/deploy-remote.sh deploy@prod-server.com

# 3. Monitor
ssh deploy@prod-server.com "cd ~/documentsManager && docker-compose logs -f api"
```

### Scenario 2: Hotfix

```bash
# 1. Commit hotfix
git add .
git commit -m "fix: Critical bug fix"
git push origin main

# 2. Deploy nhanh (skip backup để tiết kiệm thời gian)
./scripts/deploy-remote.sh deploy@prod-server.com --skip-backup

# 3. Verify
curl https://your-domain.com/api/health
```

---

## Kết Luận

**Deploy zero-downtime từ local giờ chỉ cần:**

```bash
git push origin main
./scripts/deploy-remote.sh user@your-server.com
```

**Kết quả:**

- ✅ Downtime: 1-2 giây (gần như zero)
- ✅ Tự động hóa hoàn toàn
- ✅ An toàn (backup tự động)
- ✅ Nhanh chóng (5-8 phút)
