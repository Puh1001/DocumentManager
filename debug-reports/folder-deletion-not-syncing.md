# Debug Report: Folder Deletion Not Syncing to Database

**Date:** 2026-01-22  
**Issue:** Watcher detects folder deletion but folder is not deleted in database or web UI.

---

## Problem Summary

**Symptoms:**
- Watcher successfully detects folder deletion on SMB
- Logs show: `[FolderWatcherService] Folder deleted: Z:\...\IT`
- Event `folder.deleted` is emitted
- `FolderSyncListener.handleFolderDeleted()` receives event
- WebSocket event is broadcasted
- **BUT:** Folder is NOT deleted in database
- **BUT:** Folder still appears in web UI

**Expected Behavior:**
- Folder should be soft-deleted in database
- Child folders should be cascade-deleted
- Documents in folder should be marked as DELETED
- WebSocket should broadcast with `folderId`
- Frontend should remove folder from UI

**Actual Behavior:**
- Only WebSocket event is broadcasted (without `folderId`)
- Database is not updated
- Folder remains visible in web UI

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Why is the folder not deleted in database?**
   - `handleFolderDeleted()` doesn't call any service to delete folder

2. **Why doesn't `handleFolderDeleted()` delete the folder?**
   - It only broadcasts WebSocket event, doesn't call deletion service

3. **Why is there no deletion call?**
   - No method exists to delete single folder by path (unlike `deleteSingleFile()`)

4. **Why is there no `deleteSingleFolder()` method?**
   - It was never implemented for real-time sync

5. **Why was it not implemented?**
   - **ROOT CAUSE: `handleFolderDeleted()` was implemented as placeholder, only broadcasting events without actual deletion logic**

### Evidence

**From `folder-sync.listener.ts`:**
```typescript
@OnEvent("folder.deleted")
async handleFolderDeleted(event: { path: string; relativePath: string }) {
  this.logger.debug(`Folder deleted event: ${event.relativePath}`);

  // ❌ ONLY broadcasts, doesn't delete!
  this.gateway.broadcastSyncEvent({
    type: "folder_deleted",
    data: { path: event.relativePath },
  });
}
```

**Comparison with `handleFileDeleted()`:**
```typescript
@OnEvent("file.deleted")
async handleFileDeleted(event: { path: string; relativePath: string }) {
  // ✅ Calls service to delete file in database
  const result = await this.syncService.deleteSingleFile(event.relativePath);
  
  if (result && result.folderId) {
    // ✅ Broadcasts with folderId
    this.gateway.broadcastSyncEvent({
      type: "document_deleted",
      folderId: result.folderId,
      documentId: result.documentId,
      data: { path: event.relativePath },
    });
  }
}
```

**From logs:**
```
[FolderWatcherService] Folder deleted: Z:\...\IT
[FolderSyncListener] Folder deleted event: IT
[FolderSyncGateway] Broadcasted sync event: folder_deleted to all-folders (no folderId)
```

Notice: **"no folderId"** - frontend can't identify which folder was deleted!

---

## Fix Plan

### 1. Add `deleteSingleFolder()` Method

**File:** `apps/api/src/modules/storage/services/folder-sync.service.ts`

Add method similar to `deleteSingleFile()`:
```typescript
async deleteSingleFolder(
  relativePath: string
): Promise<{ folderId: string } | null> {
  // Normalize path
  const normalizedPath = relativePath.replace(/\\/g, '/');
  
  // Find folder by path
  const folder = await prisma.folder.findUnique({
    where: { path: normalizedPath },
  });
  
  if (!folder) {
    logger.warn(`Folder not found: ${normalizedPath}`);
    return null;
  }
  
  // Soft delete folder (with cascade)
  await syncDeletionHandler.handleDeletedFolder({
    id: folder.id,
    path: folder.path,
  });
  
  return { folderId: folder.id };
}
```

### 2. Update `handleFolderDeleted()` to Call Service

**File:** `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`

