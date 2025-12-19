# Brainstorm: Sync Orphaned Records Cleanup

**Date:** 2024-12-19  
**Status:** Analysis & Recommendations

---

## Problem Statement

### Current Issue

Khi sync với file system, hệ thống chỉ **thêm mới** và **cập nhật** records, nhưng **KHÔNG xử lý**:

1. **Deleted Folders/Files:**
   - User xóa folder trên file system → Folder vẫn còn trong DB
   - User xóa file → Document vẫn còn với status `ACTIVE`
   - Documents có `filePath` không còn tồn tại

2. **Renamed Folders/Files:**
   - User đổi tên folder `A` → `B` → DB có cả `A` và `B`
   - User đổi tên file → Document cũ vẫn còn, document mới được tạo
   - `filePath` trong documents trỏ đến path cũ không còn tồn tại

3. **Moved Folders/Files:**
   - User di chuyển folder → Parent relationship sai
   - User di chuyển file → `folderId` sai

### Impact

- **Data inconsistency:** DB không phản ánh đúng file system
- **Orphaned records:** Folders/files trong DB nhưng không tồn tại trên disk
- **Broken references:** Documents có `filePath` không hợp lệ
- **User confusion:** UI hiển thị folders/files không còn tồn tại

---

## Requirements

### Must Have

1. **Detect deleted items:**
   - Folders không còn trên file system → Mark as deleted hoặc remove
   - Files không còn trên file system → Mark as `DELETED` status

2. **Detect renamed items:**
   - Folders đổi tên → Update path và name
   - Files đổi tên → Update `fileName` và `filePath`

3. **Clean up orphans:**
   - Documents với `filePath` không tồn tại → Mark as `DELETED`
   - Folders không còn trên file system → Handle appropriately

### Should Have

4. **Detect moved items:**
   - Folders di chuyển → Update `parentId` và `path`
   - Files di chuyển → Update `folderId` và `filePath`

5. **Preserve history:**
   - Không hard delete (giữ records để audit)
   - Use soft delete (status = `DELETED`)

### Nice to Have

6. **Rename detection:**
   - Detect rename bằng checksum hoặc inode
   - Avoid creating duplicate records

---

## Solution Approaches

### Approach 1: Two-Pass Sync (RECOMMENDED)

**Strategy:** Scan file system → Build "seen" set → Compare với DB → Clean up orphans

#### Implementation

```typescript
async syncWithFileSystem() {
  // Pass 1: Scan file system and sync
  const seenPaths = new Set<string>();

  const syncFolder = async (relativePath: string, parentId: string | null) => {
    const files = await this.smbService.listDirectory(relativePath);

    for (const file of files) {
      seenPaths.add(file.path); // Mark as seen

      if (file.isDirectory) {
        // Sync folder...
        await syncFolder(file.path, folderId);
      } else {
        // Sync document...
      }
    }
  };

  await syncFolder("", null);

  // Pass 2: Clean up orphans
  // Find folders not in seenPaths
  const allFolders = await prisma.folder.findMany();
  for (const folder of allFolders) {
    if (!seenPaths.has(folder.path)) {
      // Folder deleted on file system
      await this.handleDeletedFolder(folder);
    }
  }

  // Find documents with filePath not in seenPaths
  const allDocuments = await prisma.document.findMany({
    where: { status: "ACTIVE" }
  });
  for (const doc of allDocuments) {
    if (!seenPaths.has(doc.filePath)) {
      // File deleted on file system
      await this.handleDeletedDocument(doc);
    }
  }
}
```

#### Pros

- ✅ Simple và straightforward
- ✅ Reliable - chắc chắn detect được deleted items
- ✅ Easy to implement
- ✅ Clear separation: sync vs cleanup

#### Cons

- ⚠️ Requires two passes (slightly slower)
- ⚠️ Doesn't detect renames (creates duplicates)
- ⚠️ Need to handle nested folders (cascade delete)

#### Complexity

- **Implementation:** Medium
- **Performance:** Medium (2 passes)
- **Maintenance:** Low

---

### Approach 2: Track Sync State with "Seen" Markers

**Strategy:** Mark items as "seen" during sync → Delete items not seen

#### Implementation

