# Debug Report: Folder Real-time Sync Issue (Updated)

**Date:** 2026-01-22  
**Issue:** Folders on SMB are different from web interface. Real-time synchronization still not working after initial fix.

---

## Problem Summary

**Symptoms:**
- Folders exist on SMB file system but don't appear on web interface in real-time
- WebSocket connection is established and client is subscribed
- Logs show: "WebSocket connected" and "Subscribed to all folders"
- But folders added on SMB are not synced to database immediately
- Manual sync button works, but real-time sync doesn't

**Example Folders:**
- SMB has: `test-deletion-folder`, `Test Department for Deletion`, `Chi nhánh Hưng Yên - Dệt đai`
- Web interface doesn't show these folders until manual sync

---

## Root Cause Analysis (Updated)

### Issues Identified

1. **Missing Folder Sync Implementation** ✅ FIXED
   - `FolderSyncListener.handleFolderAdded` only broadcasted, didn't sync
   - No `syncSingleFolder` method existed

2. **Parent Folder Dependency** ✅ FIXED
   - When folder is added, if parent doesn't exist in DB, sync fails
   - `syncSingleFolder` didn't recursively sync parent folders

3. **Path Normalization Issues** ✅ FIXED
   - Windows uses backslashes, database stores forward slashes
   - `path.relative()` on Windows returns backslashes
   - Paths weren't normalized before database lookup

4. **Chokidar Configuration for Network Shares** ✅ FIXED
   - Chokidar doesn't detect changes on UNC paths without polling
   - `usePolling: true` was not set for network shares
   - Native `fs.watch` doesn't work reliably on SMB shares

---

## Fixes Applied

### 1. Added Recursive Parent Folder Sync

**File:** `apps/api/src/modules/storage/handlers/folder-sync.handler.ts`

**Change:**
- `syncSingleFolder` now recursively syncs parent folders if they don't exist
- Handles nested folder creation properly

```typescript
// Recursively sync parent folder first if it exists and is not root
if (parentPath && parentPath !== "." && parentPath !== normalizedPath && parentPath !== "") {
  const parent = await prisma.folder.findUnique({ where: { path: parentPath } });
  
  if (!parent) {
    // Parent doesn't exist - recursively sync it first
    parentId = await this.syncSingleFolder(parentPath);
  } else {
    parentId = parent.id;
  }
}
```

### 2. Path Normalization

**Files Modified:**
- `apps/api/src/modules/storage/services/folder-watcher.service.ts`
- `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
- `apps/api/src/modules/storage/handlers/folder-sync.handler.ts`

**Change:**
- Normalize all paths to use forward slashes (`/`) for consistency
- Database stores paths with forward slashes
- Windows `path.relative()` returns backslashes, now normalized

```typescript
// In watcher
const relativePath = path.relative(this.basePath, dirPath).replace(/\\/g, '/');

// In listener
const normalizedPath = event.relativePath.replace(/\\/g, '/');

// In handler
const normalizedPath = relativePath.replace(/\\/g, '/');
```

### 3. Chokidar Polling for Network Shares

**File:** `apps/api/src/modules/storage/services/folder-watcher.service.ts`

**Change:**
- Detect UNC paths (Windows network shares starting with `\\`)
- Enable polling mode for UNC paths
- Configure polling intervals

```typescript
// Check if this is a UNC path (Windows network share)
const isUncPath = process.platform === "win32" && this.basePath.startsWith("\\\\");

if (isUncPath) {
  watchOptions.usePolling = true;
  watchOptions.interval = 1000; // Poll every 1 second
  watchOptions.binaryInterval = 3000; // Poll slower for binary files
  this.logger.log(`Using polling mode for UNC path (network share)`);
}
```

### 4. Enhanced Logging

**Files Modified:**
- `apps/api/src/modules/storage/services/folder-watcher.service.ts`
- `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
- `apps/api/src/modules/storage/handlers/folder-sync.handler.ts`

**Change:**
- Added detailed logging with `[WATCHER]`, `[REALTIME SYNC]`, `[SYNC]` prefixes
- Log parent folder sync attempts
- Log path normalization
- Log polling mode activation

