# Debug Report: API 500 & WebSocket Connection Errors

**Date:** 2025-12-25  
**Status:** 🔍 Root Cause Analysis  
**Priority:** HIGH

---

## Problem Summary

**Errors Reported:**

1. **WebSocket Connection Error:**

   ```
   WebSocket connection error: websocket error
   ```

2. **API 500 Error:**

   ```
   GET /api/storage/folders/tree 500 (Internal Server Error)
   Failed to load folders: Error: Request failed
   ```

3. **Connection Refused:**
   ```
   Failed to load resource: net::ERR_CONNECTION_REFUSED
   ```

**User Note:** "Lỗi do db à" (Database error)

---

## Root Cause Analysis (5 Whys)

### Why 1: Why is `/api/storage/folders/tree` returning 500?

**Answer:** The endpoint is throwing an unhandled exception, likely from database query failure.

**Evidence:**

- `folder.service.ts:170-197` - `getTree()` method has NO try-catch
- Method directly queries database: `this.prisma.folder.findMany()`
- If database query fails → unhandled exception → 500 error

### Why 2: Why would the database query fail?

**Possible Causes:**

1. **Database connection lost** - Prisma client disconnected
2. **Table doesn't exist** - `folders` table missing (unlikely, migration fixed)
3. **Database server down** - PostgreSQL not running
4. **Connection timeout** - Network issue to database
5. **Prisma client not initialized** - `$connect()` failed

### Why 3: Why is WebSocket connection failing?

**Answer:** API server likely crashed or not running due to database error.

**Evidence:**

- WebSocket connects to `ws://localhost:3010/storage`
- If API server crashed → WebSocket server unavailable
- Connection refused errors suggest server not running

### Why 4: Why would API server crash?

**Answer:** Unhandled exception in `getTree()` method crashes the request handler, potentially causing server instability.

**Evidence:**

- No error handling in `getTree()` method
- Database errors propagate as unhandled exceptions
- NestJS exception filter catches it but returns 500

### Why 5: What's the root cause?

**Root Cause:** Missing error handling in `getTree()` method + potential database connection issues.

**Contributing Factors:**

1. No try-catch in `getTree()` method
2. Database connection might be unstable
3. No graceful error handling for database failures
4. API server might have crashed from previous error

---

## Evidence

### Code Analysis

**File:** `apps/api/src/modules/storage/services/folder.service.ts:170-197`

```typescript
async getTree() {
  // ❌ NO ERROR HANDLING
  const folders = await (this.prisma as PrismaClientLike).folder.findMany({
    where: { deletedAt: null },
    orderBy: { path: "asc" },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });
  // If database query fails → unhandled exception → 500 error
  return buildTree();
}
```

**Issues:**

- No try-catch block
- Database errors propagate unhandled
- No logging of errors
- No graceful fallback

### Error Sequence

1. Frontend requests `/api/storage/folders/tree`
2. `FolderController.getTree()` calls `folderService.getTree()`
3. `folderService.getTree()` queries database
4. **Database query fails** (connection issue, timeout, etc.)
5. Exception thrown → NestJS catches → Returns 500
6. **OR** Server crashes → Connection refused errors
7. WebSocket can't connect (server down)

---

## Solutions

### Fix 1: Add Error Handling to getTree() (CRITICAL)

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to get folder tree: ${errorMessage}`, error);
    throw CustomException.internalServerError(
      ErrorCodes.STORAGE.FOLDER_TREE_ERROR,
      `Failed to load folder tree: ${errorMessage}`
    );
  }
}
```

### Fix 2: Verify Database Connection

**Check:**

1. Database server is running
2. `DATABASE_URL` env var is correct
3. Prisma client connects successfully
4. `folders` table exists

**Commands:**

```bash
# Check database connection
cd apps/api
npx prisma db execute --stdin <<< "SELECT 1;"

# Check folders table exists
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM folders;"

# Check migration status
npx prisma migrate status
```

### Fix 3: Add Health Check for Database

**Verify Prisma connection in health endpoint:**

- Check if database is accessible
- Return appropriate status

---

## Related Files

- `apps/api/src/modules/storage/services/folder.service.ts:170-197` - Missing error handling
- `apps/api/src/modules/storage/controllers/folder.controller.ts:42-46` - Endpoint handler
- `apps/api/src/common/prisma/prisma.service.ts` - Database connection
- `apps/api/src/common/filters/http-exception.filter.ts` - Exception handling

---

## Verification Steps

1. **Check API server logs:**
   - Look for database connection errors
   - Check for Prisma client errors
   - Verify server is running

2. **Test database connection:**

   ```bash
   cd apps/api
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

3. **Test endpoint directly:**

   ```bash
   curl http://localhost:3010/api/storage/folders/tree \
     -H "Authorization: Bearer <token>"
   ```

4. **Check server status:**
   - Verify API server is running on port 3010
   - Check for crash logs
   - Verify database connection

---

## Prevention

1. **Always add error handling** to database queries
2. **Log errors** for debugging
3. **Use CustomException** for consistent error responses
4. **Add database health checks** to monitor connection
5. **Handle connection failures gracefully**

---

## Next Steps

1. ✅ **Immediate**: Add error handling to `getTree()` method
2. ⏳ **Verify**: Check database connection status
3. ⏳ **Test**: Verify endpoint works after fix
4. ⏳ **Monitor**: Check API server logs for database errors

---

## Notes

- Error handling is critical for database operations
- Unhandled exceptions cause 500 errors
- Database connection issues can crash requests
- WebSocket errors are likely cascading from API server issues
