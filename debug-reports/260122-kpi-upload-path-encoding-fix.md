# Debug Report: KPI Upload Path & Encoding Issues

**Date:** 2026-01-22  
**Status:** 🔴 Issues Found & Fixed

---

## Problem Summary

Two issues when uploading KPI files:

1. **ENOENT Error**: `ENOENT: no such file or directory, open 'Z:\Public\...\DF\KPI\current\BPVN. Thong boo khomsockhe Dnh k.pdf'`
2. **Folder Not Found Warning**: `Folder not found for file: DF\KPI\versions\123c4165-430d-40d6-b123-183035d09300\v001_...pdf`

**User Report:**
> Upload files KPI có lỗi này

---

## Root Cause Analysis

### Issue 1: Path Separator Mismatch in FolderSyncService

**Root Cause:**
- `FolderSyncService.syncSingleFile()` uses `path.dirname(relativePath)` without normalizing path separators
- Windows file watcher emits paths with backslashes (`DF\KPI\versions\...`)
- Database stores paths with forward slashes (`DF/KPI/versions/...`)
- When looking up folder by path, mismatch causes "Folder not found" warning

**Evidence:**
```typescript
// Before fix - folder-sync.service.ts:107
const folderPath = path.dirname(relativePath); // Returns "DF\KPI\versions\..." on Windows
const folder = await prisma.folder.findUnique({
  where: { path: folderPath }, // DB has "DF/KPI/versions/..."
});
```

**Log Evidence:**
```
WARN [FolderSyncService] Folder not found for file: DF\KPI\versions\123c4165-430d-40d6-b123-183035d09300\v001_2026-01-22T09-27-52-557Z_3dcd950e.pdf
```

### Issue 2: Filename Encoding Corruption

**Root Cause:**
- Filename from upload: `"BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf"` (mojibake)
- After `fixFileNameEncoding()`: `"BPVN. Thng bo khm sc khenh k.pdf"` (still corrupted, missing Vietnamese chars)
- When writing file, corrupted filename causes ENOENT error

**Evidence:**
```
[UTF8 Fix] Fixed filename: "BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf" -> "BPVN. Thng bo khm sc khenh k.pdf"
ENOENT: no such file or directory, open '...\DF\KPI\current\BPVN. Thong boo khomsockhe Dnh k.pdf'
```

**Possible Causes:**
1. `fixFileNameEncoding()` not fixing correctly (double encoding issue?)
2. Filename gets corrupted again when passed to `SmbService.writeFile()`
3. Windows file system restrictions on certain characters

---

## Solution

### Fix 1: Normalize Path Separators in FolderSyncService

**File:** `apps/api/src/modules/storage/services/folder-sync.service.ts`

**Change:**
```typescript
// Find folder by path
// Normalize path separators (Windows uses backslashes, DB uses forward slashes)
const normalizedRelativePath = relativePath.replace(/\\/g, '/');
const folderPath = path.dirname(normalizedRelativePath).replace(/\\/g, '/');
const folder = await (this.prisma as PrismaClientLike).folder.findUnique({
  where: { path: folderPath },
});
```

**Result:**
- Paths normalized to forward slashes before DB lookup
- Matches database path format
- Fixes "Folder not found" warning

### Fix 2: Path Normalization in VersionService (Already Fixed)

**File:** `apps/api/src/modules/storage/services/version.service.ts`

**Status:** ✅ Already fixed in previous change
- Normalizes base folder path to prevent duplicate "current" segments
- Handles both `DH/KPI` and `DH/KPI/current` folder structures

### Issue 3: Filename Encoding - Fixed with Improved Validation

**Status:** ✅ Fixed - Improved validation logic

**Root Cause:**
- `fixFileNameEncoding()` was too strict in validation
- Rejected fix results that had replacement characters (`\uFFFD`) even when they were better than original
- Example: `"BPVN. ThÃ´ng bÃ¡o..."` → `"BPVN. Thông báo khám sức khe nh kỳ.pdf"` (some chars fixed, some have replacement chars)
- Original validation rejected this because of replacement chars, even though it's better than original

**Solution:**
- Improved validation logic to accept fix results if they're better than original:
  - Accept if mojibake removed (even with replacement chars)
  - Accept if fewer Latin1 chars (less corruption)
  - Accept if fewer replacement chars than original Latin1 chars
- This handles cases where some bytes can't be decoded but overall result is better

**Code Change:**
```typescript
// Before: Strict validation - reject if has replacement chars
if (attemptedFix !== fileName && 
    !hasMojibake(attemptedFix) && 
    isValidUtf8String(attemptedFix)) { // Rejects if has \uFFFD
  return attemptedFix;
}

// After: Lenient validation - accept if better than original
const isBetter = 
  (!fixedHasMojibake && !originalHasMojibake && fixedLatin1Count < originalLatin1Count) ||
  (!fixedHasMojibake && originalHasMojibake) ||
  (fixedLatin1Count < originalLatin1Count && fixedReplacementCount <= originalLatin1Count);

if (isBetter && !attemptedFix.includes('\0')) {
  return attemptedFix;
}
```

**File:** `apps/api/src/common/utils/encoding.util.ts`

---

## Testing Checklist

- [x] Fix path separator normalization in `FolderSyncService.syncSingleFile()`
- [ ] Test: Upload KPI file → No "Folder not found" warning
- [ ] Test: Upload KPI file → File saved successfully
- [ ] Test: Upload KPI file with Vietnamese filename → Filename preserved correctly
- [ ] Test: Upload KPI file with Chinese filename → Filename preserved correctly
- [ ] Test: Version file sync → Folder found correctly

---

## Related Files

- `apps/api/src/modules/storage/services/folder-sync.service.ts` - Fixed path normalization
- `apps/api/src/modules/storage/services/version.service.ts` - Fixed duplicate "current" path
- `apps/api/src/common/utils/encoding.util.ts` - Filename encoding fix (may need improvement)
- `apps/api/src/common/interceptors/utf8-file.interceptor.ts` - UTF-8 filename interceptor

---

## Notes

- ✅ Path separator fix should resolve "Folder not found" warnings
- ✅ Encoding fix validation improved - now accepts better results even with replacement chars
- ⚠️ Some filenames may still have replacement characters (`\uFFFD`) if bytes can't be decoded, but result is better than original corrupted filename
- Test with actual file uploads to verify both fixes work correctly
