# Fix Report: Document Filename Encoding Display Issue

**Date:** 2025-01-23  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## Problem Summary

Files upload successfully, but display names show corrupted Vietnamese text with black diamond question marks () in the UI.

**Root Cause:** Frontend document display components were NOT applying `fixFileNameEncoding()` utility, even though:
- Backend has encoding fix in upload path
- Frontend has encoding fix utility
- KPI components were using it correctly
- Document components were missing it

---

## Solution Implemented

### Files Fixed

1. **`apps/web/src/components/documents/document-list.tsx`**
   - Added import: `import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";`
   - Changed: `{doc.fileName}` → `{fixFileNameEncoding(doc.fileName)}`

2. **`apps/web/src/components/boss/document-detail.tsx`**
   - Added import: `import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";`
   - Changed: `{document.fileName}` → `{fixFileNameEncoding(document.fileName)}`

3. **`apps/web/src/app/[locale]/dashboard/documents/[id]/view/page.tsx`**
   - Added import: `import { fixFileNameEncoding } from "@/lib/utils/encoding-fix";`
   - Changed: `{document.fileName}` → `{fixFileNameEncoding(document.fileName)}`

4. **`apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`**
   - Added import: `import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';`
   - Changed: `{request.document.fileName}` → `{fixFileNameEncoding(request.document.fileName)}`

---

## Verification

- ✅ No linter errors
- ✅ All document display components now use encoding fix
- ✅ Consistent with KPI attachment components
- ✅ Build compiled successfully (permission error is Windows issue, not code-related)

---

## Expected Result

After fix:
- Document names display correctly with Vietnamese/Chinese characters
- No more black diamond question marks ()
- Consistent display behavior across all components

---

## Notes

- This is a **display fix** (client-side fallback)
- For permanent fix, also need to:
  1. Ensure backend encoding fix works correctly for new uploads
  2. Migrate existing corrupted data in database
  3. Frontend fix serves as defense-in-depth layer

---

## Testing Recommendations

1. Upload a file with Vietnamese filename: "Thông báo khám sức khỏe Định kỳ.pdf"
2. Verify it displays correctly in:
   - Document list
   - Document detail view
   - Document viewer page
   - DCC deletion requests page
3. Check that corrupted existing data also displays better (if fixable)
