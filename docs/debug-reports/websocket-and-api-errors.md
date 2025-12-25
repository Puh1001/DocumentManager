# Debug Report: WebSocket Connection Failures & API 500 Errors

**Date:** 2025-01-XX  
**Status:** 🔍 Root Causes Identified  
**Priority:** High

---

## Problem Summary

**Errors Reported:**

1. **WebSocket Connection Failures:**

   ```
   WebSocket connection to 'ws://localhost:3010/socket.io/?EIO=4&transport=websocket' failed
   WebSocket connection error: websocket error
   ```

2. **API 500 Error:**

   ```
   GET http://localhost:3000/api/storage/folders/tree 500 (Internal Server Error)
   Failed to load folders: Error: Request failed
   ```

3. **Prisma Migration Error (Blocking):**
   ```
   Error: P3015
   Could not find the migration file at prisma\migrations\20251222112711_init\migration.sql
   ```

---

## Root Cause Analysis

### Issue 1: Missing Migration File (CRITICAL - Blocks All Migrations)

**Problem:**

- Migration directory `20251222112711_init` exists but is **empty** (no `migration.sql`)
- This blocks ALL new migrations from being created
- Also blocks the `maintenance_notices` table migration

**Location:**

- `apps/api/prisma/migrations/20251222112711_init/` (empty directory)

**Impact:**

- Cannot create new migrations
- Database schema out of sync
- API crashes when accessing missing tables

---

### Issue 2: WebSocket Gateway & Listener Not Registered

**Problem:**

- `FolderSyncGateway` exists but is **NOT registered** in `StorageModule`
- `FolderSyncListener` also exists but **NOT registered**
- Gateway is only imported in listener, but neither are in module providers

**Location:**

- `apps/api/src/modules/storage/storage.module.ts` - Missing both `FolderSyncGateway` and `FolderSyncListener` in providers
- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts` - Gateway exists but not registered
- `apps/api/src/modules/storage/listeners/folder-sync.listener.ts` - Listener exists but not registered

**Impact:**

- WebSocket server never initializes
- All WebSocket connections fail
- Real-time folder sync doesn't work
- File/folder change events not broadcast to clients

**Current State:**

```typescript
// storage.module.ts - MISSING both gateway and listener
@Module({
  providers: [
    // ... other services
    // ❌ FolderSyncGateway is missing!
    // ❌ FolderSyncListener is missing!
  ],
})
```

---

### Issue 3: WebSocket URL Configuration Issue

**Problem:**

- Frontend connects to `ws://localhost:3010/socket.io/`
- But gateway uses namespace `/storage`
- Socket.IO client auto-appends `/socket.io/` to base URL

**Location:**

- `apps/web/src/hooks/use-folder-sync.ts:27-50` - `getWebSocketUrl()` function
- `apps/web/.env.local` - `NEXT_PUBLIC_WS_URL=http://localhost:3010`

**Current URL Construction:**

```typescript
// Returns: "ws://localhost:3010/storage"
// But socket.io client tries: "ws://localhost:3010/socket.io/?EIO=4&transport=websocket"
// Should be: "ws://localhost:3010" (base URL, namespace handled by socket.io)
```

**Expected Behavior:**

- Socket.IO client should connect to base URL: `ws://localhost:3010`
- Namespace `/storage` should be specified in `io()` call, not in URL

---

### Issue 4: API Port Mismatch

**Problem:**

- Default API port: `3001` (from `main.ts`)
- Frontend configured for: `3010` (from `.env.local`)
- If API runs on 3001 but frontend expects 3010 → connection fails

**Location:**

- `apps/api/src/main.ts:46` - Default port `3001`
- `apps/web/.env.local` - `NEXT_PUBLIC_API_URL=http://localhost:3010`

**Impact:**

- If API_PORT env var not set → API runs on 3001
- Frontend tries to connect to 3010 → fails

---

### Issue 5: API 500 Error (Cascading from Issue 1)

**Problem:**

- `/api/storage/folders/tree` returns 500
- Likely caused by:
  1. Missing `maintenance_notices` table (from previous error)
  2. API server crashing on startup
  3. Database connection issues

**Location:**

- `apps/api/src/modules/storage/controllers/folder.controller.ts:42-46`
- `apps/api/src/modules/storage/services/folder.service.ts:170-197`

---

## Solutions

### Fix 1: Restore Missing Migration File (CRITICAL)

**Option A: Recreate Migration (If Database Matches Schema)**

```bash
cd apps/api

# 1. Check if database already has the tables from init migration
# 2. If yes, create empty migration file
echo "-- Migration already applied" > prisma/migrations/20251222112711_init/migration.sql

# 3. Mark as applied
npx prisma migrate resolve --applied 20251222112711_init
```

**Option B: Reset Migrations (Development Only - DESTRUCTIVE)**

