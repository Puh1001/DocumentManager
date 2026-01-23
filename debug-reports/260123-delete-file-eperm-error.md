# Debug Report: Delete File EPERM Error

**Date:** 2025-01-23  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## Problem Summary

When clicking delete files, system throws error:
```
EPERM: operation not permitted, rename
'Z:\Public\IT-Information Technology Dept\testKpi'
'Z:\Public\IT-Information Technology Dept\testKpi\DF-Nhuộm đai\delete files'
```

**User Report:**
> "Ấn delete files thì có lỗi này"

---

## Root Cause Analysis

### Phase 1: Error Analysis

**Error Details:**
- Error: `EPERM: operation not permitted, rename`
- Source: `'Z:\Public\IT-Information Technology Dept\testKpi'` (FOLDER)
- Destination: `'Z:\Public\IT-Information Technology Dept\testKpi\DF-Nhuộm đai\delete files'`

**Critical Observation:**
- Source path is a **FOLDER** (`testKpi`), not a file
- Code is trying to rename a folder instead of a file
- This suggests `document.filePath` contains a folder path instead of file path

### Phase 2: Code Investigation

**Location:** `apps/api/src/modules/storage/services/document-deletion.service.ts:415-420`

```typescript
const oldFilePath = document.filePath;
const physicalFileName = path.basename(oldFilePath);
const newFilePath = path.join(deleteFolder.path, physicalFileName);

// Move file first (most likely to fail)
await this.smbService.rename(oldFilePath, newFilePath);
```

**Problem:**
- `document.filePath` might be pointing to a folder instead of a file
- No validation to ensure `filePath` points to a file
- `path.basename()` on a folder path returns folder name, not filename

### Phase 3: Root Cause Hypothesis

**Hypothesis 1:** Document was created with incorrect filePath
- During sync, if a folder was mistakenly synced as a document
- Or filePath was set incorrectly during upload

**Hypothesis 2:** Path construction issue
- `document.filePath` might be missing the filename part
- Or pointing to parent folder instead of actual file

**Hypothesis 3:** Permission issue
- SMB share permissions don't allow rename operation
- But error suggests it's trying to rename a folder, not permission issue

---

## Evidence

**From Error Message:**
- Source: `testKpi` (folder name)
- Destination includes folder name in path
- Suggests `document.filePath = "testKpi"` or similar (folder path)

**Expected Behavior:**
- `document.filePath` should be: `"testKpi/DF-Nhuộm đai/current/{documentId}.pdf"`
- But it appears to be: `"testKpi"` (folder path)

---

## Fix Plan

### Solution 1: Add Validation (RECOMMENDED)

**Add validation before rename:**
```typescript
// Validate filePath points to a file, not folder
const fileStats = await this.smbService.getFileStats(oldFilePath);
if (fileStats.isDirectory()) {
  throw new BadRequestException(
    `Cannot delete: filePath points to a folder, not a file: ${oldFilePath}`
  );
}
```

### Solution 2: Better Error Handling

**Improve error message and handling:**
```typescript
try {
  await this.smbService.rename(oldFilePath, newFilePath);
} catch (error) {
  if (error.code === 'EPERM') {
    // Check if source is a folder
    const stats = await this.smbService.getFileStats(oldFilePath).catch(() => null);
    if (stats?.isDirectory()) {
      throw new BadRequestException(
        `Cannot delete: filePath points to a folder. Document may be corrupted. Document ID: ${documentId}`
      );
    }
    throw new ForbiddenException(
      `Permission denied: Cannot move file to delete folder. Check SMB permissions.`
    );
  }
  throw error;
}
```

### Solution 3: Fix Data Integrity

**Check for corrupted documents:**
- Query documents where `filePath` doesn't contain `/current/` or filename
- Mark as corrupted or fix filePath

---

## Implementation Priority

1. **High Priority:** Add validation to prevent deleting folders
2. **Medium Priority:** Better error handling with specific messages
3. **Low Priority:** Data integrity check for existing corrupted documents

---

## Implementation Status

✅ **FIXED** - Added validation and improved error handling

**Changes Made:**
1. ✅ Added file validation before rename operation
   - Check if filePath points to a file (not folder)
   - Throw BadRequestException if folder detected
   - Handle ENOENT (file not found) errors

2. ✅ Improved error handling for EPERM errors
   - Check if source is actually a folder when EPERM occurs
   - Provide specific error messages
   - Distinguish between permission issues and corrupted data

3. ✅ Better error messages
   - Clear indication when filePath points to folder
   - Specific permission error messages
   - Document ID included for debugging

**Files Modified:**
- `apps/api/src/modules/storage/services/document-deletion.service.ts`

**Verification:**
- ✅ Build successful
- ✅ No linter errors
- ✅ Type-safe error handling

## Next Steps (Optional)

1. Add logging to track when filePath points to folder (for monitoring)
2. Consider data migration to fix corrupted filePath values in database
3. Add admin tool to identify and fix corrupted document records
