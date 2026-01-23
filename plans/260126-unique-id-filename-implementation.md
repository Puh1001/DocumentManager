# Unique ID Filename Implementation

**Date:** 2025-01-26  
**Status:** Completed

## Overview

Implemented solution to save physical file names on SMB using Unique ID format while preserving original filenames for user display.

## Requirements

- When users upload files, save physical file name using Unique ID
- Display original file names to users normally
- Save files to SMB with stable format (Unique ID)
- When users view files in documents, KPI, or dashboard, display original uploaded file names

## Implementation

### Changes Made

1. **version.service.ts**
   - Changed physical file name from `document.fileName` to `{documentId}.{ext}`
   - Added cleanup logic to remove old files with original filenames when migrating
   - Added Logger for cleanup operations

2. **document-deletion.service.ts**
   - Updated to use filename from `filePath` (ID-based) instead of `document.fileName` when moving deleted files

3. **Test Files Updated**
   - `version.service.spec.ts`: Updated mock file paths to use ID-based format
   - `document.service.spec.ts`: Updated mock file paths
   - `document.controller.spec.ts`: Updated mock file paths
   - `document-deletion.service.spec.ts`: Updated mock file paths

### File Naming Strategy

- **Physical files on SMB**: `{documentId}.{ext}` (e.g., `abc123-def456-ghi789.pdf`)
- **Database `fileName` field**: Original filename from upload (e.g., `My Document.pdf`)
- **Database `filePath` field**: SMB path with ID-based filename (e.g., `folder/current/abc123-def456-ghi789.pdf`)
- **User display**: Always shows original `fileName` from database

### Backward Compatibility

- Files synced from file system keep their original paths until updated
- When a version is created (file changes), files migrate to ID-based format
- Old files with original names are automatically cleaned up during migration

## Benefits

1. **Stability**: ID-based filenames avoid encoding issues and special character problems
2. **Consistency**: All new uploads use the same naming format
3. **User Experience**: Users always see original filenames, regardless of physical storage format
4. **Migration**: Automatic cleanup of old files during version creation

## Testing

- Updated all test files to reflect new ID-based filename format
- Tests verify that:
  - Physical files use ID-based names
  - Database stores original filenames
  - User display shows original filenames
  - File operations (read, download) work correctly

## Files Modified

- `apps/api/src/modules/storage/services/version.service.ts`
- `apps/api/src/modules/storage/services/document-deletion.service.ts`
- `apps/api/src/modules/storage/services/version.service.spec.ts`
- `apps/api/src/modules/storage/services/document.service.spec.ts`
- `apps/api/src/modules/storage/controllers/document.controller.spec.ts`
- `apps/api/src/modules/storage/services/document-deletion.service.spec.ts`
- `docs/architecture/file-storage-architecture.md`

## Notes

- Frontend components already use `fileName` field for display, so no changes needed
- Download functionality returns original `fileName` for user-friendly downloads
- Sync handlers continue to work with both old and new formats during migration period
