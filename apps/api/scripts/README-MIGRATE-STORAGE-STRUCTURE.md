# Migration Script: Storage Structure

## Overview

Migration script to migrate existing storage structure to mandatory format:

- Rename "Documents" → "ISO_documents"
- Rename "delete files"/"Deleted files" → "Delete_files"
- Move files from `{section}/current/` to `{section}/`
- Handle nested `current/current` folders
- Update database paths (folders, documents, document_versions)
- Remove empty "current" folders

## SMB-only migration script

Use **`migrate-storage-structure-smb-only.ts`** when the **database was already migrated** (paths updated) but the **SMB share still has the old folder names** (Documents, delete files, current). This script only changes the filesystem; it does not touch the database.

**Steps performed:**

1. Rename "Documents" → "ISO_documents"
2. Rename "delete files"/"Deleted files"/"Delete files" → "Delete_files"
3. Move contents of "current" to parent (files and merge versions into parent/versions); handle nested current/current
4. Remove empty "current" folders
5. Unify "version" (singular) → "versions": rename if no sibling "versions", else merge version subdirs into existing "versions"
6. Ensure each department has 4 section folders: KPI, ISO_documents, Maintenance, Delete_files (create empty if missing)

**Run:**

```bash
cd apps/api
npx ts-node scripts/migrate-storage-structure-smb-only.ts --dry-run   # preview
npx ts-node scripts/migrate-storage-structure-smb-only.ts             # apply
npx ts-node scripts/migrate-storage-structure-smb-only.ts --overwrite # replace existing files when dest exists (e.g. duplicate in current vs section root)
```

If "Files moved: 0" but log shows "Moving: ..." — destination already exists (duplicate). Use `--overwrite` to replace dest with source and remove the duplicate under `current`.

Uses the same `.env` SMB settings (e.g. `SMB_USE_MOUNTED_DRIVE=true`, `SMB_MOUNTED_DRIVE=Z:`). See Prerequisites below for path configuration.

---

## Prerequisites

