# Sync Orphaned Records Cleanup Implementation

**Date:** 2024-12-19  
**Status:** ✅ Completed

---

## Goal

Implement **Two-Pass Sync + Soft Delete** để:

- Detect và cleanup deleted folders/files
- Preserve history với soft delete
- Keep DB state consistent với file system

---

## Phases

### Phase 1: Schema Update

- Add `deletedAt` field to Folder model
- Run migration
- Update indexes

### Phase 2: Implement Two-Pass Sync

- Pass 1: Sync file system + track seen paths
- Pass 2: Clean up orphans (deleted items)
- Handle deleted folders/documents

### Phase 3: Update Queries

- Filter deleted folders in all queries
- Update FolderService queries
- Update controllers if needed

### Phase 4: Testing & Verification

- Test deleted folders/files cleanup
- Test cascade deletion
- Verify performance

---

## Success Criteria

- ✅ Deleted items marked as deleted
- ✅ No orphaned records
- ✅ DB state matches file system
- ✅ All queries filter deleted items
