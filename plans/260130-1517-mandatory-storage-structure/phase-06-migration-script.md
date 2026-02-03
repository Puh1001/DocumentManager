# Phase 06: Migration Script

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: All previous phases
- Script: `apps/api/scripts/migrate-storage-structure.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Create migration script to move existing files from "current" subfolders to section roots. Rename "Documents" folders to "ISO_documents". Handle version files.
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- Existing files stored in "current" subfolders
- Need to move to section roots
- Need to rename "Documents" → "ISO_documents"
- Need to handle version files (already in versions/)
- Need to update database folder paths

## Requirements

### Functional
- Move files from `{section}/current/` to `{section}/`
- Rename "Documents" folders to "ISO_documents"
- Update database folder paths
- Handle version files (no changes needed)
- Dry-run mode for testing
- Rollback capability

### Non-Functional
- Safe migration (backup before changes)
- Progress reporting
- Error handling and recovery
- Idempotent (can be run multiple times)

## Architecture

### Migration Steps

1. **Backup**
   - Create backup of folder structure
   - Log current state

2. **Rename Sections**
   - Rename "Documents" → "ISO_documents" in database
   - Rename physical folders on SMB

3. **Move Files**
   - For each section (KPI, ISO_documents, Maintenance):
     - Find files in `{section}/current/`
     - Move to `{section}/`
     - Update database document.filePath

4. **Cleanup**
   - Remove empty "current" subfolders
   - Verify migration success

### Migration Script Structure

```typescript
async function migrateStorageStructure(dryRun: boolean = true) {
  // 1. Backup
  // 2. Rename Documents → ISO_documents
  // 3. Move files from current/ to section root
  // 4. Update database paths
  // 5. Cleanup empty current/ folders
  // 6. Verify migration
}
```

## Related Code Files

### Files to Create
- `apps/api/scripts/migrate-storage-structure.ts` - Migration script

### Files to Use
- `apps/api/src/modules/storage/services/smb.service.ts` - File operations
- `apps/api/src/modules/storage/services/folder.service.ts` - Folder operations
- Prisma client - Database updates

## Implementation Steps

1. **Create Migration Script**
   - Setup script structure
   - Add dry-run mode
   - Add progress reporting

2. **Implement Backup**
   - Log current folder structure
   - Create backup of critical data

3. **Implement Rename**
   - Rename "Documents" → "ISO_documents" in database
   - Rename physical folders on SMB

4. **Implement File Movement**
   - Find all files in "current" subfolders
   - Move to section roots
   - Update database document.filePath

5. **Implement Cleanup**
   - Remove empty "current" subfolders
   - Verify migration success

6. **Add Error Handling**
   - Try-catch for each operation
   - Rollback on failure
   - Detailed error logging

7. **Test Migration**
   - Test with dry-run mode
   - Test on dev environment
   - Verify all files moved correctly

## Todo List

- [x] Create migration script file
- [x] Implement rename logic (Documents → ISO_documents)
- [x] Implement rename logic (delete files → Delete_files)
- [x] Implement file movement logic (current/ → section root)
- [x] Implement database path updates (folders and documents)
- [x] Implement document_versions path updates
- [x] Implement cleanup logic (remove empty current folders)
- [x] Add error handling and reporting
- [x] Add progress reporting
- [x] Add dry-run mode
- [x] Build and verify

## Success Criteria

- Migration script moves files correctly
- "Documents" renamed to "ISO_documents"
- Files moved from "current" to section roots
- Database paths updated correctly
- Empty "current" folders removed
- Dry-run mode works correctly
- Error handling and rollback work
- Migration can be run multiple times safely

## Risk Assessment

### Risks
- Data loss during migration
- Path mismatch after migration
- Migration fails partway through

### Mitigations
- Backup before migration
- Dry-run mode for testing
- Rollback capability
- Test on dev environment first
- Verify migration step by step
- Keep backup until verified

## Security Considerations

- Migration script requires admin access
- Backup data securely
- Verify file permissions after migration

## Next Steps

- Proceed to Phase 07: Testing & Validation
