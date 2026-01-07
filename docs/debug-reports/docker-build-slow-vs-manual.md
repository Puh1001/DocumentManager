# Debug Report: Docker Build Slow via Script vs Fast Manual Build

**Date:** 2026-01-07  
**Issue:** Build qua script mất 8+ phút, build thủ công chỉ 2.7s  
**Status:** Root cause identified, fix ready

---

## Problem Summary

**Build qua script:**
- `apt-get install`: 483.1s (~8 phút)
- Download packages: 7min 48s với tốc độ 19.2 kB/s
- `npm ci`: 280.9s (~4.7 phút)
- **Tổng:** >12 phút

**Build thủ công trên server:**
- Tất cả steps: **CACHED**
- API build: **2.7s**
- Web build: **1.9s**
- **Tổng:** <5 giây

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Tại sao build script chậm?**
   - Script dùng `--no-cache` flag → bỏ qua Docker layer cache

2. **Tại sao dùng `--no-cache`?**
   - Script được thiết kế để đảm bảo build "sạch" mỗi lần
   - Tránh cache cũ gây lỗi

3. **Tại sao build thủ công nhanh?**
   - Dùng Docker cache → không rebuild layers đã có
   - Chỉ rebuild layers thay đổi

4. **Tại sao network chậm khi download packages?**
   - `--no-cache` → phải download lại tất cả packages
   - Tốc độ download: 19.2 kB/s (rất chậm)
   - Không dùng cache local

5. **Tại sao không dùng cache có điều kiện?**
   - Script không có logic để detect khi nào cần `--no-cache`
   - Luôn force rebuild

---

## Evidence

### Script Code

**`scripts/deploy.sh` line 144:**
```bash
docker-compose -f "$COMPOSE_FILE" build --no-cache || {
  error "Failed to build Docker images"
}
```

**Build thủ công:**
```bash
docker-compose -f docker-compose.prod.yml build
# Không có --no-cache → dùng cache
```

### Performance Comparison

| Method | apt-get | npm ci | Total | Cache Used |
|--------|---------|--------|-------|------------|
| **Script (--no-cache)** | 483s | 281s | >12 phút | ❌ No |
| **Manual (cache)** | CACHED | CACHED | 2.7s | ✅ Yes |

### Network Speed

**Script build:**
```
Fetched 8974 kB in 7min 48s (19.2 kB/s)
```

**Manual build:**
```
CACHED - No download needed
```

---

## Root Cause

**Vấn đề:** Script luôn dùng `--no-cache`, bỏ qua Docker layer cache, phải rebuild và download lại tất cả dependencies mỗi lần deploy.

**Tại sao build thủ công nhanh:**
- Docker cache các layers đã build
- Chỉ rebuild layers thay đổi
- Packages đã download được cache

---

## Fix Plan

### Solution 1: Remove --no-cache (Recommended for Speed)

**Thay đổi trong `scripts/deploy.sh`:**

```bash
# Build images
build_images() {
  log "Building Docker images..."
  
  docker-compose -f "$COMPOSE_FILE" build || {
    error "Failed to build Docker images"
  }
  
  success "Docker images built successfully"
}
```

**Lý do:**
- ✅ Nhanh hơn nhiều (2-5s vs 12+ phút)
- ✅ Dùng cache khi có thể
- ✅ Chỉ rebuild layers thay đổi
- ⚠️ Có thể có cache issues nếu dependencies thay đổi

### Solution 2: Add --no-cache Option (Recommended for Flexibility)

**Thêm option để user chọn:**

```bash
# Parse arguments
SKIP_BACKUP=false
SKIP_MIGRATION=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Build images
build_images() {
  log "Building Docker images..."
  
  local build_cmd="docker-compose -f $COMPOSE_FILE build"
  if [ "$NO_CACHE" = true ]; then
    build_cmd="$build_cmd --no-cache"
    log "Using --no-cache flag (slower but ensures clean build)"
  else
    log "Using Docker cache (faster, rebuilds only changed layers)"
  fi
  
  $build_cmd || {
    error "Failed to build Docker images"
  }
  
  success "Docker images built successfully"
}
```

