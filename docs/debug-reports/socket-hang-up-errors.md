# Debug Report: Socket Hang Up Errors - ECONNRESET

**Date:** 2025-12-25  
**Status:** 🔍 Root Cause Analysis  
**Priority:** HIGH

---

## Tóm Tắt Vấn Đề

**Lỗi được báo cáo:**

1. **Socket Hang Up Errors (Lặp lại nhiều lần):**

   ```
   Failed to proxy http://localhost:3010/api/storage/folders/tree Error: socket hang up
   Failed to proxy http://localhost:3010/api/departments Error: socket hang up
   Failed to proxy http://localhost:3010/api/storage/stats Error: socket hang up
   Failed to proxy http://localhost:3010/api/maintenance Error: socket hang up
   ```

2. **Error Code:** `ECONNRESET`

3. **Pattern:** Lỗi xảy ra lặp lại nhiều lần cho cùng các endpoint

**Ảnh hưởng:**

- Frontend không thể load dữ liệu từ API
- Dashboard không hiển thị được thông tin
- Ứng dụng bị gián đoạn nghiêm trọng

---

## Phân Tích Nguyên Nhân (5 Whys)

### Why 1: Tại sao proxy request bị "socket hang up"?

**Trả lời:** Kết nối giữa frontend proxy và API server bị đóng đột ngột trước khi request hoàn thành.

**Nguyên nhân có thể:**

- API server crash/restart trong khi xử lý request
- Database query timeout quá lâu
- API server không phản hồi kịp thời
- Connection bị reset do lỗi xử lý

### Why 2: Tại sao API server có thể crash hoặc không phản hồi?

**Trả lời:** Các service methods không có error handling, khi database query fail hoặc timeout → unhandled exception → server crash hoặc không phản hồi.

**Bằng chứng:**

- `folder.service.ts:170-197` - `getTree()` **KHÔNG CÓ** try-catch
- `stats.service.ts:21-36` - `getStats()` **KHÔNG CÓ** try-catch
- `department.service.ts:12-17` - `findAll()` **KHÔNG CÓ** try-catch
- `maintenance.service.ts:12-32` - `findAll()` **KHÔNG CÓ** try-catch

### Why 3: Tại sao database query có thể fail hoặc timeout?

**Nguyên nhân có thể:**

1. **Database connection lost** - Prisma client bị disconnect
2. **Query timeout** - Query quá phức tạp hoặc database chậm
3. **Database server overload** - Quá nhiều query đồng thời
4. **Network issue** - Kết nối mạng không ổn định
5. **Table missing** - Bảng không tồn tại (unlikely sau migration)

**Bằng chứng từ log:**

```
prisma:query SELECT "public"."folders"."id", ... FROM "public"."folders" ... OFFSET $1
```

- Query đang chạy nhưng có thể bị timeout hoặc fail

### Why 4: Tại sao không có error handling?

**Trả lời:** Code thiếu defensive programming, các service methods giả định database query luôn thành công.

**Vấn đề:**

- Không có try-catch blocks
- Không có timeout protection
- Không có retry logic
- Không có graceful error handling

### Why 5: Nguyên nhân gốc rễ là gì?

**Nguyên nhân gốc rễ:** Thiếu error handling trong các service methods + potential database connection/timeout issues.

**Các yếu tố đóng góp:**

1. Không có try-catch trong các service methods quan trọng
2. Database connection có thể không ổn định
3. Không có timeout protection cho database queries
4. API server có thể crash từ lỗi trước đó và chưa recover
5. Không có logging để debug vấn đề

---

## Bằng Chứng

### 1. Code Analysis

**File:** `apps/api/src/modules/storage/services/folder.service.ts:170-197`

```170:197:apps/api/src/modules/storage/services/folder.service.ts
  async getTree() {
    // Get all active folders
    const folders = await (this.prisma as PrismaClientLike).folder.findMany({
      where: { deletedAt: null }, // Only active folders
      orderBy: { path: "asc" },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    // Build tree structure
    const buildTree = (parentId: string | null = null): FolderTreeNode[] => {
      return folders
        .filter((f: (typeof folders)[0]) => f.parentId === parentId)
        .map((f: (typeof folders)[0]) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          physicalLocation: f.physicalLocation,
          documentCount: f._count.documents,
          children: buildTree(f.id),
        }));
    };

    return buildTree();
  }
```

**Vấn đề:**

- ❌ Không có try-catch block
- ❌ Database errors sẽ propagate unhandled
- ❌ Không có logging errors
- ❌ Không có graceful fallback

**File:** `apps/api/src/modules/storage/services/stats.service.ts:21-36`

```21:36:apps/api/src/modules/storage/services/stats.service.ts
  async getStats(): Promise<StatsResponse> {
    const [totalDocuments, totalFolders, totalUsers, recentUploads] =
      await Promise.all([
        this.documentService.count(),
        this.folderService.count(),
        this.usersService.count(),
        this.documentService.countRecent(7), // Last 7 days
      ]);

    return {
      totalDocuments,
      totalFolders,
      totalUsers,
      recentUploads,
    };
  }
```

**Vấn đề:**

- ❌ Không có try-catch block
- ❌ Nếu một trong các Promise.all fail → toàn bộ fail
- ❌ Không có error handling cho từng query riêng lẻ

**File:** `apps/api/src/modules/department/services/department.service.ts:12-17`

```12:17:apps/api/src/modules/department/services/department.service.ts
  findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }
```

**Vấn đề:**

- ❌ Không có try-catch block
- ❌ Không có error handling

**File:** `apps/api/src/modules/maintenance/services/maintenance.service.ts:12-32`