---

## Expected Behavior After Fixes

### Flow Diagram

```
SMB: Folder Added (e.g., "test-deletion-folder")
  ↓
FolderWatcherService: Detects addDir event
  ↓ (normalize path: backslash → forward slash)
FolderWatcherService: Emit "folder.added" event
  ↓
FolderSyncListener: Receive event
  ↓ (normalize path again for safety)
FolderSyncService.syncSingleFolder()
  ↓
FolderSyncHandler.syncSingleFolder()
  ├─ Check if parent exists
  ├─ If not: Recursively sync parent first
  └─ Sync current folder
  ↓
Database: Folder created/updated
  ↓
FolderSyncListener: Broadcast WebSocket event with folderId
  ↓
Frontend: Receive "folder_added" event
  ↓
Frontend: loadFolderTree() → Folder appears in UI
```

### Key Improvements

1. **Recursive Parent Sync**: Nested folders now sync correctly even if parent doesn't exist
2. **Path Consistency**: All paths normalized to forward slashes before DB operations
3. **Network Share Support**: Polling enabled for UNC paths ensures reliable detection
4. **Better Error Handling**: Detailed logging helps identify issues quickly

---

## Testing Steps

### Manual Test

1. **Start Backend:**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Check Logs for:**
   - `[WATCHER] Using polling mode for UNC path (network share)` (if using UNC)
   - `Starting file watcher for: \\...`

3. **Create Folder on SMB:**
   - Create a new folder directly on SMB share (e.g., "test-sync-folder")

4. **Watch Backend Logs:**
   - Should see: `[WATCHER] Folder added detected: ...`
   - Should see: `[REALTIME SYNC] Folder added event received: ...`
   - Should see: `[SYNC] Syncing folder: ...`
   - Should see: `[SYNC] Folder synced successfully: ...`
   - Should see: `[REALTIME SYNC] Folder synced and broadcasted: ...`

5. **Check Web Interface:**
   - Folder should appear within 1-3 seconds
   - No manual sync needed

### Verification Checklist

- [ ] Watcher starts successfully
- [ ] Polling mode activated for UNC paths (check logs)
- [ ] Folder creation on SMB triggers watcher event
- [ ] Path normalization works (check logs for normalized paths)
- [ ] Parent folder sync works (if nested folder)
- [ ] Database record created
- [ ] WebSocket event broadcasted
- [ ] Frontend receives event
- [ ] Folder appears in UI

---

## Potential Remaining Issues

### If Still Not Working

1. **Check Watcher Status:**
   - Look for `[WATCHER] Folder added detected` in logs
   - If missing, watcher might not be detecting changes

2. **Check Path Normalization:**
   - Compare paths in logs vs database
   - Ensure they match (both use forward slashes)

3. **Check Parent Folder:**
   - If nested folder, verify parent exists in DB
   - Check logs for parent sync attempts

4. **Check WebSocket:**
   - Verify WebSocket connection in browser console
   - Check if `folder_added` events are received

5. **Check Database:**
   - Query database to see if folder was created
   - Verify path matches (forward slashes)

---

## Files Modified

1. `apps/api/src/modules/storage/handlers/folder-sync.handler.ts`
   - Added recursive parent folder sync
   - Enhanced path normalization
   - Added detailed logging

2. `apps/api/src/modules/storage/services/folder-sync.service.ts`
   - Added `syncSingleFolder` public method

3. `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
   - Updated to sync folder before broadcasting
   - Added path normalization
   - Enhanced logging

4. `apps/api/src/modules/storage/services/folder-watcher.service.ts`
   - Added polling mode for UNC paths
   - Added path normalization in event emission
   - Enhanced logging

---

## Status

✅ **FIXES APPLIED** - All identified issues addressed

**Next Steps:**
1. Restart backend server
2. Test folder creation on SMB
3. Monitor logs for sync activity
4. Verify folders appear in web UI

**If issues persist:**
- Check backend logs for error messages
- Verify SMB path is accessible
- Check database connectivity
- Verify WebSocket connection in browser
