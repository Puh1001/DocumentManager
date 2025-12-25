# Debug Report: Sync Đồng Bộ Sai Path - Sync Toàn Bộ Server Thay Vì Chỉ devTest Folder

**Date:** 2025-12-25  
**Status:** 🔍 Root Cause Analysis  
**Priority:** CRITICAL

---

## Tóm Tắt Vấn Đề

**Vấn đề được báo cáo:**

WebSocket sync service đang đồng bộ toàn bộ `\\10.0.60.30\Public` thay vì chỉ đồng bộ thư mục cụ thể theo environment `\\10.0.60.30\Public\IT-Information Technology Dept\devTest`.

**Hậu quả:**

- Database chứa quá nhiều dữ liệu (2+ triệu documents, 82k+ folders)
- Query timeout khi load dữ liệu
- Socket hang up errors do quá tải
- Cả dev và prod dùng cùng 1 server nên đang sync toàn bộ dữ liệu

**Dữ liệu hiện tại (từ dashboard):**

- Total Documents: **2,018,846**
- Folders: **82,249**
- Users: 1
- Recent Uploads: **2,018,846**

---

## Phân Tích Nguyên Nhân (5 Whys)

### Why 1: Tại sao sync service đồng bộ toàn bộ server thay vì chỉ devTest folder?

**Trả lời:** `SMB_BASE_PATH` không được set đúng trong production environment, hoặc mount point trên Linux đã mount toàn bộ share root thay vì chỉ mount subfolder.

**Bằng chứng từ code:**

**File:** `apps/api/src/modules/storage/services/smb.service.ts:74-81`

```74:81:apps/api/src/modules/storage/services/smb.service.ts
    } else {
      // Production: Linux mounted path (from Docker volume)
      this.basePath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared"
      );
      this.logger.log(`Using mounted path: ${this.basePath}`);
    }
```

**Vấn đề:**

- Trong production (Linux), code chỉ sử dụng `SMB_MOUNT_PATH` (default: `/shared`)
- **KHÔNG SỬ DỤNG** `SMB_BASE_PATH` trong production mode
- Nếu mount point `/shared` đã mount toàn bộ `\\10.0.60.30\Public` → sync toàn bộ share

### Why 2: Tại sao production không sử dụng SMB_BASE_PATH?

**Trả lời:** Logic code giả định rằng trong production, mount point đã được mount đúng subfolder. Nhưng thực tế, mount point có thể mount toàn bộ share root.

**Bằng chứng:**

**Development (Windows):**

```60:72:apps/api/src/modules/storage/services/smb.service.ts
      } else {
        // Direct UNC path
        const server = this.configService.get<string>(
          "SMB_SERVER",
          "10.0.60.30"
        );
        const share = this.configService.get<string>("SMB_SHARE", "Public");
        const basePath = this.configService.get<string>(
          "SMB_BASE_PATH",
          "IT-Information Technology Dept\\devTest"
        );
        // UNC path: \\10.0.60.30\Public\IT-Information Technology Dept\devTest
        this.basePath = `\\\\${server}\\${share}\\${basePath}`;
        this.logger.log(`Using UNC path: ${this.basePath}`);
      }
```

✅ **ĐÚNG:** Development sử dụng `SMB_BASE_PATH` để tạo full path

**Production (Linux):**

```74:81:apps/api/src/modules/storage/services/smb.service.ts
    } else {
      // Production: Linux mounted path (from Docker volume)
      this.basePath = this.configService.get<string>(
        "SMB_MOUNT_PATH",
        "/shared"
      );
      this.logger.log(`Using mounted path: ${this.basePath}`);
    }
```

❌ **SAI:** Production chỉ dùng `SMB_MOUNT_PATH`, không append `SMB_BASE_PATH`

### Why 3: Tại sao mount point có thể mount toàn bộ share?

**Trả lời:** Trong deployment guide, mount script mount toàn bộ share `//10.0.60.30/Public` vào `/mnt/smb`, sau đó container mount `/mnt/smb` vào `/shared`. Không có logic để mount chỉ subfolder.

**Bằng chứng từ deployment guide:**

```bash
# Mount script mounts entire share
SMB_SHARE="//10.0.60.30/Public"  # ← Mounts entire Public share
MOUNT_POINT="/mnt/smb"
```

**Docker compose:**

```yaml
volumes:
  - ${SMB_MOUNT_PATH_HOST}:/shared # Mounts /mnt/smb → /shared
```

Nếu `/mnt/smb` chứa toàn bộ `Public` share → `/shared` trong container cũng chứa toàn bộ share.