Update to match pattern of `handleFileDeleted()`:
```typescript
@OnEvent("folder.deleted")
async handleFolderDeleted(event: { path: string; relativePath: string }) {
  const normalizedPath = event.relativePath.replace(/\\/g, '/');
  this.logger.log(`[REALTIME SYNC] Folder deleted event received: ${normalizedPath}`);

  try {
    // Soft delete folder in database first
    const result = await this.syncService.deleteSingleFolder(normalizedPath);

    if (result && result.folderId) {
      // Broadcast event with folderId so frontend knows which folder was deleted
      this.logger.debug(
        `Broadcasting folder_deleted with folderId: ${result.folderId}`
      );
      this.gateway.broadcastSyncEvent({
        type: "folder_deleted",
        folderId: result.folderId,
        data: { path: normalizedPath },
      });
    } else {
      // Fallback: broadcast without folderId (will refresh all folders)
      this.logger.warn(
        `Broadcasting folder_deleted without folderId for: ${normalizedPath}`
      );
      this.gateway.broadcastSyncEvent({
        type: "folder_deleted",
        data: { path: normalizedPath },
      });
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    this.logger.error(`Failed to handle folder deleted event: ${errorMessage}`);
    // Still broadcast event even if delete failed
    this.gateway.broadcastSyncEvent({
      type: "folder_deleted",
      data: { path: normalizedPath },
    });
  }
}
```

---

## Expected Behavior After Fix

### Flow Diagram

```
SMB: Folder Deleted (e.g., "IT")
  ↓
FolderWatcherService: Detects unlinkDir event
  ↓ (normalize path)
FolderWatcherService: Emit "folder.deleted" event
  ↓
FolderSyncListener: Receive event
  ↓
FolderSyncService.deleteSingleFolder()
  ├─ Find folder by path in database
  ├─ Call SyncDeletionHandler.handleDeletedFolder()
  │  ├─ Soft delete folder (deletedAt = now)
  │  ├─ Cascade: Soft delete child folders
  │  └─ Cascade: Mark documents as DELETED
  └─ Return folderId
  ↓
FolderSyncListener: Broadcast WebSocket event with folderId
  ↓
Frontend: Receive "folder_deleted" event
  ↓
Frontend: Remove folder from UI (by folderId)
```

### Key Improvements

1. **Database Sync**: Folder is actually deleted in database
2. **Cascade Deletion**: Child folders and documents are handled
3. **FolderId in Event**: Frontend can identify which folder to remove
4. **Error Handling**: Graceful fallback if deletion fails

---

## Testing Steps

### 1. Restart Backend

```bash
cd apps/api
npm run dev
```

### 2. Create Test Folder

- Create folder "IT" on SMB share
- Wait for it to appear in web UI

### 3. Delete Test Folder

- Delete folder "IT" on SMB share

### 4. Watch Backend Logs

Should see:
- ✅ `[WATCHER] Folder deleted detected: ...`
- ✅ `[REALTIME SYNC] Folder deleted event received: IT`
- ✅ `[SYNC] Soft deleted folder: IT`
- ✅ `Broadcasting folder_deleted with folderId: ...`

### 5. Check Database

- Query: `SELECT * FROM folders WHERE path = 'IT'`
- Should show: `deleted_at IS NOT NULL`

### 6. Check Web Interface

- Folder "IT" should disappear from left sidebar
- No manual refresh needed

---

## Verification Checklist

- [ ] `deleteSingleFolder()` method added to `FolderSyncService`
- [ ] `handleFolderDeleted()` updated to call service
- [ ] Path normalization applied
- [ ] Error handling implemented
- [ ] WebSocket event includes `folderId`
- [ ] TypeScript compilation passes
- [ ] Backend restarted
- [ ] Folder deletion triggers logs
- [ ] Folder deleted in database
- [ ] Folder removed from web UI

---

## Related Issues

This fix completes the real-time sync implementation:
- ✅ Folder creation sync (already fixed)
- ✅ Folder deletion sync (this fix)
- ✅ File creation sync (already working)
- ✅ File deletion sync (already working)

---

## Status

✅ **FIXED** - Implementation completed

**Changes Made:**
1. ✅ Added `deleteSingleFolder()` method to `SyncDeletionHandler`
2. ✅ Added wrapper method in `FolderSyncService`
3. ✅ Updated `handleFolderDeleted()` to call service and include folderId
4. ✅ Added path normalization
5. ✅ Added error handling
6. ✅ TypeScript compilation passes
7. ✅ ESLint passes

**Next Steps:**
1. Restart backend server
2. Test folder deletion
3. Verify database and UI sync

---

## Files Modified

1. `apps/api/src/modules/storage/handlers/sync-deletion.handler.ts`
   - ✅ Added `deleteSingleFolder()` method

2. `apps/api/src/modules/storage/services/folder-sync.service.ts`
   - ✅ Added `deleteSingleFolder()` wrapper method

3. `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
   - ✅ Updated `handleFolderDeleted()` to call service and include folderId
   - ✅ Added path normalization
   - ✅ Added error handling and logging
