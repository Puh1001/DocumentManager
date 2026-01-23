# Document Folder Restructure Plan

**Date:** 2026-01-23  
**Status:** In Progress  
**Priority:** High

## Overview

Restructure document storage system to use standardized folder structure per department:
- Each department has 1 root folder (department name/code)
- Inside: 4 subfolders (KPI, Documents, Maintenance, Deleted files)
- Inside KPI/Documents/Maintenance: `current/` and `version/` subfolders
- Deleted files moved to `Deleted files/[department]/`

## Current Structure

```
{department.code}/
├── Tài liệu ISO/
├── KPI/
├── Bảo trì thiết bị/
└── Cải tiến/
```

## New Structure

```
{department.code}/
├── KPI/
│   ├── current/
│   └── version/
├── Documents/
│   ├── current/
│   └── version/
├── Maintenance/
│   ├── current/
│   └── version/
└── Deleted files/
```

## Implementation Tasks

### Phase 1: Update Seed File ✅
- [x] Update `apps/api/prisma/seed.ts`
  - Changed subfolders from `["Tài liệu ISO", "KPI", "Bảo trì thiết bị", "Cải tiến"]` to `["KPI", "Documents", "Maintenance", "Deleted files"]`
  - Created `current/` and `version/` subfolders inside KPI, Documents, Maintenance
  - Updated folder paths accordingly

### Phase 2: Update Version Service ✅
- [x] Update `apps/api/src/modules/storage/services/version.service.ts`
  - Changed `versions/` to `version/` (singular) in path construction
  - Updated all references to version folder path

### Phase 3: Update Deletion Service ✅
- [x] Update `apps/api/src/modules/storage/services/document-deletion.service.ts`
  - Changed delete folder path from `{department.name}/delete files` to `{department.code}/Deleted files`
  - Updated `findOrCreateDeleteFolder()` method
  - Updated test files to use new path

### Phase 4: Update KPI Attachment Service ✅
- [x] Update `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
  - Updated `findOrCreateDepartmentKpiFolder()` to use new structure: `{dept.code}/KPI/current`
  - Updated `findOrCreateDeleteFolder()` to use "Deleted files" instead of "delete files"
  - Updated comments to reflect new structure

### Phase 5: Update Document Service ✅
- [x] Review `apps/api/src/modules/storage/services/document.service.ts`
  - Document service uses version service which handles folder paths correctly
  - No changes needed - uploads go to correct `current/` folders via version service

### Phase 6: Update Sync Services ✅
- [x] Review `apps/api/src/modules/storage/services/folder-sync.service.ts`
  - Sync service uses folder paths from database, no hardcoded paths
  - No changes needed

### Phase 7: Testing ⏳
- [ ] Test folder creation in seed
- [ ] Test document upload to Documents/current
- [ ] Test KPI attachment upload to KPI/current
- [ ] Test version creation in version/ folder
- [ ] Test file deletion to Deleted files/
- [ ] Test folder sync with new structure

## Migration Notes

- Existing files in old structure will need manual migration
- Database folder records will be updated by seed script
- Physical SMB folders need to be created/moved manually or via migration script

## Files to Modify

1. `apps/api/prisma/seed.ts` - Folder structure creation
2. `apps/api/src/modules/storage/services/version.service.ts` - Version folder path
3. `apps/api/src/modules/storage/services/document-deletion.service.ts` - Delete folder path
4. `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - KPI folder structure
5. `apps/api/src/modules/storage/services/document.service.ts` - Upload paths (if needed)