### Why 4: Tại sao sync service không kiểm tra basePath trong production?

**Trả lời:** Code giả định mount point đã được mount đúng subfolder, nhưng không có validation hoặc logic để append `SMB_BASE_PATH` trong production.

**Vấn đề:**

- Development: UNC path → có thể append `SMB_BASE_PATH` dễ dàng
- Production: Mounted path → cần append `SMB_BASE_PATH` vào mounted path

### Why 5: Nguyên nhân gốc rễ là gì?

**Nguyên nhân gốc rễ:** Production code không append `SMB_BASE_PATH` vào `SMB_MOUNT_PATH`, dẫn đến sync từ root của mounted share thay vì từ subfolder cụ thể.

**Các yếu tố đóng góp:**

1. Logic code khác nhau giữa Windows (development) và Linux (production)
2. Mount point trên host mount toàn bộ share thay vì chỉ subfolder
3. Không có validation để đảm bảo sync đúng path
4. Cả dev và prod dùng cùng 1 server nên đang sync toàn bộ dữ liệu

---

## Bằng Chứng

### 1. Code Analysis

**File:** `apps/api/src/modules/storage/services/smb.service.ts`

**Development (Windows) - ĐÚNG:**

```typescript
// UNC path: \\10.0.60.30\Public\IT-Information Technology Dept\devTest
this.basePath = `\\\\${server}\\${share}\\${basePath}`;
```

✅ Sử dụng `SMB_BASE_PATH` để tạo full path

**Production (Linux) - SAI:**

```typescript
// Production: Linux mounted path (from Docker volume)
this.basePath = this.configService.get<string>("SMB_MOUNT_PATH", "/shared");
```

❌ Chỉ dùng `SMB_MOUNT_PATH`, không append `SMB_BASE_PATH`

**Kết quả:**

- Development sync từ: `\\10.0.60.30\Public\IT-Information Technology Dept\devTest` ✅
- Production sync từ: `/shared` (toàn bộ Public share) ❌

### 2. Sync Flow Analysis

**File:** `apps/api/src/modules/storage/services/folder-sync.service.ts:22-38`

```22:38:apps/api/src/modules/storage/services/folder-sync.service.ts
  async syncWithFileSystem() {
    try {
      // Track seen paths during sync
      const seenPaths = new Set<string>();

      // Pass 1: Recursively scan SMB folder and sync with database
      this.logger.log(
        "Starting file system sync (Pass 1: Sync file system)..."
      );
      await this.folderSyncHandler.syncFolder(
        "",
        null,
        seenPaths,
        async (file, folderId) => {
          await this.documentSyncHandler.syncDocument(file, folderId);
        }
      );
```

**Vấn đề:**

- `syncFolder("", ...)` gọi với empty path
- `smbService.listDirectory("")` sẽ list từ `basePath`
- Nếu `basePath = "/shared"` (toàn bộ share) → sync toàn bộ share ❌
- Nếu `basePath = "/shared/IT-Information Technology Dept/devTest"` → sync đúng folder ✅

### 3. Mount Configuration Analysis

**Deployment Guide mount script:**

```bash
SMB_SHARE="//10.0.60.30/Public"  # Mounts entire share
MOUNT_POINT="/mnt/smb"
```

**Docker Compose:**

```yaml
volumes:
  - ${SMB_MOUNT_PATH_HOST}:/shared
environment:
  - SMB_MOUNT_PATH=/shared
```

**Vấn đề:**

- Mount point mount toàn bộ `Public` share
- Container mount `/mnt/smb` → `/shared`
- Code sync từ `/shared` → sync toàn bộ share

---

## Giải Pháp

### Fix 1: Append SMB_BASE_PATH vào SMB_MOUNT_PATH trong Production (CRITICAL)

**File:** `apps/api/src/modules/storage/services/smb.service.ts`

**Thay đổi:**

```typescript
} else {
  // Production: Linux mounted path (from Docker volume)
  const mountPath = this.configService.get<string>(
    "SMB_MOUNT_PATH",
    "/shared"
  );
  const basePath = this.configService.get<string>(
    "SMB_BASE_PATH",
    ""
  );

  // Append basePath to mountPath if provided
  // Example: /shared + IT-Information Technology Dept/devTest
  if (basePath) {
    // Normalize path separators for Linux
    const normalizedBasePath = basePath.replace(/\\/g, "/");
    this.basePath = path.join(mountPath, normalizedBasePath);
  } else {
    this.basePath = mountPath;
  }

  this.logger.log(`Using mounted path: ${this.basePath}`);
}
```

**Kết quả:**

