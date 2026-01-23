# Debug Report: Folder Real-time Sync Issue

**Date:** 2026-01-22  
**Issue:** Folders on SMB are different from web interface. Real-time synchronization not working.

---

## Problem Summary

**Symptoms:**
- Folders exist on SMB file system but don't appear on web interface
- WebSocket connection is established and client is subscribed
- Logs show: "WebSocket connected" and "Subscribed to all folders"
- But folders added on SMB are not synced to database in real-time

**Example:**
- SMB has: `test-deletion-folder`, `Test Department for Deletion`
- Web interface doesn't show these folders until manual sync

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Why don't folders appear on web?**
   - Folders are not in database, so API doesn't return them

2. **Why aren't folders in database?**
   - When folder is added on SMB, the `folder.added` event is emitted
   - But the folder is not synced to database before broadcasting

3. **Why isn't folder synced to database?**
   - `FolderSyncListener.handleFolderAdded` only broadcasts event
   - It doesn't call any sync method to add folder to database

4. **Why doesn't it sync?**
   - There's no `syncSingleFolder` method in `FolderSyncService` (only `syncSingleFile` exists)
   - `SyncEventListenerService.syncFolder` is a TODO and does nothing

5. **Why is syncFolder a TODO?**
   - Implementation was deferred, assuming full sync would handle it
   - But real-time sync needs immediate folder sync

---

## Evidence

### Code Evidence

**File:** `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
```typescript
@OnEvent("folder.added")
async handleFolderAdded(event: { path: string; relativePath: string }) {
  this.logger.debug(`Folder added event: ${event.relativePath}`);
  
  // ❌ PROBLEM: Only broadcasts, doesn't sync to database
  this.gateway.broadcastSyncEvent({
    type: "folder_added",
    data: { path: event.relativePath },
  });
}
```

**File:** `apps/api/src/modules/storage/services/sync-event-listener.service.ts`
```typescript
private async syncFolder(relativePath: string) {
  try {
    this.logger.debug(`Folder added, triggering resync: ${relativePath}`);
    // ❌ PROBLEM: TODO - doesn't actually sync
    // For now, folder events are logged but not actively synced
    // Full sync will pick up new folders on next scheduled sync
    // TODO: Implement selective folder sync if needed
  } catch (error) {
    // ...
  }
}
```

**File:** `apps/api/src/modules/storage/services/folder-sync.service.ts`
```typescript
// ✅ Has syncSingleFile method
async syncSingleFile(relativePath: string): Promise<...> { ... }

// ❌ Missing: syncSingleFolder method
```

### Comparison with File Sync (Working)

**File sync works because:**
```typescript
@OnEvent("file.added")
async handleFileAdded(event: { path: string; relativePath: string }) {
  // ✅ Syncs file to database first
  const result = await this.syncService.syncSingleFile(event.relativePath);
  
  // ✅ Then broadcasts with folderId
  if (result && result.folderId) {
    this.gateway.broadcastSyncEvent({
      type: "document_added",
      folderId: result.folderId,
      documentId: result.documentId,
      data: { path: event.relativePath },
    });
  }
}
```

---

## Fix Implementation

### Changes Made

1. **Added `syncSingleFolder` method to `FolderSyncHandler`**
   - Public method to sync a single folder by relative path
   - Finds parent folder and syncs the folder record

2. **Added `syncSingleFolder` method to `FolderSyncService`**
   - Public API method for real-time folder sync
   - Delegates to `FolderSyncHandler.syncSingleFolder`

3. **Updated `FolderSyncListener.handleFolderAdded`**
   - Now syncs folder to database before broadcasting
   - Broadcasts with `folderId` so frontend can update specific folder
   - Includes error handling and fallback

### Files Modified

1. `apps/api/src/modules/storage/handlers/folder-sync.handler.ts`
   - Added `syncSingleFolder` public method
   - Added `path` import

2. `apps/api/src/modules/storage/services/folder-sync.service.ts`
   - Added `syncSingleFolder` public method

3. `apps/api/src/modules/storage/listeners/folder-sync.listener.ts`
   - Updated `handleFolderAdded` to sync folder before broadcasting

---

## Expected Behavior After Fix

1. **When folder is added on SMB:**
   - File watcher detects `addDir` event
   - Emits `folder.added` event
   - `FolderSyncListener` syncs folder to database
   - Broadcasts `folder_added` event with `folderId`
   - Frontend receives event and refreshes folder tree
   - Folder appears immediately on web interface

2. **WebSocket Flow:**
   ```
   SMB: Folder Added
   → FolderWatcherService: emit("folder.added")
   → FolderSyncListener: syncSingleFolder() → DB
   → FolderSyncListener: broadcastSyncEvent({ type: "folder_added", folderId: "..." })
   → WebSocket: Client receives event
   → Frontend: loadFolderTree() → Folder appears
   ```

---

## Testing

### Manual Test Steps

1. Start backend and frontend
2. Open web interface
3. Create a new folder on SMB share
4. **Expected:** Folder should appear on web interface within 2-3 seconds
5. **Before fix:** Folder would not appear until manual sync

### Verification

- Check backend logs for: `Folder synced and broadcasted: <path> (folderId: <id>)`
- Check browser console for: `Refreshing folder tree due to event: folder_added`
- Verify folder appears in web interface folder tree

---

## Related Issues

- Similar issue may exist for `folder.deleted` event
- Should verify folder deletion also syncs properly

---

## Status

✅ **FIXED** - Changes implemented and TypeScript compilation verified

**Next Steps:**
1. Test in development environment
2. Verify folder deletion sync works
3. Monitor production logs after deployment
