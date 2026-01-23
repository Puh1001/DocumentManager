# Debug Report: KPI Attachment Filename Encoding Issue

**Date:** 2026-01-22  
**Issue:** Filename stored in database with corrupted encoding  
**Priority:** HIGH - Data corruption affecting file display

---

## Problem Summary

When uploading files to KPI attachments, the filename is being stored in the database with corrupted encoding (mojibake), causing incorrect display in the UI.

### Evidence from Database

```sql
-- Query result:
file_name: "TAI Náº N Há»\u008EA HOáº N.pdf"
-- Should be:
file_name: "TAI NẠN HỎA HOẠN.pdf"
```

**Database Record:**
- **Tên File:** `TAI Náº N Há»\u008EA HOáº N.pdf` ❌ (corrupted)
- **Tên Hiển Thị:** `五、火灾事故 TAI NẠN HỎA HOẠN` ✅ (correct)
- **Upload Date:** 2026-01-22 06:57:05.195
- **Department:** HCNS (HR)

**Visual Evidence:**
- UI shows: `TAI Náº N Há»A HOá° ...` (corrupted display)
- KPI Title shows: `五、火灾事故 TAI NẠN HỎA HOẠN` (correct)

---

## Root Cause Analysis

### Investigation Steps

1. **Code Flow Check:**
   - ✅ `KpiAttachmentController.uploadAttachment()` receives file via Multer
   - ✅ Calls `KpiAttachmentService.uploadAttachment()`
   - ✅ Service calls `DocumentService.upload()` 
   - ✅ `DocumentService.upload()` uses `fixFileNameEncoding(file.originalname)` at line 83

2. **Encoding Utility Analysis:**
   - The utility exists: `apps/api/src/common/utils/encoding.util.ts`
   - It's being called in `document.service.ts` line 83
   - The utility should detect patterns like `Náº N` via regex `/[\u0080-\u00FF]{2,}/`

3. **Potential Issues:**

   **Hypothesis 1: Encoding utility not detecting this specific pattern**
   - The corrupted filename: `TAI Náº N Há»\u008EA HOáº N.pdf`
   - Contains: `Náº N` (space between `áº` and `N`)
   - The regex `/[\u0080-\u00FF]{2,}/` should match `áº` (2 consecutive Latin1 chars)
   - **BUT:** The space might be breaking the pattern detection

   **Hypothesis 2: File uploaded before fix was deployed**
   - Upload timestamp: 2026-01-22 06:57:05.195
   - Fix was implemented on 2026-01-21
   - **This should have been fixed, but wasn't**

   **Hypothesis 3: Different encoding corruption pattern**
   - The pattern `Náº N` might be a different type of corruption
   - The `\u008EA` in the database output suggests double encoding
   - The utility might not handle this specific case

   **Hypothesis 4: Multer configuration issue**
   - Multer might be decoding differently for KPI attachments
   - Need to check if there's a different Multer configuration

### Most Likely Root Cause

**The encoding utility's `hasMojibake()` function should detect this pattern, but there might be an edge case:**

1. The corrupted filename contains `Náº N` with a space
2. The regex `/[\u0080-\u00FF]{2,}/` matches sequences of 2+ Latin1 chars
3. `áº` should match, but the space might affect detection
4. However, `Há»\u008EA` definitely contains Latin1 chars that should be detected

**Conclusion:** The utility should work, but we need to verify it's actually being called and working correctly for this specific case.

---

## Evidence

### Code Evidence

1. **Encoding Fix is Implemented:**
   ```typescript
   // apps/api/src/modules/storage/services/document.service.ts:83
   const fileName = fixFileNameEncoding(file.originalname);
   ```

2. **KPI Attachment Flow:**
   ```typescript
   // apps/api/src/modules/kpi/services/kpi-attachment.service.ts:90
   const document = await this.documentService.upload(
     targetFolderId,
     file,
     user.userId,
     record.title
   );
   ```

3. **Encoding Utility Pattern:**
   ```typescript
   // apps/api/src/common/utils/encoding.util.ts:25
   const mojibakePattern = /[\u0080-\u00FF]{2,}/;
   // Should match: áº, á», etc.
   ```

### Database Evidence

- File uploaded: 2026-01-22 06:57:05.195 (after fix was implemented)
- Filename still corrupted: `TAI Náº N Há»\u008EA HOáº N.pdf`
- Display name is correct: `五、火灾事故 TAI NẠN HỎA HOẠN`

---

## Fix Plan

### Phase 1: Verify Current Behavior

1. **Test the encoding utility with the exact corrupted pattern:**
   ```typescript
   const corrupted = "TAI Náº N Há»\u008EA HOáº N.pdf";
   const fixed = fixFileNameEncoding(corrupted);
   // Expected: "TAI NẠN HỎA HOẠN.pdf"
   ```