**Lý do:**
- ✅ Mặc định nhanh (dùng cache)
- ✅ Có option để force clean build khi cần
- ✅ Linh hoạt hơn

### Solution 3: Smart Cache Detection

**Chỉ dùng --no-cache khi package files thay đổi:**

```bash
build_images() {
  log "Building Docker images..."
  
  # Check if package files changed
  local use_cache=true
  if [ -f ".docker-build-hash" ]; then
    local current_hash=$(md5sum package.json apps/*/package.json 2>/dev/null | md5sum | cut -d' ' -f1)
    local cached_hash=$(cat .docker-build-hash 2>/dev/null)
    if [ "$current_hash" != "$cached_hash" ]; then
      use_cache=false
      log "Package files changed, will rebuild dependencies"
    fi
  fi
  
  local build_cmd="docker-compose -f $COMPOSE_FILE build"
  if [ "$use_cache" = false ]; then
    build_cmd="$build_cmd --no-cache"
  fi
  
  $build_cmd || {
    error "Failed to build Docker images"
  }
  
  # Save hash for next time
  md5sum package.json apps/*/package.json 2>/dev/null | md5sum | cut -d' ' -f1 > .docker-build-hash
  
  success "Docker images built successfully"
}
```

**Lý do:**
- ✅ Tự động detect khi cần rebuild
- ✅ Nhanh khi không có thay đổi
- ✅ Clean build khi dependencies thay đổi
- ⚠️ Phức tạp hơn

---

## Recommended Fix

**Chọn Solution 2** vì:
- ✅ Cân bằng giữa tốc độ và flexibility
- ✅ Mặc định nhanh (dùng cache)
- ✅ Có option để force clean build khi cần
- ✅ Dễ implement và maintain

**Thay đổi cần thiết:**
1. Thêm `--no-cache` option vào argument parsing
2. Update `build_images()` để check flag
3. Mặc định dùng cache (bỏ `--no-cache`)

---

## Implementation

### File to Modify

`scripts/deploy.sh`

### Changes

**Line ~22-40 (Argument parsing):**
```bash
# Parse arguments
SKIP_BACKUP=false
SKIP_MIGRATION=false
NO_CACHE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done
```

**Line ~140-149 (build_images function):**
```bash
# Build images
build_images() {
  log "Building Docker images..."
  
  local build_cmd="docker-compose -f $COMPOSE_FILE build"
  if [ "$NO_CACHE" = true ]; then
    build_cmd="$build_cmd --no-cache"
    log "Using --no-cache flag (slower but ensures clean build)"
  else
    log "Using Docker cache (faster, rebuilds only changed layers)"
  fi
  
  $build_cmd || {
    error "Failed to build Docker images"
  }
  
  success "Docker images built successfully"
}
```

---

## Verification

Sau khi fix, verify bằng cách:

1. **Test với cache (mặc định):**
   ```bash
   ./scripts/deploy.sh
   # Should be fast (2-5s) if cache exists
   ```

2. **Test với --no-cache:**
   ```bash
   ./scripts/deploy.sh --no-cache
   # Should rebuild everything (12+ phút)
   ```

3. **Compare với manual build:**
   ```bash
   # Manual
   docker-compose -f docker-compose.prod.yml build
   
   # Script (should be similar speed)
   ./scripts/deploy.sh
   ```

---

## Related Files

- `scripts/deploy.sh` - Main deployment script
- `scripts/deploy-simple.sh` - Simple deployment script (also uses --no-cache)
- `scripts/deploy-zero-downtime.sh` - Zero-downtime script (calls deploy.sh)

---

## Notes

- Docker cache giúp tăng tốc build đáng kể
- `--no-cache` chỉ cần khi:
  - Dependencies thay đổi và cache gây lỗi
  - Cần đảm bảo build hoàn toàn clean
  - Debugging build issues
- Mặc định nên dùng cache để tăng tốc deployment
- Có thể thêm `docker system prune` để clear cache khi cần