1. **Backup Database**

   ```bash
   # PostgreSQL backup
   pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Backup SMB Share** (if possible)
   - Copy critical folders before migration

3. **Environment Variables**
   - `SMB_SERVER` - SMB server address (default: 10.0.60.30)
   - `SMB_SHARE` - SMB share name (default: Public)
   - `SMB_BASE_PATH` - Base path on share (default: IT-Information Technology Dept\devTest)
   - `SMB_USE_MOUNTED_DRIVE` - Use mounted drive (default: false)
   - `SMB_MOUNTED_DRIVE` - Mounted drive letter (default: Z:)
   - `SMB_MOUNT_PATH` - Linux mount path (default: /shared)

   **If `tree` on SMB shows no change (still "delete files", "current", etc.):**
   1. Script loads `.env` from `apps/api/.env` when run via `npx ts-node scripts/...` (so set SMB\_\* there).
   2. Run with **mounted drive (Z:)** so the script uses the same path as your `tree`. Map share to Z: (e.g. `net use Z: \\10.0.60.30\Public\IT-Information Technology Dept\devTest`).
   3. In `.env`: `SMB_USE_MOUNTED_DRIVE=true`, `SMB_MOUNTED_DRIVE=Z:`. If Z: root = devTest (first level is AC, BOC_SOI...), set `SMB_SHARE=` and `SMB_BASE_PATH=` (empty) so base = Z:\.
   4. If DB was already updated (Step 4 ran), restore DB from backup first so Step 2/3 find folders/documents to rename/move.

## Usage

### Step 1: Dry Run (Recommended)

Run migration in dry-run mode to see what would be changed:

```bash
cd apps/api
npx ts-node scripts/migrate-storage-structure.ts --dry-run
```

**What to check:**

- Review statistics (folders renamed, files moved, etc.)
- Check errors and skipped items
- Verify paths look correct
- Ensure no unexpected changes

### Step 2: Review Output

Check the dry-run output:

- **Folders renamed:** Number of folders that will be renamed
- **Files moved:** Number of files that will be moved
- **Documents updated:** Number of document records that will be updated
- **Folders updated:** Number of folder records that will be updated
- **Errors:** Any errors encountered (review these carefully)
- **Skipped:** Items skipped with reasons

### Step 3: Live Migration

If dry-run looks good, run live migration:

```bash
npx ts-node scripts/migrate-storage-structure.ts
```

**Note:** This will make actual changes to both SMB share and database.

### Step 4: Verify Migration

After migration, verify:

1. **Check Files on SMB:**
   - Files should be in `{dept}/{section}/` (not in `current/` subfolder)
   - Folders should be named "ISO_documents" (not "Documents")
   - Delete folders should be named "Delete_files"

2. **Check Database:**

   ```sql
   -- Check documents in current folders (should be 0)
   SELECT COUNT(*) FROM documents WHERE file_path LIKE '%/current/%';

   -- Check folders named "Documents" (should be 0)
   SELECT COUNT(*) FROM folders WHERE name = 'Documents' AND deleted_at IS NULL;

   -- Check delete folders (should all be "Delete_files")
   SELECT name, COUNT(*) FROM folders
   WHERE name LIKE '%Delete%' AND deleted_at IS NULL
   GROUP BY name;
   ```

3. **Test Document Access:**
   - Try downloading documents
   - Verify file paths are correct
   - Check document versions

## Migration Steps

The script performs these steps in order:

1. **Rename "Documents" → "ISO_documents"**
   - Finds all folders named "Documents"
   - Renames on SMB and updates database

2. **Rename Delete Folders**
   - Finds folders named "delete files", "Deleted files", or "Delete files"
   - Renames to "Delete_files" on SMB and updates database

3. **Move Files from current/ to Section Root**
   - Finds all documents in `/current/` subfolders
   - Moves files on SMB and updates database paths
   - Handles nested `current/current` folders

4. **Update Folder Paths**
   - Removes `/current` segments from folder paths in database

5. **Update Document Version Paths**
   - Removes `/current` segments from document version paths in database

6. **Remove Empty "current" Folders**
   - Finds empty "current" folders
   - Removes from SMB and marks as deleted in database

## Error Handling

The script handles errors gracefully:

- **Missing Files/Folders:** Skipped, but DB paths are still updated
- **Conflicts:** Target already exists - skipped and logged
- **Errors:** Logged but migration continues
- **Empty Folders:** Only removed if truly empty

All errors and skipped items are reported in the summary.

## Rollback

If migration fails or needs to be rolled back:

1. **Restore Database Backup:**

   ```bash
   psql -U username -d database_name < backup_file.sql
   ```

2. **Restore SMB Files:**
   - Restore from backup if available
   - Or manually move files back

3. **Note:** The script is idempotent - running it again should be safe, but always have backups.

## Troubleshooting

### Files Not Found on SMB

- Check SMB connection and permissions
- Verify SMB_BASE_PATH is correct
- Check if files exist on SMB share

### Permission Errors

- Ensure script has write access to SMB share
- Check database user has UPDATE permissions
- Verify SMB share is mounted correctly

### Path Mismatches

- Review skipped items in output
- Check if paths are correct in database
- Verify folder structure matches expected format

### Tree on SMB Has Not Changed (Step 1–3 reported 0)

- DB was updated (Step 4/4b) but SMB was not (rename/move = 0). Common cause: script used UNC path and renames/moves failed or path differs from your mapped drive.
- **Fix:** Use mounted drive so script and `tree` see the same path:
  1. Map share to Z: (same as where you run `tree /f`).
  2. Set in `.env`: `SMB_USE_MOUNTED_DRIVE=true`, `SMB_MOUNTED_DRIVE=Z:`, `SMB_SHARE=`, `SMB_BASE_PATH=`.
  3. If DB already has updated folder paths/names, restore DB from backup (so Step 2/3 find "Deleted files" and documents in "current" again).
  4. Run migration again: `npx ts-node scripts/migrate-storage-structure.ts`.

## Support

If you encounter issues:

1. Check error messages in output
2. Review skipped items
3. Verify SMB connection and permissions
4. Check database logs
5. Review migration script logs

## Notes

- Script is **idempotent** - can be run multiple times safely
- Files already in correct location are skipped
- Dry-run mode is recommended before live migration
- Always backup before running live migration
- Test on dev/staging environment first