- Production sẽ sync từ: `/shared/IT-Information Technology Dept/devTest` ✅
- Thay vì sync từ: `/shared` (toàn bộ share) ❌

### Fix 2: Thêm Validation và Logging

**File:** `apps/api/src/modules/storage/services/smb.service.ts`

Thêm validation để đảm bảo basePath được set đúng:

```typescript
async onModuleInit() {
  // ... existing code ...

  // Validate basePath exists
  try {
    const stats = await fs.promises.stat(this.basePath);
    if (!stats.isDirectory()) {
      this.logger.error(`SMB basePath is not a directory: ${this.basePath}`);
    } else {
      this.logger.log(`SMB basePath validated: ${this.basePath}`);
    }
  } catch (error) {
    this.logger.error(`SMB basePath not accessible: ${this.basePath}`, error);
  }
}
```

### Fix 3: Cập Nhật Deployment Guide

**File:** `docs/deployment-guide.md`

Cập nhật để đảm bảo `SMB_BASE_PATH` được set trong production:

```env
# Production environment variables
SMB_MOUNT_PATH=/shared
SMB_BASE_PATH=IT-Information Technology Dept/devTest  # ← THÊM DÒNG NÀY
```

### Fix 4: Cập Nhật Docker Compose

**File:** `docker-compose.prod.yml`

Đảm bảo `SMB_BASE_PATH` được pass vào container:

```yaml
environment:
  - SMB_MOUNT_PATH=/shared
  - SMB_BASE_PATH=${SMB_BASE_PATH} # ← THÊM DÒNG NÀY
```

### Fix 5: Clean Up Database (Sau khi fix)

Sau khi fix code, cần clean up database để xóa dữ liệu không cần thiết:

**Lưu ý:** Không cần tạo cleanup script. Có thể xóa và tạo lại database, sau đó seed lại.

**Các bước:**

1. **Backup database hiện tại (nếu cần):**

   ```bash
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Xóa và tạo lại database:**

   ```bash
   # Drop và recreate database
   npm run db:push -- --force-reset
   # Hoặc
   npx prisma migrate reset
   ```

3. **Seed lại dữ liệu:**

   ```bash
   cd apps/api && npx ts-node prisma/seed.ts && cd ../..
   ```

4. **Restart API server với `SMB_BASE_PATH` set đúng:**
   - Đảm bảo `SMB_BASE_PATH=IT-Information Technology Dept/devTest` trong environment
   - Sync sẽ tự động chạy và chỉ sync đúng folder

---

## Kế Hoạch Thực Hiện

### Phase 1: Immediate Fix (CRITICAL)

1. ✅ Sửa code để append `SMB_BASE_PATH` vào `SMB_MOUNT_PATH` trong production
   - ✅ `apps/api/src/modules/storage/services/smb.service.ts` - Fixed
   - ✅ `apps/api/src/modules/storage/services/folder-watcher.service.ts` - Fixed
2. ✅ Thêm validation và logging
   - ✅ Thêm validation trong `testConnection()` method
   - ✅ Thêm warning khi `SMB_BASE_PATH` không được set
3. ✅ Cập nhật deployment guide
   - ✅ Thêm `SMB_BASE_PATH` vào environment variables section
   - ✅ Cập nhật docker-compose examples
4. ✅ Cập nhật docker-compose
   - ✅ `docker-compose.prod.yml` đã có `SMB_BASE_PATH` trong environment

### Phase 2: Testing

1. Test sync với `SMB_BASE_PATH` set đúng
2. Verify chỉ sync đúng folder
3. Check logs để đảm bảo path đúng

### Phase 3: Clean Up (Sau khi fix)

1. ✅ Backup database (nếu cần)
2. ✅ Xóa và tạo lại database với `npm run db:push -- --force-reset` hoặc `npx prisma migrate reset`
3. ✅ Seed lại dữ liệu với `npx ts-node prisma/seed.ts`
4. ✅ Restart API server với `SMB_BASE_PATH` set đúng
5. ✅ Verify sync chỉ sync đúng folder `devTest`

---

## Kết Luận

**Nguyên nhân chính:** Production code không append `SMB_BASE_PATH` vào `SMB_MOUNT_PATH`, dẫn đến sync từ root của mounted share thay vì từ subfolder cụ thể.

**Giải pháp ưu tiên:** Sửa code để append `SMB_BASE_PATH` vào `SMB_MOUNT_PATH` trong production mode, tương tự như development mode.

**Impact:** Sau khi fix, sync service sẽ chỉ sync đúng folder `devTest` thay vì toàn bộ share, giảm đáng kể lượng dữ liệu và cải thiện performance.
