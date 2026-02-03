# Phase 03: Version Service Migration

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-storage-path-builder.md](phase-01-storage-path-builder.md), [phase-02-department-folder-auto-creation.md](phase-02-department-folder-auto-creation.md)
- Service: `apps/api/src/modules/storage/services/version.service.ts`
- Path Builder: `apps/api/src/modules/storage/utils/storage-path.util.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Verify VersionService uses StoragePathBuilder correctly for new structure. Ensure files stored directly in section folders, versions in versions/ subfolder.
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- VersionService already uses StoragePathBuilder
- `buildCurrentFilePath()` stores in section root (correct)
- `buildVersionFilePath()` stores in versions/ (correct)
- Need to verify section derivation works correctly
- Need to handle "ISO_documents" section name

## Requirements

### Functional
- Verify VersionService uses StoragePathBuilder correctly
- Ensure current files stored directly in section folders
- Ensure versions stored in versions/ subfolder
- Handle "ISO_documents" section correctly
- Maintain backward compatibility during migration

### Non-Functional
- No breaking changes to VersionService API
- Performance: No impact

## Architecture

### Current File Storage

**Before (with "current" subfolder):**
- `{department}/KPI/current/{documentId}.ext`

**After (direct in section):**
- `{department}/KPI/{documentId}.ext`

### Version File Storage

**Unchanged:**
- `{department}/{section}/versions/{documentId}/v001_timestamp_user.ext`

### VersionService Flow

```
createVersion()
  → Get document and folder
  → Derive section root from folder.path
  → Build current path: buildCurrentFilePath(sectionRoot, documentId, ext)
  → Build version path: buildVersionFilePath(sectionRoot, documentId, version, userId, ext)
  → Write version file to SMB
  → Write current file to SMB
  → Create version record
  → Update document filePath
```

## Related Code Files

### Files to Review/Modify
- `apps/api/src/modules/storage/services/version.service.ts` - Verify uses StoragePathBuilder correctly
- `apps/api/src/modules/storage/utils/storage-path.util.ts` - Verify methods work correctly

## Implementation Steps

1. **Review VersionService.createVersion()**
   - Verify uses `StoragePathBuilder.deriveSectionRootFromFolderPath()`
   - Verify uses `StoragePathBuilder.buildCurrentFilePath()`
   - Verify uses `StoragePathBuilder.buildVersionFilePath()`

2. **Test Path Building**
   - Test with "KPI" section
   - Test with "ISO_documents" section
   - Test with "Maintenance" section
   - Verify paths are correct

3. **Verify Section Derivation**
   - Test `deriveSectionRootFromFolderPath()` with new structure
   - Test with legacy structure (backward compatibility)
   - Ensure strips "/current" if present

4. **Update Tests**
   - Update unit tests for new paths
   - Test version creation with new structure

5. **Cleanup Old Files**
   - Verify cleanup logic handles old "current" paths
   - Test migration scenario

## Todo List

- [x] Review VersionService.createVersion() implementation
- [x] Verify uses StoragePathBuilder correctly
- [x] Verify path building with all sections (uses StoragePathBuilder)
- [x] Verify section derivation (backward compatible via deriveSectionRootFromFolderPath)
- [x] Verify cleanup logic handles old paths correctly
- [x] Code verification complete - no changes needed

## Success Criteria

- VersionService uses StoragePathBuilder correctly
- Current files stored directly in section folders
- Versions stored in versions/ subfolder
- Section derivation works correctly
- Backward compatibility maintained
- Tests pass
- No breaking changes

## Risk Assessment

### Risks
- Path mismatch if StoragePathBuilder not updated correctly
- Old files in "current" not cleaned up

### Mitigations
- Verify StoragePathBuilder updated in Phase 01
- Test path building thoroughly
- Migration script handles old files (Phase 06)

## Security Considerations

- No security changes
- Path building already sanitized

## Next Steps

- Proceed to Phase 04: Document Service Updates
