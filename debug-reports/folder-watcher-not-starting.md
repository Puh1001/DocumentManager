# Debug Report: Folder Watcher Not Starting

**Date:** 2026-01-22  
**Issue:** Created folder "IT" on SMB but nothing happened. No logs or events detected.

---

## Problem Summary

**Symptoms:**
- Created folder "IT" on SMB share at `1/22/2026 10:47 AM`
- No logs in backend terminal
- Folder doesn't appear in web interface
- No WebSocket events
- Manual sync works, but real-time sync doesn't

**Expected Behavior:**
- Watcher should detect folder creation
- Logs should show: `[WATCHER] Folder added detected: ...`
- Folder should sync to database
- WebSocket should broadcast event
- Folder should appear in web UI

**Actual Behavior:**
- Complete silence - no logs, no events, nothing

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Why is the folder not detected?**
   - Watcher is not running or not detecting changes

2. **Why is the watcher not detecting changes?**
   - Watcher might not be started

3. **Why is the watcher not started?**
   - `onModuleInit()` might not be called

4. **Why is `onModuleInit()` not called?**
   - Service is not initialized by NestJS

5. **Why is the service not initialized?**
   - **ROOT CAUSE: `FolderWatcherService` is NOT in the `providers` array of `StorageModule`**

### Evidence

**From `storage.module.ts`:**
```typescript
providers: [
  SmbService,
  FolderService,
  FolderSyncService,
  // ... other services
  SyncEventListenerService,
  // ❌ FolderWatcherService is MISSING!
  // ❌ FolderSyncListener is MISSING!
],
```

**From logs:**
- No log: `[FolderWatcherService] Starting file watcher for: ...`
- No log: `[WATCHER] Using polling mode for UNC path (network share)`
- No log: `[WATCHER] Folder added detected: ...`

**From code:**
- `FolderWatcherService` implements `OnModuleInit`
- `onModuleInit()` calls `startWatching()` after 2 seconds
- But service is never instantiated, so `onModuleInit()` never runs

---

## Fix Applied

### Changes Made

**File:** `apps/api/src/modules/storage/storage.module.ts`

1. **Added imports:**
```typescript
import { FolderWatcherService } from "./services/folder-watcher.service";
import { FolderSyncListener } from "./listeners/folder-sync.listener";
```

2. **Added to providers:**
```typescript
providers: [
  // ... existing providers
  SyncEventListenerService,
  FolderWatcherService,  // ✅ ADDED
  FolderSyncListener,   // ✅ ADDED
],
```

### Why Both Services?

1. **`FolderWatcherService`**: 
   - Watches file system for changes
   - Emits events via EventEmitter2
   - **Must be in providers** for NestJS to instantiate it

2. **`FolderSyncListener`**:
   - Listens to `folder.added` events from watcher
   - Syncs folders to database
   - Broadcasts WebSocket events
   - **Must be in providers** for `@OnEvent` decorator to work

---

## Expected Behavior After Fix

### Startup Sequence

1. **NestJS initializes `StorageModule`**
2. **Instantiates `FolderWatcherService`**
3. **Calls `onModuleInit()`** (after 2 seconds)
4. **Calls `startWatching()`**
5. **Logs:** `[FolderWatcherService] Starting file watcher for: Z:\Public\...`
6. **Logs:** `[WATCHER] Using polling mode for UNC path (network share)` (if UNC path)
7. **Logs:** `File watcher started successfully`

### When Folder is Created

1. **Chokidar detects folder** (via polling if UNC path)
2. **Logs:** `[WATCHER] Folder added detected: Z:\...\IT -> relative: IT`
3. **Emits event:** `folder.added`
4. **`FolderSyncListener.handleFolderAdded()` receives event**
5. **Logs:** `[REALTIME SYNC] Folder added event received: IT`
6. **Calls:** `syncService.syncSingleFolder("IT")`
7. **Logs:** `[SYNC] Syncing folder: IT, parent: .`
8. **Logs:** `[SYNC] Folder synced successfully: IT (id: ...)`
9. **Broadcasts WebSocket event:** `folder_added`
10. **Frontend receives event and updates UI**

---

## Testing Steps

### 1. Restart Backend

```bash
cd apps/api
npm run dev
```

### 2. Check Startup Logs

Look for:
- ✅ `[FolderWatcherService] Starting file watcher for: ...`
- ✅ `[WATCHER] Using polling mode for UNC path (network share)` (if using UNC)
- ✅ `File watcher started successfully`

### 3. Create Test Folder

- Create folder "IT" (or any name) on SMB share

### 4. Watch Backend Logs

Should see within 1-3 seconds:
- ✅ `[WATCHER] Folder added detected: ...`
- ✅ `[REALTIME SYNC] Folder added event received: ...`
- ✅ `[SYNC] Syncing folder: ...`
- ✅ `[SYNC] Folder synced successfully: ...`
- ✅ `[REALTIME SYNC] Folder synced and broadcasted: ...`

### 5. Check Web Interface

- Folder should appear in left sidebar
- No manual sync needed

---

## Verification Checklist

- [x] `FolderWatcherService` added to `providers`
- [x] `FolderSyncListener` added to `providers`
- [x] Imports added to `storage.module.ts`
- [x] TypeScript compilation passes
- [ ] Backend restarted
- [ ] Watcher startup logs visible
- [ ] Folder creation triggers logs
- [ ] Folder appears in web UI

---

## Related Issues

This fix also addresses:
- Previous issue: "Vẫn chưa đồng bộ Real-time giữa smb và web"
- The watcher was never running, so all previous fixes (polling, path normalization, recursive sync) couldn't work

---

## Status

✅ **FIXED** - Services added to module providers

**Next Steps:**
1. Restart backend server
2. Verify watcher starts (check logs)
3. Test folder creation
4. Verify real-time sync works

---

## Files Modified

1. `apps/api/src/modules/storage/storage.module.ts`
   - Added `FolderWatcherService` import
   - Added `FolderSyncListener` import
   - Added both to `providers` array