```bash
cd apps/api

# ⚠️ WARNING: This will delete all data!
# 1. Backup database first
# 2. Delete migration directory
rm -rf prisma/migrations/20251222112711_init

# 3. Create new baseline migration
npx prisma migrate dev --name init
```

**Option C: Manual SQL + Baseline**

```bash
cd apps/api

# 1. Check what tables exist in database
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# 2. Create migration.sql with CREATE TABLE statements for existing tables
# 3. Mark as applied
npx prisma migrate resolve --applied 20251222112711_init
```

---

### Fix 2: Register WebSocket Gateway & Listener

**Update `apps/api/src/modules/storage/storage.module.ts`:**

```typescript
import { FolderSyncGateway } from "./gateways/folder-sync.gateway";
import { FolderSyncListener } from "./listeners/folder-sync.listener";

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [FolderController, DocumentController, StatsController],
  providers: [
    SmbService,
    FolderService,
    FolderSyncService,
    DocumentService,
    VersionService,
    LocalEditService,
    StatsService,
    DocumentSyncHandler,
    FolderSyncHandler,
    SyncDeletionHandler,
    FolderSyncGateway, // ✅ ADD THIS
    FolderSyncListener, // ✅ ADD THIS
  ],
  // ...
})
```

**Also Fix: Add EventEmitterModule to AppModule**

The `FolderSyncListener` uses `@OnEvent` which requires `EventEmitterModule`:

**Update `apps/api/src/app.module.ts`:**

```typescript
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    // ... existing imports
    EventEmitterModule.forRoot(), // ✅ ADD THIS (required for @OnEvent)
    // ... rest of imports
  ],
})
```

---

### Fix 3: Fix WebSocket URL Construction

**Update `apps/web/src/hooks/use-folder-sync.ts`:**

```typescript
function getWebSocketUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Get base URL (without namespace)
  const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitWs) {
    // Return base URL only, namespace handled by socket.io client
    return explicitWs.replace(/[/:]+$/, "");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const normalized = apiUrl.replace(/[/:]+$/, "");
    return normalized.replace(/^http/, "ws");
  }

  return null;
}

// In useFolderSync hook, update connection:
const socket = io(wsUrl, {
  path: "/socket.io", // Explicit path
  auth: { token },
  transports: ["websocket", "polling"],
  // ...
});

// Then connect to namespace:
socket.emit("subscribe-folder", { folderId });
```

**OR simpler fix - Update connection:**

```typescript
// Change from:
const socket = io(wsUrl, { ... }); // wsUrl = "ws://localhost:3010/storage"

// To:
const socket = io(wsUrl.replace("/storage", ""), { // Base URL only
  path: "/socket.io",
  // ...
});
socket.emit("subscribe-folder", { folderId }); // Namespace handled by server
```

---

### Fix 4: Verify API Port Configuration

**Check `apps/api/.env` or `apps/api/.env.local`:**

```env
API_PORT=3010  # Must match frontend configuration
```

**Or update frontend `.env.local` to match default:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

### Fix 5: Apply Maintenance Notices Migration (After Fix 1)

Once migration system is fixed:

```bash
cd apps/api
npx prisma migrate dev --name add_maintenance_notices
```

---

## Verification Steps

After applying fixes:

1. **Check migration file exists:**

```bash
ls -la apps/api/prisma/migrations/20251222112711_init/migration.sql
```

2. **Verify WebSocket gateway registered:**

```bash
grep -r "FolderSyncGateway" apps/api/src/modules/storage/storage.module.ts
```

3. **Test API endpoint:**

```bash
curl http://localhost:3010/api/storage/folders/tree \
  -H "Authorization: Bearer <token>"
```

4. **Check WebSocket connection:**

- Open browser console
- Should see: "WebSocket connected" (not errors)
- Check Network tab → WS connection should be established

5. **Verify API port:**

```bash
# Check API logs on startup
# Should show: "🚀 API running on http://localhost:3010"
```

---

## Priority Order

1. **CRITICAL**: Fix missing migration file (blocks everything)
2. **HIGH**: Register WebSocket gateway
3. **MEDIUM**: Fix WebSocket URL construction
4. **MEDIUM**: Verify API port configuration
5. **LOW**: Apply maintenance notices migration

---

## Related Files

- `apps/api/prisma/migrations/20251222112711_init/` - Missing migration.sql
- `apps/api/src/modules/storage/storage.module.ts` - Missing gateway registration
- `apps/web/src/hooks/use-folder-sync.ts` - WebSocket URL issue
- `apps/api/src/main.ts` - Port configuration
- `apps/web/.env.local` - Frontend environment variables

---

## Prevention

1. **Migration Files**: Never delete migration.sql files, use `prisma migrate resolve` instead
2. **Module Registration**: Always verify providers array includes all gateways/services
3. **Environment Variables**: Document required env vars in README
4. **Port Consistency**: Use same port in all configs or document defaults clearly
