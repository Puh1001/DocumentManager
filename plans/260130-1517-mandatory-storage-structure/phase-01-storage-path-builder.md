# Phase 01: Storage Path Builder Update

## Context Links
- Parent: [plan.md](plan.md)
- Research: [researcher-01-report.md](research/researcher-01-report.md)
- File: `apps/api/src/modules/storage/utils/storage-path.util.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High (Foundation for all other phases)
- **Description:** Verify and update StoragePathBuilder to support new structure (files directly in section, not in "current"). Change "Documents" to "ISO_documents".
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- StoragePathBuilder already supports files directly in section root
- `buildCurrentFilePath()` already stores in section root (not "current")
- `buildVersionFilePath()` already stores in versions/ subfolder
- Need to update section name: "Documents" → "ISO_documents"
- Need to verify StorageSection type includes "ISO_documents"

## Requirements

### Functional
- Update StorageSection type to include "ISO_documents" instead of "Documents"
- Verify `buildCurrentFilePath()` stores files directly in section root
- Verify `buildVersionFilePath()` stores versions in versions/ subfolder
- Update all references from "Documents" to "ISO_documents"

### Non-Functional
- Maintain backward compatibility during migration
- Clear documentation of path structure

## Architecture

### New Storage Section Type

```typescript
export type StorageSection =
  | "KPI"
  | "ISO_documents"  // Changed from "Documents"
  | "Maintenance"
  | "Delete_files";
```

### Path Structure

**Current Files:**
- `{department}/{section}/{documentId}.ext` (e.g., `DH/KPI/abc123.pdf`)

**Version Files:**
- `{department}/{section}/versions/{documentId}/v001_timestamp_user.ext`

**Deleted Files:**
- `{department}/Delete_files/{documentId}.ext`

## Related Code Files

### Files to Modify
- `apps/api/src/modules/storage/utils/storage-path.util.ts` - Update StorageSection type

### Files to Review
- `apps/api/src/modules/storage/services/version.service.ts` - Verify uses StoragePathBuilder correctly
- `apps/api/src/modules/storage/services/document.service.ts` - Verify uses StoragePathBuilder correctly

## Implementation Steps

1. **Update StorageSection Type**
   - Change "Documents" → "ISO_documents"
   - Update type definition

2. **Verify buildCurrentFilePath()**
   - Check it builds: `{sectionRoot}/{documentId}.ext`
   - No "current" subfolder in path
   - Test with all sections

3. **Verify buildVersionFilePath()**
   - Check it builds: `{sectionRoot}/versions/{documentId}/vNNN_timestamp_user.ext`
   - Test with all sections

4. **Update deriveSectionRootFromFolderPath()**
   - Ensure it handles "ISO_documents" correctly
   - Strip "/current" if present (backward compatibility)

5. **Search and Replace**
   - Find all references to "Documents" section
   - Replace with "ISO_documents" where appropriate

## Todo List

- [x] Update StorageSection type: "Documents" → "ISO_documents"
- [x] Verify buildCurrentFilePath() stores in section root
- [x] Verify buildVersionFilePath() stores in versions/
- [x] Update deriveSectionRootFromFolderPath() for ISO_documents
- [x] Search codebase for "Documents" section references
- [x] Replace with "ISO_documents" where needed
- [x] Test path building with all sections
- [x] Update documentation/comments

## Success Criteria

- StorageSection type includes "ISO_documents"
- buildCurrentFilePath() stores files directly in section root
- buildVersionFilePath() stores versions in versions/ subfolder
- All "Documents" references updated to "ISO_documents"
- Paths built correctly for all sections
- Backward compatibility maintained

## Risk Assessment

### Risks
- Breaking change: "Documents" → "ISO_documents" affects existing code
- Path mismatch if not updated consistently

### Mitigations
- Update all references in same phase
- Test path building thoroughly
- Maintain backward compatibility in deriveSectionRootFromFolderPath()

## Security Considerations

- Path building doesn't affect security
- Ensure paths are sanitized (already done)

## Next Steps

- Proceed to Phase 02: Department Folder Auto-Creation
