# Zero-Downtime Deployment - Hướng Dẫn Chi Tiết

**Date:** 2025-01-06

---

## Vấn Đề Hiện Tại

**Quy trình cũ có downtime:**

```bash
git pull origin main
docker-compose down      # ❌ Downtime bắt đầu (containers dừng)
docker-compose build     # Build trong lúc downtime
docker-compose up -d     # Downtime kết thúc (containers start lại)
```

**Downtime:** 3-5 phút (trong lúc build và restart)

---

## Giải Pháp: Zero-Downtime

### Quy Trình Zero-Downtime

```bash
# 1. Pull code mới (containers cũ vẫn chạy)
git pull origin main

# 2. Build images mới (song song với containers cũ)
docker-compose build --no-cache

# 3. Stop containers cũ gracefully (timeout 10s)
docker-compose stop --timeout 10 api web

# 4. Start containers mới ngay lập tức
docker-compose up -d --no-deps api web

# 5. Health checks
curl http://localhost:3001/api/health

# 6. Cleanup containers cũ
docker-compose rm -f api web
```

**Downtime:** ~1-2 giây (chỉ trong lúc switch containers)

---

## Cách Sử Dụng

### Option 1: Dùng Script (Khuyến nghị) ⭐

**Trên Server:**

```bash
cd ~/documentsManager
./scripts/deploy.sh
```

**Từ Local:**

```bash
./scripts/deploy-remote.sh user@your-server.com
```

Script sẽ tự động:

- ✅ Pull code
- ✅ Backup database
- ✅ Build images mới (song song với containers cũ)
- ✅ Stop containers cũ gracefully
- ✅ Start containers mới
- ✅ Health checks
- ✅ Run migrations

---

### Option 2: Manual Zero-Downtime

**Bước 1: Pull Code (Containers cũ vẫn chạy)**

```bash
git pull origin main
```

**Bước 2: Build Images Mới (Song song với containers cũ)**

```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

⏱️ Thời gian: 3-5 phút (containers cũ vẫn phục vụ users)

**Bước 3: Stop Containers Cũ Gracefully**

```bash
docker-compose -f docker-compose.prod.yml stop --timeout 10 api web
```

- Containers cũ vẫn nhận requests trong 10 giây
- Sau đó graceful shutdown
- Downtime: ~1 giây

**Bước 4: Start Containers Mới**

```bash
docker-compose -f docker-compose.prod.yml up -d --no-deps api web
```

- Containers mới start với images mới
- Downtime: ~1 giây

**Bước 5: Health Checks**

```bash
# Check API
curl http://localhost:3001/api/health

# Check Web
curl http://localhost:3000/
```

**Bước 6: Cleanup**

```bash
docker-compose -f docker-compose.prod.yml rm -f api web
```

**Tổng Downtime:** ~1-2 giây

---

## So Sánh

| Method                     | Downtime | Thời Gian Build | User Impact                  |
| -------------------------- | -------- | --------------- | ---------------------------- |
| **Cũ (down → build → up)** | 3-5 phút | 3-5 phút        | ❌ Users không thể truy cập  |
| **Zero-Downtime**          | 1-2 giây | 3-5 phút        | ✅ Users không cảm nhận được |

---

## Chi Tiết Kỹ Thuật

### Tại Sao Zero-Downtime Hoạt Động?

1. **Build Song Song:**
   - Build images mới trong khi containers cũ vẫn chạy
   - Users vẫn truy cập được service cũ
   - Không có downtime trong lúc build

2. **Graceful Shutdown:**
   - `docker-compose stop --timeout 10` cho containers cũ 10 giây để:
     - Hoàn thành requests đang xử lý
     - Đóng connections gracefully
     - Cleanup resources

3. **Quick Switch:**
   - Stop containers cũ (~1 giây)
   - Start containers mới (~1 giây)
   - Tổng downtime: ~1-2 giây

---

## Script Zero-Downtime

### File: `scripts/deploy.sh`

```bash
# Deploy với zero-downtime
deploy_zero_downtime() {
  # 1. Stop containers cũ gracefully
  docker-compose stop --timeout 10 api web

  # 2. Start containers mới với images mới
  docker-compose up -d --no-deps --build api web

  # 3. Health checks
  health_check "API" "http://localhost:3001/api/health"
  health_check "Web" "http://localhost:3000/"

  # 4. Cleanup
  docker-compose rm -f api web
}
```

---

## Lưu Ý Quan Trọng

### 1. Database Migrations

Migrations cần chạy SAU KHI containers mới đã start:

```bash
# Chạy migrations sau khi containers mới healthy
docker-compose exec api npx prisma migrate deploy
```

**Lý do:** Migrations có thể làm thay đổi schema, cần đảm bảo containers mới đã sẵn sàng.

---

### 2. Health Checks

Luôn health check trước khi tiếp tục:

```bash
# Wait for API to be healthy
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
  if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo "API is healthy"
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done
```

---

### 3. Rollback Plan

Nếu health check fail, rollback ngay:

```bash
# Rollback: Start containers cũ lại
docker-compose up -d api web

# Hoặc dùng images cũ
docker-compose up -d --no-deps api web
```

---

## True Zero-Downtime (0 giây)

Để thực sự **0 giây downtime**, cần:

### Blue-Green Deployment

1. **Setup 2 environments:**
   - Blue: Version cũ (đang chạy)
   - Green: Version mới (deploy song song)

2. **Deploy Process:**

   ```bash
   # Start Green với port khác
   docker-compose -f docker-compose.green.yml up -d

   # Health check Green
   curl http://localhost:3002/api/health

   # Switch traffic (update nginx/load balancer)
   # Stop Blue
   docker-compose -f docker-compose.blue.yml down
   ```

3. **Lợi ích:**
   - ✅ Thực sự 0 giây downtime
   - ✅ Có thể rollback ngay lập tức
   - ✅ Test version mới trước khi switch

4. **Nhược điểm:**
   - ❌ Phức tạp hơn
   - ❌ Cần load balancer/nginx
   - ❌ Cần 2 ports cho mỗi service

---

## Best Practices

### 1. Luôn Backup Trước

```bash
# Backup database trước khi deploy
docker-compose exec postgres pg_dump -U admin documents_db > backup.sql
```

---

### 2. Test Trên Staging Trước

```bash
# Deploy staging trước
./scripts/deploy-remote.sh staging@staging-server.com

# Test kỹ, rồi mới deploy production
./scripts/deploy-remote.sh prod@prod-server.com
```

---

### 3. Monitor Sau Khi Deploy

```bash
# Check logs
docker-compose logs -f api web

# Check health
curl http://localhost:3001/api/health
curl http://localhost:3000/
```

---

### 4. Deploy Vào Giờ Thấp Điểm

Tránh deploy vào giờ cao điểm để giảm rủi ro.

---

## Kết Luận

**Để không có downtime:**

1. **Dùng script (dễ nhất):**

   ```bash
   ./scripts/deploy.sh
   ```

2. **Hoặc manual:**
   ```bash
   git pull
   docker-compose build
   docker-compose stop --timeout 10 api web
   docker-compose up -d --no-deps api web
   ```

**Kết quả:**

- ✅ Downtime: 1-2 giây (gần như zero)
- ✅ Users không cảm nhận được
- ✅ An toàn và nhanh chóng