```typescript
async syncWithFileSystem() {
  // Start transaction
  await prisma.$transaction(async (tx) => {
    // Mark all folders as "needs verification"
    await tx.folder.updateMany({
      data: { syncStatus: "PENDING" }
    });

    // Sync file system
    await syncFolder("", null, tx);

    // Delete folders still marked as PENDING
    await tx.folder.deleteMany({
      where: { syncStatus: "PENDING" }
    });
  });
}
```

#### Pros

- ✅ Single pass (faster)
- ✅ Atomic operation (transaction)
- ✅ Clear state tracking

#### Cons

- ⚠️ Requires schema change (add `syncStatus` field)
- ⚠️ More complex logic
- ⚠️ Still doesn't detect renames

#### Complexity

- **Implementation:** High (schema change)
- **Performance:** High (single pass)
- **Maintenance:** Medium

---

### Approach 3: Soft Delete with Status Tracking

**Strategy:** Mark deleted items as `DELETED` status instead of hard delete

#### Implementation

```typescript
async handleDeletedFolder(folder: Folder) {
  // Soft delete: Mark as deleted
  await prisma.folder.update({
    where: { id: folder.id },
    data: {
      // Option 1: Add deletedAt field
      deletedAt: new Date()
      // Option 2: Use status field (if exists)
      // status: "DELETED"
    }
  });

  // Cascade: Mark children and documents as deleted
  await prisma.folder.updateMany({
    where: { path: { startsWith: `${folder.path}/` } },
    data: { deletedAt: new Date() }
  });

  await prisma.document.updateMany({
    where: { folderId: folder.id },
    data: { status: "DELETED" }
  });
}

async handleDeletedDocument(doc: Document) {
  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "DELETED" }
  });
}
```

#### Pros

- ✅ Preserves history (audit trail)
- ✅ Can restore if needed
- ✅ No data loss

#### Cons

- ⚠️ DB grows over time (deleted records accumulate)
- ⚠️ Need cleanup job for old deleted records
- ⚠️ Queries need to filter deleted items

#### Complexity

- **Implementation:** Low
- **Performance:** High
- **Maintenance:** Medium (cleanup job)

---

### Approach 4: Rename Detection with Checksum/Inode

**Strategy:** Use checksum hoặc inode để detect renames, tránh tạo duplicates

#### Implementation

```typescript
async syncDocument(file: FileInfo, folderId: string) {
  // Calculate checksum
  const checksum = await ChecksumUtil.calculateChecksum(file.path);

  // Check if document with same checksum exists but different path
  const existingByChecksum = await prisma.document.findFirst({
    where: {
      checksum,
      status: "ACTIVE",
      filePath: { not: file.path } // Different path
    }
  });

  if (existingByChecksum) {
    // Likely renamed/moved - update path instead of creating new
    await prisma.document.update({
      where: { id: existingByChecksum.id },
      data: {
        fileName: file.name,
        filePath: file.path,
        folderId
      }
    });
    return;
  }

  // Normal sync...
}
```

#### Pros

- ✅ Detects renames/moves
- ✅ Avoids duplicates
- ✅ Updates paths correctly

#### Cons

- ⚠️ Requires checksum calculation (slower)
- ⚠️ False positives (same checksum ≠ same file if content identical)
- ⚠️ Complex logic

#### Complexity

- **Implementation:** High
- **Performance:** Low (checksum calculation)
- **Maintenance:** High

---

## Recommended Solution

### **Hybrid: Two-Pass Sync + Soft Delete**

Kết hợp **Approach 1** (Two-Pass) và **Approach 3** (Soft Delete):

#### Phase 1: Sync File System (Pass 1)

```typescript
const seenPaths = new Set<string>();

const syncFolder = async (relativePath: string, parentId: string | null) => {
  const files = await this.smbService.listDirectory(relativePath);

  for (const file of files) {
    seenPaths.add(file.path); // Track seen paths

    if (file.isDirectory) {
      // Sync folder (create or update)
      await syncFolder(file.path, folderId);
    } else {
      // Sync document (create or update)
      await syncDocument(file, parentId);
    }
  }
};
```

#### Phase 2: Clean Up Orphans (Pass 2)

```typescript
// Clean up deleted folders
const allFolders = await prisma.folder.findMany({
  where: { deletedAt: null }, // Only active folders
});

for (const folder of allFolders) {
  if (!seenPaths.has(folder.path)) {
    // Folder deleted on file system
    await this.handleDeletedFolder(folder);
  }
}

// Clean up deleted documents
const allDocuments = await prisma.document.findMany({
  where: { status: "ACTIVE" },
});

for (const doc of allDocuments) {
  if (!seenPaths.has(doc.filePath)) {
    // File deleted on file system
    await this.handleDeletedDocument(doc);
  }
}
```