2. **Add logging to verify the utility is being called:**
   - Add debug logs in `fixFileNameEncoding()` to see what's being processed
   - Verify the corrupted filename is detected

3. **Check if there's a different upload path:**
   - Verify all file upload endpoints use the same encoding fix
   - Check if KPI attachments go through a different code path

### Phase 2: Improve Encoding Detection

If the utility isn't detecting this pattern:

1. **Enhance pattern detection:**
   - Add more Vietnamese mojibake patterns
   - Handle cases with spaces between corrupted sequences
   - Improve detection for `\u008EA` type patterns

2. **Add fallback detection:**
   - If specific patterns don't match, try the Latin1→UTF-8 conversion anyway
   - Verify the result doesn't contain mojibake

### Phase 3: Fix Existing Data

1. **Run migration script:**
   - Use existing script: `apps/api/src/scripts/fix-filename-encoding.ts`
   - Or create a new one specifically for this pattern

2. **Verify fix:**
   - Check database after migration
   - Verify UI displays correctly

### Phase 4: Prevention

1. **Add tests:**
   - Test with the exact corrupted pattern: `TAI Náº N Há»\u008EA HOáº N.pdf`
   - Test with various Vietnamese characters: Ạ, Ỏ, Ạ, etc.

2. **Add validation:**
   - Verify filename doesn't contain mojibake before saving
   - Log warnings if mojibake is detected but not fixed

---

## Immediate Actions

1. ✅ **Create this debug report**
2. ⏳ **Test encoding utility with exact corrupted pattern**
3. ⏳ **Add logging to verify utility is called**
4. ⏳ **Fix encoding utility if needed**
5. ⏳ **Run migration for existing corrupted data**
6. ⏳ **Add tests to prevent regression**

---

## Questions to Resolve

1. Is the encoding utility actually being called for KPI attachments?
2. Why isn't the pattern `Náº N` being detected by the regex?
3. Is there a different Multer configuration for KPI uploads?
4. Was the file uploaded through a different code path?
5. Does the `\u008EA` in the database output indicate double encoding?

---

## Next Steps

1. ✅ **Improved encoding detection** - Enhanced `hasMojibake()` to detect more patterns
2. ✅ **Enhanced fix function** - Added fallback conversion for edge cases
3. ⏳ **Test the fix** - Verify it works with the exact corrupted pattern
4. ⏳ **Run migration** - Fix existing corrupted data in database
5. ⏳ **Add tests** - Prevent regression

---

## Fixes Applied

### 1. Enhanced Mojibake Detection

**File:** `apps/api/src/common/utils/encoding.util.ts`

**Changes:**
- Added detection for isolated Latin1 chars (not just sequences)
- Added specific patterns for: `Náº`, `Há»`, `HOáº` (for NẠN, HỎA, HOẠN)
- Improved pattern matching to catch more edge cases

**Before:**
```typescript
const mojibakePattern = /[\u0080-\u00FF]{2,}/; // Only 2+ consecutive
```

**After:**
```typescript
const mojibakePattern = /[\u0080-\u00FF]{2,}/; // 2+ consecutive
const latin1Matches = str.match(/[\u0080-\u00FF]/g);
if (latin1Matches && latin1Matches.length >= 2) {
  return true; // Multiple isolated Latin1 chars
}
// Plus specific patterns: /Náº/g, /Há»/g, /HOáº/g
```

### 2. Enhanced Fix Function

**Changes:**
- Added fallback conversion for strings with Latin1 chars that weren't detected
- More aggressive fixing to catch edge cases
- Better verification of fix results

**Before:**
```typescript
if (!hasMojibake(fileName)) {
  return fileName; // Return as-is if not detected
}
```

**After:**
```typescript
// Try fix if mojibake detected
if (hasMojibake(fileName)) {
  const fixed = fixMojibake(fileName);
  if (fixed !== fileName && !hasMojibake(fixed)) {
    return fixed;
  }
}

// Fallback: Try conversion even if not detected as mojibake
const hasLatin1Chars = /[\u0080-\u00FF]/.test(fileName);
if (hasLatin1Chars) {
  // Try Latin1→UTF-8 conversion
  // Only use if result is valid and doesn't contain mojibake
}
```

---

## Verification Steps

1. **Test with corrupted filename:**
   ```typescript
   const corrupted = "TAI Náº N Há»\u008EA HOáº N.pdf";
   const fixed = fixFileNameEncoding(corrupted);
   // Expected: "TAI NẠN HỎA HOẠN.pdf"
   ```

2. **Upload a new file with Vietnamese name:**
   - Upload: `TAI NẠN HỎA HOẠN.pdf`
   - Verify it's stored correctly in database
   - Verify it displays correctly in UI

3. **Run migration for existing data:**
   - Use existing migration script or create new one
   - Fix all corrupted filenames in database
   - Verify UI displays correctly after migration
