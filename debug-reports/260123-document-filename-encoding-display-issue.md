# Debug Report: Document Filename Encoding Display Issue

**Date:** 2025-01-23  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## Problem Summary

Files upload successfully to folder, but display names are corrupted with mojibake (black diamond question marks) in the UI.

**User Report:**
> "upload thành công vào thư mục nhưng tên hiển thị lại bị lỗi"

**Visual Evidence:**
- Image 1: Document list shows corrupted Vietnamese text: "BPVN. Thong boo khom soc khoe nh k" with black diamonds
- Image 2: Physical file on SMB uses UUID correctly: `75b1fb34-2ec1-43f0-91d3-0309ae3857f7.pdf`

---

## Root Cause Analysis

### Phase 1: Investigation

**Observation:**
- KPI attachment components display correctly (using `fixFileNameEncoding()`)
- Document list components display corrupted (NOT using `fixFileNameEncoding()`)

**Evidence:**

1. **KPI Components (WORKING):**
   ```typescript
   // apps/web/src/components/boss/kpi-attachment-item.tsx:73
   const displayFileName = fixFileNameEncoding(attachment.fileName);
   ```

2. **Document Components (BROKEN):**
   ```typescript
   // apps/web/src/components/documents/document-list.tsx:86
   {doc.fileName}  // ❌ NOT using fixFileNameEncoding()
   
   // apps/web/src/components/boss/document-detail.tsx:133
   {document.fileName}  // ❌ NOT using fixFileNameEncoding()
   
   // apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx:119
   {document.fileName}  // ❌ NOT using fixFileNameEncoding()
   ```

### Phase 2: Root Cause

**Root Cause:** Frontend document display components are NOT applying encoding fix, even though:
- Backend has `fixFileNameEncoding()` in upload path
- Frontend has `fixFileNameEncoding()` utility
- KPI components are using it correctly
- Document components are missing it

**Why it happens:**
1. Backend may save corrupted fileName to DB (if encoding fix fails or data already corrupted)
2. OR: Data in DB is already corrupted from before encoding fix was implemented
3. Frontend document components don't apply client-side fix
4. Result: Corrupted text displayed to users

---

## Fix Plan

### Solution: Apply Encoding Fix to All Document Display Components

**Files to Fix:**
1. `apps/web/src/components/documents/document-list.tsx`
2. `apps/web/src/components/boss/document-detail.tsx`
3. `apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx`
4. Any other components displaying `document.fileName` or `doc.fileName`

**Change Pattern:**
```typescript
// BEFORE:
{doc.fileName}

// AFTER:
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';
{fixFileNameEncoding(doc.fileName)}
```

---

## Implementation

### Step 1: Fix document-list.tsx
- Import `fixFileNameEncoding`
- Apply to `doc.fileName` display

### Step 2: Fix document-detail.tsx
- Import `fixFileNameEncoding`
- Apply to `document.fileName` display

### Step 3: Fix document view page
- Import `fixFileNameEncoding`
- Apply to `document.fileName` display

### Step 4: Verify
- Check all document display locations
- Ensure consistent encoding fix application

---

## Expected Result

After fix:
- Document names display correctly with Vietnamese/Chinese characters
- Consistent with KPI attachment display behavior
- Fallback encoding fix handles corrupted data from DB

---

## Implementation Status

✅ **FIXED** - All document display components now use `fixFileNameEncoding()`

**Files Fixed:**
1. ✅ `apps/web/src/components/documents/document-list.tsx`
2. ✅ `apps/web/src/components/boss/document-detail.tsx`
3. ✅ `apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx`
4. ✅ `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`

**Verification:**
- ✅ No linter errors
- ✅ Build compiled successfully
- ✅ All document display locations now use encoding fix

## Notes

- This is a **display fix** (client-side fallback)
- For permanent fix, also need to:
  1. Ensure backend encoding fix works correctly for new uploads
  2. Migrate existing corrupted data in database
  3. Frontend fix serves as defense-in-depth layer