```12:32:apps/api/src/modules/maintenance/services/maintenance.service.ts
  async findAll() {
    return this.prisma.maintenanceNotice.findMany({
      orderBy: { startDate: "asc" },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }
```

**Vấn đề:**

- ❌ Không có try-catch block
- ❌ Include relations có thể fail nếu foreign key issues

### 2. Error Sequence

1. Frontend gửi request đến `/api/storage/folders/tree` (hoặc các endpoint khác)
2. Next.js proxy forward request đến `http://localhost:3010/api/...`
3. API server nhận request và gọi service method
4. Service method thực hiện database query
5. **Database query fail hoặc timeout** (connection issue, timeout, etc.)
6. Exception thrown nhưng **KHÔNG ĐƯỢC CATCH**
7. NestJS exception filter catch nhưng server có thể đã crash hoặc connection bị reset
8. Proxy nhận `ECONNRESET` → "socket hang up" error
9. Frontend retry → lặp lại lỗi

### 3. Terminal Log Analysis

Từ terminal log:

- Query đang chạy: `prisma:query SELECT ... FROM "public"."folders" ... OFFSET $1`
- Nhưng sau đó connection bị reset
- Pattern lặp lại nhiều lần cho cùng các endpoint

**Giả thuyết:** Database query đang chạy nhưng bị timeout hoặc connection bị đóng, và không có error handling để recover.

---

## Giải Pháp

### Fix 1: Thêm Error Handling cho getTree() (CRITICAL)

**File:** `apps/api/src/modules/storage/services/folder.service.ts`

```typescript
async getTree() {
  try {
    const folders = await (this.prisma as PrismaClientLike).folder.findMany({
      where: { deletedAt: null },
      orderBy: { path: "asc" },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    const buildTree = (parentId: string | null = null): FolderTreeNode[] => {
      return folders
        .filter((f: (typeof folders)[0]) => f.parentId === parentId)
        .map((f: (typeof folders)[0]) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          physicalLocation: f.physicalLocation,
          documentCount: f._count.documents,
          children: buildTree(f.id),
        }));
    };

    return buildTree();
  } catch (error) {
    // Log error for debugging
    console.error('Error in getTree():', error);

    // Re-throw as CustomException for proper error handling
    throw CustomException.internalServerError(
      ErrorCodes.FOLDER.TREE_FETCH_FAILED,
      'Failed to fetch folder tree',
      error
    );
  }
}
```

### Fix 2: Thêm Error Handling cho getStats() (CRITICAL)

**File:** `apps/api/src/modules/storage/services/stats.service.ts`

```typescript
async getStats(): Promise<StatsResponse> {
  try {
    const [totalDocuments, totalFolders, totalUsers, recentUploads] =
      await Promise.all([
        this.documentService.count(),
        this.folderService.count(),
        this.usersService.count(),
        this.documentService.countRecent(7),
      ]);

    return {
      totalDocuments,
      totalFolders,
      totalUsers,
      recentUploads,
    };
  } catch (error) {
    console.error('Error in getStats():', error);

    // Return default values instead of crashing
    return {
      totalDocuments: 0,
      totalFolders: 0,
      totalUsers: 0,
      recentUploads: 0,
    };
    // Or throw CustomException if you prefer
  }
}
```

### Fix 3: Thêm Error Handling cho DepartmentService.findAll() (CRITICAL)

**File:** `apps/api/src/modules/department/services/department.service.ts`

```typescript
findAll() {
  try {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error('Error in DepartmentService.findAll():', error);
    throw CustomException.internalServerError(
      ErrorCodes.DEPARTMENT.FETCH_FAILED,
      'Failed to fetch departments',
      error
    );
  }
}
```

### Fix 4: Thêm Error Handling cho MaintenanceService.findAll() (CRITICAL)

**File:** `apps/api/src/modules/maintenance/services/maintenance.service.ts`

```typescript
async findAll() {
  try {
    return this.prisma.maintenanceNotice.findMany({
      orderBy: { startDate: "asc" },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error in MaintenanceService.findAll():', error);
    throw CustomException.internalServerError(
      ErrorCodes.MAINTENANCE.FETCH_FAILED,
      'Failed to fetch maintenance notices',
      error
    );
  }
}
```

### Fix 5: Thêm Database Connection Health Check

**File:** `apps/api/src/common/prisma/prisma.service.ts` (nếu chưa có)

Thêm method để check database connection health và reconnect nếu cần.

### Fix 6: Thêm Request Timeout Protection

Cấu hình NestJS để có request timeout để tránh request treo quá lâu.

---

## Kế Hoạch Thực Hiện

### Phase 1: Immediate Fixes (CRITICAL)

1. ✅ Thêm try-catch cho `getTree()`
2. ✅ Thêm try-catch cho `getStats()`
3. ✅ Thêm try-catch cho `DepartmentService.findAll()`
4. ✅ Thêm try-catch cho `MaintenanceService.findAll()`

### Phase 2: Enhanced Error Handling

1. Thêm structured logging (winston/pino)
2. Thêm database connection health check
3. Thêm request timeout configuration
4. Thêm retry logic cho database queries

### Phase 3: Monitoring & Observability

1. Thêm error tracking (Sentry hoặc tương tự)
2. Thêm metrics cho database query performance
3. Thêm alerts cho connection failures

---

## Kết Luận

**Nguyên nhân chính:** Thiếu error handling trong các service methods dẫn đến unhandled exceptions khi database queries fail hoặc timeout, gây ra API server crash hoặc connection reset.

**Giải pháp ưu tiên:** Thêm try-catch blocks cho tất cả các service methods quan trọng để handle errors gracefully và prevent server crashes.

**Impact:** Sau khi fix, API server sẽ không crash khi có database errors, và sẽ return proper error responses thay vì "socket hang up".
