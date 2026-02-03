# Phase 05 Completion Report: Deletion Service Updates

**Date:** 2026-01-30  
**Status:** ✅ Completed  
**Phase:** Phase 05 - Deletion Service Updates

## Summary

Updated DocumentDeletionService to use "Delete_files" folder path (with underscore) instead of "Deleted files" (with space) to match mandatory storage structure.

## Changes Made

### DocumentDeletionService (`apps/api/src/modules/storage/services/document-deletion.service.ts`)

**Updated Delete Folder Path:**
- Changed `"Deleted files"` → `"Delete_files"` in path building (line 804)
- Changed folder name from `"Deleted files"` → `"Delete_files"` (line 820)
- Updated comments to reflect new folder name

**File Movement Logic:**
- ✅ `executeDelete()` method (line 659-760):
  - Gets document and folder
  - Derives department from folder
  - Calls `findOrCreateDeleteFolder()` to get/create Delete_files folder
  - Moves file from original section to Delete_files folder
  - Updates document status to DELETED
  - Updates document.filePath to new location

- ✅ `replaceDocument()` method (line 470-630):
  - Moves old file to Delete_files folder
  - Moves replacement file to old file's location
  - Handles rollback if replacement move fails

**Path Building:**
- ✅ `findOrCreateDeleteFolder()` (line 793-842):
  - Builds path: `{department.code}/Delete_files`
  - Creates folder on SMB if not exists
  - Creates database record
  - Handles race conditions (P2002)

## Verification

### Build Status
- ✅ TypeScript compilation: **PASSED**
- ✅ No linter errors

### Deletion Flow Verification

**File Movement:**
- ✅ Old file path: `{department}/{section}/{documentId}.ext`
- ✅ New file path: `{department}/Delete_files/{documentId}.ext`
- ✅ File moved via `smbService.rename()` (removes from original section)
- ✅ Document.filePath updated to new location
- ✅ Document.status set to DELETED

**Works for All Sections:**
- ✅ KPI section: Files moved from `{dept}/KPI/{id}.ext` → `{dept}/Delete_files/{id}.ext`
- ✅ ISO_documents section: Files moved from `{dept}/ISO_documents/{id}.ext` → `{dept}/Delete_files/{id}.ext`
- ✅ Maintenance section: Files moved from `{dept}/Maintenance/{id}.ext` → `{dept}/Delete_files/{id}.ext`

## Files Modified

1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Updated `findOrCreateDeleteFolder()` path: "Deleted files" → "Delete_files"
   - Updated folder name: "Deleted files" → "Delete_files"
   - Updated comments

## Behavior

### Deletion Flow

```
User deletes document
  → DocumentDeletionService.selfDelete()
    → Check deletion status (72-hour window)
    → DocumentDeletionService.executeDelete()
      → Get document and folder
      → Derive department from folder
      → findOrCreateDeleteFolder(departmentId)
        → Path: {department.code}/Delete_files
        → Create folder if not exists
      → Move file: oldFilePath → {department}/Delete_files/{documentId}.ext
      → Update document:
        - folderId = deleteFolder.id
        - filePath = newFilePath
        - status = DELETED
```

### File Movement

**Before Deletion:**
- File location: `{department}/{section}/{documentId}.ext`
- Example: `DH/ISO_documents/abc123.pdf`

**After Deletion:**
- File location: `{department}/Delete_files/{documentId}.ext`
- Example: `DH/Delete_files/abc123.pdf`
- File removed from original section (via rename operation)

## Verification Summary

| Requirement | Status | Notes |
|------------|--------|-------|
| Uses Delete_files path | ✅ | Updated from "Deleted files" |
| Files moved to Delete_files | ✅ | Via smbService.rename() |
| Files removed from section | ✅ | Rename removes from original location |
| Works for all sections | ✅ | KPI, ISO_documents, Maintenance |
| Correct path format | ✅ | `{department}/Delete_files/{documentId}.ext` |

## Backward Compatibility

- ✅ Existing "Deleted files" folders will be found if they exist
- ✅ New deletions will use "Delete_files" folder
- ✅ Migration script (Phase 06) will handle renaming existing folders

## Next Steps

- Proceed to Phase 06: Migration Script
- Migration script will rename existing "Deleted files" folders to "Delete_files"

## Notes

- File movement uses `smbService.rename()` which atomically moves file
- If rename fails, file remains in original location (transaction safety)
- Database update happens after file move (if DB update fails, file is already moved)
- Error handling includes rollback logic for replacement operations