#### Phase 3: Handle Deleted Items

```typescript
async handleDeletedFolder(folder: Folder) {
  // Soft delete folder
  await prisma.folder.update({
    where: { id: folder.id },
    data: { deletedAt: new Date() }
  });

  // Cascade: Mark children as deleted
  await prisma.folder.updateMany({
    where: {
      path: { startsWith: `${folder.path}/` },
      deletedAt: null
    },
    data: { deletedAt: new Date() }
  });

  // Cascade: Mark documents as DELETED
  await prisma.document.updateMany({
    where: {
      folderId: folder.id,
      status: "ACTIVE"
    },
    data: { status: "DELETED" }
  });
}

async handleDeletedDocument(doc: Document) {
  await prisma.document.update({
    where: { id: doc.id },
    data: { status: "DELETED" }
  });
}
```

---

## Implementation Considerations

### Schema Changes Required

1. **Add `deletedAt` to Folder model:**

   ```prisma
   model Folder {
     // ... existing fields
     deletedAt DateTime? @map("deleted_at")

     @@index([deletedAt])
   }
   ```

2. **Update queries to filter deleted:**
   ```typescript
   // Always filter deleted folders
   where: {
     deletedAt: null;
   }
   ```

### Performance Considerations

1. **Batch operations:**
   - Use `updateMany` instead of loop with `update`
   - Process in batches (100-1000 items)

2. **Index optimization:**
   - Index on `path` for folder lookup
   - Index on `filePath` for document lookup
   - Index on `deletedAt` for filtering

3. **Memory usage:**
   - `seenPaths` Set có thể lớn với nhiều files
   - Consider streaming hoặc chunking nếu > 100k files

### Edge Cases

1. **Nested folder deletion:**
   - Parent deleted → Children automatically deleted (cascade)
   - Use `path.startsWith()` to find children

2. **Concurrent sync:**
   - Prevent multiple syncs running simultaneously
   - Use lock mechanism hoặc queue

3. **Partial sync failure:**
   - Use transaction để ensure atomicity
   - Rollback nếu sync fails

4. **File system errors:**
   - Handle permission errors gracefully
   - Log warnings, continue with other items

---

## Success Metrics

### Functional

- ✅ All deleted folders/files marked as deleted
- ✅ No orphaned records in DB
- ✅ DB state matches file system state
- ✅ History preserved (soft delete)

### Performance

- ✅ Sync time < 5 minutes for 10k files
- ✅ Memory usage < 500MB during sync
- ✅ No performance degradation for normal operations

### Quality

- ✅ No data loss
- ✅ Audit trail maintained
- ✅ Can restore deleted items if needed

---

## Next Steps

1. **Schema update:**
   - Add `deletedAt` field to Folder model
   - Run migration

2. **Implement two-pass sync:**
   - Pass 1: Sync file system → Track seen paths
   - Pass 2: Clean up orphans → Soft delete

3. **Update queries:**
   - Filter deleted folders in all queries
   - Update UI to handle deleted items

4. **Testing:**
   - Test with deleted folders/files
   - Test with renamed folders/files
   - Test with moved folders/files
   - Test performance with large datasets

5. **Cleanup job (optional):**
   - Periodic job to hard delete old deleted records (> 90 days)
   - Or archive to separate table

---

## Alternative: Incremental Sync

**Future enhancement:** Thay vì full sync mỗi lần, có thể implement incremental sync:

- Track last sync timestamp
- Only sync changed items (via file system events hoặc polling)
- Faster sync, less resource usage

**But:** Requires file system watcher hoặc change tracking mechanism.

---

## Conclusion

**Recommended approach:** **Two-Pass Sync + Soft Delete**

- ✅ Reliable và straightforward
- ✅ Preserves history
- ✅ Handles all edge cases
- ✅ Easy to implement và maintain

**Trade-offs:**

- ⚠️ Two passes (slightly slower)
- ⚠️ Doesn't detect renames (creates duplicates, but can be handled separately)
- ⚠️ DB grows with deleted records (need cleanup job)

**Priority:**

1. **High:** Delete detection và cleanup
2. **Medium:** Rename detection (can be added later)
3. **Low:** Incremental sync (future enhancement)
