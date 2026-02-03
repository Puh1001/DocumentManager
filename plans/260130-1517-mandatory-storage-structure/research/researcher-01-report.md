# Researcher 01 Report: Current Storage Structure Analysis

**Date:** 2026-01-30  
**Researcher:** Researcher-01  
**Topic:** Current storage structure and path building logic

## Current Storage Structure

### Physical Layout (SMB)

```
[department]/
├── KPI/
│   ├── current/
│   │   └── {documentId}.ext
│   └── versions/
│       └── {documentId}/
│           └── v001_timestamp_user.ext
├── Documents/
│   ├── current/
│   │   └── {documentId}.ext
│   └── versions/
│       └── {documentId}/
│           └── v001_timestamp_user.ext
├── Maintenance/
│   ├── current/
│   │   └── {documentId}.ext
│   └── versions/
│       └── {documentId}/
│           └── v001_timestamp_user.ext
└── Deleted files/
    └── deleted-file.ext
```

### StoragePathBuilder Logic

**File:** `apps/api/src/modules/storage/utils/storage-path.util.ts`

**Current Methods:**
1. `deriveSectionRootFromFolderPath()` - Strips "/current" to get section root
2. `buildCurrentFilePath()` - Builds path: `{sectionRoot}/{documentId}.ext`
3. `buildVersionFilePath()` - Builds path: `{sectionRoot}/versions/{documentId}/vNNN_timestamp_user.ext`

**Key Insight:** StoragePathBuilder already supports files directly in section root (not in "current"), but current implementation stores files in "current" subfolder.

### Folder Creation Flow

**File:** `apps/api/src/modules/storage/services/folder.service.ts`

**Method:** `ensureDepartmentFolderStructure()`

**Current Behavior:**
- Creates: `[department]/KPI`, `[department]/Documents`, `[department]/Maintenance`, `[department]/Deleted files`
- Creates: `[department]/KPI/versions`, `[department]/Documents/versions`, `[department]/Maintenance/versions`
- Does NOT create "current" subfolders (but code expects them)

**Issue:** Code creates "versions" but files are stored in "current" which is created elsewhere.

### Version Service

**File:** `apps/api/src/modules/storage/services/version.service.ts`

**Method:** `createVersion()`

**Current Behavior:**
- Uses `StoragePathBuilder.buildCurrentFilePath()` → stores in section root
- Uses `StoragePathBuilder.buildVersionFilePath()` → stores in versions/
- But folder structure has "current" subfolder

**Contradiction:** Code stores files in section root, but folder structure has "current" subfolder.

## Required Changes

### 1. StoragePathBuilder
- Already correct: `buildCurrentFilePath()` stores in section root
- Already correct: `buildVersionFilePath()` stores in versions/
- **No changes needed** - already supports new structure

### 2. Folder Structure
- Remove "current" subfolder creation
- Ensure files stored directly in section folders
- Keep "versions" subfolder creation

### 3. Section Names
- Change "Documents" → "ISO_documents"
- Keep "KPI", "Maintenance", "Delete_files"

## Files to Modify

1. `apps/api/src/modules/storage/services/folder.service.ts`
   - Update `ensureDepartmentFolderStructure()` to NOT create "current" subfolders
   - Change "Documents" → "ISO_documents"

2. `apps/api/src/modules/storage/utils/storage-path.util.ts`
   - Verify `buildCurrentFilePath()` works correctly (already does)
   - Verify `buildVersionFilePath()` works correctly (already does)

3. `apps/api/src/modules/storage/services/version.service.ts`
   - Verify uses StoragePathBuilder correctly (already does)

## Unresolved Questions

None - structure is clear.
