# Debug Report: Docker Compose ContainerConfig KeyError

**Date:** 2026-01-07  
**Issue:** `KeyError: 'ContainerConfig'` khi deploy zero-downtime  
**Status:** Root cause identified, fix ready

---

## Problem Summary

Khi deploy bằng script zero-downtime, gặp lỗi:
```
ERROR: for iso-docs-api  'ContainerConfig'
KeyError: 'ContainerConfig'
```

Lỗi xảy ra tại:
```python
File "/usr/lib/python3/dist-packages/compose/service.py", line 1579, in get_container_data_volumes
    container.image_config['ContainerConfig'].get('Volumes') or {}
KeyError: 'ContainerConfig'
```

**Quan trọng:** Khi làm thủ công (`down -> build -> up`) thì **KHÔNG có lỗi**.

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Tại sao có lỗi `ContainerConfig`?**
   - Docker Compose cố truy cập `container.image_config['ContainerConfig']` nhưng key này không tồn tại

2. **Tại sao key không tồn tại?**
   - Khi dùng `up -d --no-deps --build`, docker-compose cố **recreate** containers cũ
   - Nó cần merge volume bindings từ container cũ, nhưng image metadata không đầy đủ

3. **Tại sao image metadata không đầy đủ?**
   - Image mới được build có thể có cấu trúc metadata khác với image cũ
   - Hoặc container cũ đã bị corrupted/incomplete

4. **Tại sao `down -> build -> up` không có lỗi?**
   - `down` **xóa hoàn toàn** containers cũ
   - `up` tạo containers **mới từ đầu**, không cần merge metadata từ container cũ

5. **Tại sao zero-downtime script lại cố merge?**
   - Script chỉ `stop` containers (không xóa)
   - Khi `up --build`, docker-compose cố **recreate** containers cũ với images mới
   - Quá trình recreate cần merge volume bindings từ container cũ → lỗi metadata

---

## Evidence

### Logs từ deployment

```
[2026-01-07 04:29:45] Starting zero-downtime deployment...
[2026-01-07 04:29:45] Stopping old containers gracefully...
[2026-01-07 04:30:00] Starting new containers with updated images...
Building api
...
Recreating iso-docs-api ... 

ERROR: for iso-docs-api  'ContainerConfig'
KeyError: 'ContainerConfig'
```

### Code trong `deploy.sh` (dòng 157-161)

```bash
# Step 1: Stop old containers gracefully (with timeout)
log "Stopping old containers gracefully..."
docker-compose -f "$COMPOSE_FILE" stop --timeout 10 api web 2>/dev/null || true

# Step 2: Start new containers with new images
log "Starting new containers with updated images..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps --build api web || {
```

### So sánh với quy trình thủ công

**Quy trình thủ công (KHÔNG có lỗi):**
```bash
docker-compose down      # ✅ Xóa containers hoàn toàn
docker-compose build     # Build images mới
docker-compose up -d     # Tạo containers mới từ đầu
```

**Quy trình zero-downtime (CÓ lỗi):**
```bash
docker-compose stop      # ❌ Chỉ stop, không xóa
docker-compose build     # Build images mới
docker-compose up -d --build  # ❌ Cố recreate containers cũ → lỗi metadata
```

---

## Root Cause

**Vấn đề:** Docker Compose cố **recreate** containers cũ (đã stop nhưng chưa xóa) với images mới. Trong quá trình recreate, nó cần merge volume bindings từ container cũ, nhưng image metadata không có key `ContainerConfig` → lỗi.

**Tại sao `down -> build -> up` không có lỗi:**
- `down` xóa containers → không còn container cũ để merge
- `up` tạo mới từ đầu → không cần merge metadata

---

## Fix Plan

### Solution 1: Xóa containers cũ trước khi start mới (Recommended)

**Thay đổi trong `scripts/deploy.sh`:**

```bash
# Deploy with zero-downtime
deploy_zero_downtime() {
  log "Starting zero-downtime deployment..."
  
  # Step 1: Stop old containers gracefully (with timeout)
  log "Stopping old containers gracefully..."
  docker-compose -f "$COMPOSE_FILE" stop --timeout 10 api web 2>/dev/null || true
  
  # Step 2: Remove old containers (fix ContainerConfig error)
  log "Removing old containers..."
  docker-compose -f "$COMPOSE_FILE" rm -f api web 2>/dev/null || true
  
  # Step 3: Start new containers with new images
  log "Starting new containers with updated images..."
  docker-compose -f "$COMPOSE_FILE" up -d --no-deps api web || {
    error "Failed to start new containers"
  }
  
  # ... rest of the function
}
```

**Lý do:**
- Xóa containers cũ trước → không còn metadata cũ để merge
- `up -d --no-deps` (không có `--build`) → tạo containers mới từ images đã build sẵn
- Vẫn giữ được zero-downtime vì images đã được build trước đó

### Solution 2: Dùng `--force-recreate` thay vì `--build`

```bash
docker-compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate api web
```

**Lý do:**
- `--force-recreate` buộc tạo containers mới, không merge metadata cũ
- Nhưng vẫn cần build images trước

### Solution 3: Build images trước, sau đó xóa và start mới

```bash
# Build images trước (containers cũ vẫn chạy)
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Stop containers cũ
docker-compose -f "$COMPOSE_FILE" stop --timeout 10 api web

# Xóa containers cũ
docker-compose -f "$COMPOSE_FILE" rm -f api web

# Start containers mới (không build lại)
docker-compose -f "$COMPOSE_FILE" up -d --no-deps api web
```

---

## Recommended Fix

**Chọn Solution 1** vì:
- ✅ Đơn giản, ít thay đổi code
- ✅ Vẫn giữ zero-downtime (images build trước)
- ✅ Tránh lỗi metadata merge
- ✅ Tương tự quy trình thủ công (xóa containers trước)

**Thay đổi cần thiết:**
1. Thêm `rm -f` sau `stop` trong `deploy_zero_downtime()`
2. Bỏ `--build` khỏi `up` command (vì images đã build ở bước trước)
3. Di chuyển cleanup step (rm -f) lên trước `up`

---

## Verification

Sau khi fix, verify bằng cách:

1. **Test zero-downtime deployment:**
   ```bash
   ./scripts/deploy.sh
   ```

2. **Kiểm tra containers:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **Kiểm tra logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs api
   docker-compose -f docker-compose.prod.yml logs web
   ```

4. **Health check:**
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3000/
   ```

---

## Related Files

- `scripts/deploy.sh` - Line 152-206 (function `deploy_zero_downtime`)
- `scripts/deploy-zero-downtime.sh` - Remote deployment script
- `docker-compose.prod.yml` - Production compose file

---

## Notes

- Lỗi này xảy ra với docker-compose version 1.29.2 (theo logs)
- Có thể liên quan đến cách docker-compose xử lý image metadata khi recreate
- Solution 1 là cách an toàn nhất, tương tự quy trình thủ công

