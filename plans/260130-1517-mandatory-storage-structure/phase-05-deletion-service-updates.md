# Phase 05: Deletion Service Updates

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-storage-path-builder.md](phase-01-storage-path-builder.md), [phase-04-document-service-updates.md](phase-04-document-service-updates.md)
- Service: `apps/api/src/modules/storage/services/document-deletion.service.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Update deletion workflow to move files to Delete_files folder. Ensure files removed from original section and moved to Delete_files.
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- Current deletion moves files to "Deleted files" folder
- Need to ensure uses correct path: `{department}/Delete_files/`
- Files should be removed from original section
- Need to handle section-to-department mapping

## Requirements

### Functional
- Move deleted files to Delete_files folder
- Remove files from original section
- Use correct path: `{department}/Delete_files/{documentId}.ext`
- Handle all sections (KPI, ISO_documents, Maintenance)

### Non-Functional
- No breaking changes to deletion workflow
- Performance: No impact

## Architecture

### Deletion Flow

```
DocumentDeletionService.selfDelete()
  → Get document and folder
  → Derive department from folder path
  → Build Delete_files path: {department}/Delete_files/{documentId}.ext
  → Move file from section to Delete_files
  → Update document status to DELETED
```

### File Movement

**Before:**
- `{department}/{section}/{documentId}.ext`

**After:**
- `{department}/Delete_files/{documentId}.ext`

## Related Code Files

### Files to Review/Modify
- `apps/api/src/modules/storage/services/document-deletion.service.ts` - Update deletion path

## Implementation Steps

1. **Review DocumentDeletionService**
   - Find deletion file movement logic
   - Verify uses correct Delete_files path
   - Ensure removes from original section

2. **Update Delete Files Path**
   - Ensure uses: `{department}/Delete_files/`
   - Verify department derivation from folder path

3. **Test Deletion Flow**
   - Test deletion from KPI section
   - Test deletion from ISO_documents section
   - Test deletion from Maintenance section
   - Verify files moved correctly

4. **Update Tests**
   - Update unit tests for new paths
   - Test deletion with all sections

## Todo List

- [x] Review DocumentDeletionService deletion logic
- [x] Update "Deleted files" to "Delete_files" path
- [x] Verify file movement logic (moves from section to Delete_files)
- [x] Verify files removed from original section (via rename)
- [x] Build and verify

## Success Criteria

- Deleted files moved to Delete_files folder
- Files removed from original section
- Correct path used: `{department}/Delete_files/`
- Works for all sections
- Tests pass
- No breaking changes

## Risk Assessment

### Risks
- Wrong path used for deletion
- Files not removed from original section

### Mitigations
- Verify path building logic
- Test deletion thoroughly
- Verify file movement works correctly

## Security Considerations

- No security changes
- Deletion permissions already enforced

## Next Steps

- Proceed to Phase 06: Migration Script
