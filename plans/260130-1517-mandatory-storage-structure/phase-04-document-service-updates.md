# Phase 04: Document Service Updates

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-storage-path-builder.md](phase-01-storage-path-builder.md), [phase-03-version-service-migration.md](phase-03-version-service-migration.md)
- Service: `apps/api/src/modules/storage/services/document.service.ts`
- Controller: `apps/api/src/modules/storage/controllers/document.controller.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Update DocumentService to use new structure. Ensure uploads go to correct section (ISO_documents). Handle file display (ID-based storage, text filename display).
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- DocumentService uses VersionService for file storage
- Files stored with ID-based names on SMB
- Display uses text filename from DB (already implemented)
- Need to ensure uploads go to ISO_documents section
- Need to handle section selection/folder mapping

## Requirements

### Functional
- Ensure uploads go to ISO_documents section (or correct section based on folder)
- Files stored with ID-based names on SMB
- Display uses text filename from DB
- Handle folder-to-section mapping correctly

### Non-Functional
- No breaking changes to DocumentService API
- Performance: No impact

## Architecture

### Upload Flow

```
DocumentController.upload()
  → DocumentService.upload()
    → Validate folder
    → Create document record
    → VersionService.createVersion()
      → Uses StoragePathBuilder
      → Stores in section root (not "current")
    → Update document.filePath
```

### File Display

**Storage (SMB):**
- `{department}/{section}/{documentId}.ext`

**Display (UI):**
- Uses `document.fileName` from database (text filename)

### Section Mapping

**Folder Path → Section:**
- `{department}/KPI` → KPI section
- `{department}/ISO_documents` → ISO_documents section
- `{department}/Maintenance` → Maintenance section

## Related Code Files

### Files to Review/Modify
- `apps/api/src/modules/storage/services/document.service.ts` - Verify upload flow
- `apps/api/src/modules/storage/controllers/document.controller.ts` - Verify upload endpoint

## Implementation Steps

1. **Review DocumentService.upload()**
   - Verify uses VersionService correctly
   - Verify folder-to-section mapping
   - Ensure files stored in correct section

2. **Verify File Display**
   - Files stored with ID-based names (already done)
   - Display uses text filename from DB (already done)
   - No changes needed

3. **Update Folder Selection**
   - Ensure folder picker shows ISO_documents folders
   - Update folder creation to use ISO_documents

4. **Test Upload Flow**
   - Test upload to KPI section
   - Test upload to ISO_documents section
   - Test upload to Maintenance section
   - Verify files stored correctly

5. **Update Tests**
   - Update unit tests for new structure
   - Test upload with all sections

## Todo List

- [x] Review DocumentService.upload() implementation
- [x] Verify uses VersionService correctly
- [x] Verify folder-to-section mapping (via VersionService → StoragePathBuilder)
- [x] Verify file display (ID storage, text display) - already implemented
- [x] Code verification complete - no changes needed

## Success Criteria

- Uploads go to correct section (ISO_documents, KPI, Maintenance)
- Files stored with ID-based names on SMB
- Display uses text filename from DB
- Folder-to-section mapping works correctly
- Tests pass
- No breaking changes

## Risk Assessment

### Risks
- Wrong section selected for uploads
- File display issues

### Mitigations
- Verify folder-to-section mapping
- Test upload flow thoroughly
- Verify file display already works (no changes needed)

## Security Considerations

- No security changes
- Upload validation already in place

## Next Steps

- Proceed to Phase 05: Deletion Service Updates
