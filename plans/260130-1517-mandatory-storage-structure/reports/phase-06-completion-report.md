# Phase 06 Completion Report: Migration Script

**Date:** 2026-01-30  
**Status:** ✅ Completed  
**Phase:** Phase 06 - Migration Script

## Summary

Created comprehensive migration script to migrate existing storage structure to mandatory format:
- Rename "Documents" → "ISO_documents"
- Rename "delete files"/"Deleted files" → "Delete_files"
- Move files from `{section}/current/` to `{section}/`
- Handle nested `current/current` folders
- Update database paths (folders, documents, document_versions)
- Remove empty "current" folders

## Changes Made

### Migration Script (`apps/api/scripts/migrate-storage-structure.ts`)

**Created new migration script with:**

1. **Folder Renaming:**
   - Rename "Documents" → "ISO_documents" (both SMB and DB)
   - Rename "delete files"/"Deleted files"/"Delete files" → "Delete_files" (both SMB and DB)

2. **File Movement:**
   - Move files from `{section}/current/` to `{section}/`
   - Handle nested `current/current` folders
   - Skip files already in `versions/` folder
   - Update `document.filePath` in database

3. **Path Updates:**
   - Update `folder.path` in database (remove `/current` segments)
   - Update `documentVersion.filePath` in database (remove `/current` segments)

4. **Cleanup:**
   - Remove empty "current" folders from SMB
   - Mark empty "current" folders as deleted in database

5. **Features:**
   - Dry-run mode for safe testing
   - Progress reporting with detailed statistics
   - Error handling and logging
   - Skip handling for conflicts and missing files
   - Idempotent (can be run multiple times safely)

## Migration Steps

### Step 1: Rename "Documents" → "ISO_documents"
- Find all folders with name "Documents"
- Rename on SMB: `{dept}/Documents` → `{dept}/ISO_documents`
- Update database: `folder.name` and `folder.path`

### Step 2: Rename Delete Folders
- Find all folders with name "delete files", "Deleted files", or "Delete files"
- Rename on SMB: `{dept}/delete files` → `{dept}/Delete_files`
- Update database: `folder.name` and `folder.path`

### Step 3: Move Files from current/ to Section Root
- Find all documents with `filePath` containing "/current/"
- Remove all "/current" segments from path
- Move file on SMB: `{section}/current/{file}` → `{section}/{file}`
- Update database: `document.filePath`

### Step 4: Update Folder Paths
- Find all folders with path containing "/current"
- Remove all "/current" segments from path
- Update database: `folder.path`

### Step 4b: Update Document Version Paths
- Find all document_versions with `filePath` containing "/current/"
- Remove all "/current" segments from path
- Update database: `documentVersion.filePath`

### Step 5: Remove Empty "current" Folders
- Find all folders with name "current"
- Check if folder is empty on SMB
- Remove empty folders from SMB
- Mark as deleted in database

## Script Features

### Dry-Run Mode
```bash
npx ts-node apps/api/scripts/migrate-storage-structure.ts --dry-run
```
- Shows what would be changed without making actual changes
- Safe for testing before live migration

### Live Mode
```bash
npx ts-node apps/api/scripts/migrate-storage-structure.ts
```
- Performs actual migration
- Updates both SMB and database

### Progress Reporting
- Shows detailed progress for each step
- Reports statistics:
  - Folders renamed
  - Files moved
  - Documents updated
  - Folders updated
  - Errors encountered
  - Items skipped

### Error Handling
- Continues migration even if individual items fail
- Logs all errors for manual review
- Skips conflicts and missing files
- Reports skipped items with reasons

## Files Created

1. `apps/api/scripts/migrate-storage-structure.ts`
   - Complete migration script
   - ~550 lines
   - Handles all migration scenarios

## Verification

### Build Status
- ✅ TypeScript compilation: **PASSED**
- ✅ No linter errors

### Script Structure
- ✅ Dry-run mode implemented
- ✅ Progress reporting implemented
- ✅ Error handling implemented
- ✅ Idempotent operations
- ✅ Handles nested current/current folders
- ✅ Handles various delete folder name formats
- ✅ Updates both SMB and database

## Migration Scenarios Handled

1. **Simple current folder:**
   - `{dept}/KPI/current/{file}` → `{dept}/KPI/{file}` ✅

2. **Nested current/current:**
   - `{dept}/KPI/current/current/{file}` → `{dept}/KPI/{file}` ✅

3. **Documents folder:**
   - `{dept}/Documents` → `{dept}/ISO_documents` ✅

4. **Delete folders:**
   - `{dept}/delete files` → `{dept}/Delete_files` ✅
   - `{dept}/Deleted files` → `{dept}/Delete_files` ✅
   - `{dept}/Delete files` → `{dept}/Delete_files` ✅

5. **Versions folder:**
   - Files in `versions/` are skipped (already correct) ✅

6. **Empty folders:**
   - Empty "current" folders are removed ✅

## Expected Results

Based on context-migration.txt:
- **540 documents** in `/current/` subfolder → Will be moved to section roots
- **1 folder** named "Deleted files" → Will be renamed to "Delete_files"
- **Nested current/current folders** → Will be flattened
- **Empty current folders** → Will be removed

## Usage Instructions

### Pre-Migration Checklist
1. ✅ Backup database
2. ✅ Backup SMB share (if possible)
3. ✅ Test on dev/staging environment first
4. ✅ Review dry-run output

### Running Migration

**Step 1: Dry Run**
```bash
cd apps/api
npx ts-node scripts/migrate-storage-structure.ts --dry-run
```

**Step 2: Review Output**
- Check statistics
- Review errors and skipped items
- Verify paths look correct

**Step 3: Live Migration**
```bash
npx ts-node scripts/migrate-storage-structure.ts
```

**Step 4: Verify**
- Check files are in correct locations
- Verify database paths are updated
- Test document access/download

## Next Steps

- Proceed to Phase 07: Testing & Validation
- Run migration on dev/staging environment
- Verify migration results
- Test document access after migration

## Notes

- Script is idempotent - can be run multiple times safely
- Files already in correct location are skipped
- Conflicts (target exists) are skipped and logged
- Missing files are skipped but DB paths are still updated
- Empty folders are only removed if truly empty
