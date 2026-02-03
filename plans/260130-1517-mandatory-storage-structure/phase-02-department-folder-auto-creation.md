# Phase 02: Department Folder Auto-Creation

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-storage-path-builder.md](phase-01-storage-path-builder.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md)
- Service: `apps/api/src/modules/department/services/department.service.ts`
- Folder Service: `apps/api/src/modules/storage/services/folder.service.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Hook into DepartmentService.create() to automatically create mandatory folder structure when department is created. Update ensureDepartmentFolderStructure() to use new structure (ISO_documents, no "current" subfolders).
- **Implementation status:** Completed
- **Review status:** Pending

## Key Insights
- Currently folders created lazily (on-demand)
- Need to auto-create when department created
- Structure: `[department]/KPI`, `[department]/ISO_documents`, `[department]/Maintenance`, `[department]/Delete_files`
- Each section has `versions/` subfolder
- Files stored directly in section (not in "current")

## Requirements

### Functional
- Auto-create folder structure when department is created
- Create: `[department]/KPI`, `[department]/ISO_documents`, `[department]/Maintenance`, `[department]/Delete_files`
- Create `versions/` subfolder under KPI, ISO_documents, Maintenance
- Do NOT create "current" subfolders
- Handle errors gracefully (don't fail department creation)

### Non-Functional
- Error handling: Log errors but don't fail department creation
- Race condition handling: Handle concurrent folder creation
- Idempotent: Can be called multiple times safely

## Architecture

### Folder Structure

```
[department]/
├── KPI/
│   └── versions/
├── ISO_documents/
│   └── versions/
├── Maintenance/
│   └── versions/
└── Delete_files/
```

### Department Creation Flow

```
DepartmentService.create()
  → Create department record
  → Call FolderService.ensureDepartmentFolderStructure()
    → Create [department] folder
    → Create KPI, ISO_documents, Maintenance, Delete_files folders
    → Create versions/ under KPI, ISO_documents, Maintenance
  → Return department
```

## Related Code Files

### Files to Modify
- `apps/api/src/modules/department/services/department.service.ts` - Inject FolderService, call ensureDepartmentFolderStructure()
- `apps/api/src/modules/department/department.module.ts` - Import StorageModule
- `apps/api/src/modules/storage/services/folder.service.ts` - Update ensureDepartmentFolderStructure() for new structure

## Implementation Steps

1. **Update DepartmentModule**
   - Import StorageModule to access FolderService
   - Ensure FolderService is available

2. **Update DepartmentService**
   - Inject FolderService in constructor
   - Call `ensureDepartmentFolderStructure()` after creating department
   - Wrap in try-catch to handle errors gracefully

3. **Update ensureDepartmentFolderStructure()**
   - Change section names: "Documents" → "ISO_documents"
   - Remove "current" subfolder creation
   - Ensure files stored directly in section folders
   - Keep "versions" subfolder creation

4. **Update Return Type**
   - Update return type to include `isoDocumentsSectionRoot` instead of `documentsSectionRoot`

5. **Error Handling**
   - Log errors but don't fail department creation
   - Allow folder structure to be created later via sync

## Todo List

- [x] Import StorageModule in DepartmentModule
- [x] Inject FolderService into DepartmentService
- [x] Call ensureDepartmentFolderStructure() after department creation
- [x] Add error handling (try-catch, log errors)
- [x] Update ensureDepartmentFolderStructure() section names
- [x] Remove "current" subfolder creation (verified - no current folders created)
- [x] Fix "Delete_files" naming consistency
- [x] Build and type check passed

## Success Criteria

- Folder structure auto-created when department is created
- Structure includes: KPI, ISO_documents, Maintenance, Delete_files
- Each section has versions/ subfolder
- No "current" subfolders created
- Errors handled gracefully (don't fail department creation)
- Idempotent (can be called multiple times)
- Return type updated correctly

## Risk Assessment

### Risks
- SMB unavailable: Folder creation fails
- Race condition: Multiple concurrent folder creations
- Breaking change: Return type change affects callers

### Mitigations
- Error handling: Log but don't fail department creation
- Race condition: Use unique constraint error handling (P2002)
- Return type: Update all callers in same phase
- Test thoroughly before deployment

## Security Considerations

- Folder creation uses existing SMB service (already secured)
- No new security concerns

## Next Steps

- Proceed to Phase 03: Version Service Migration
