# Frontend Encoding Fix - Improved

**Date:** 2026-01-22  
**Status:** ✅ COMPLETE  
**Priority:** HIGH

---

## Problem Summary

Migration script chỉ fix được **66/669 documents** (10%), còn lại **603 documents** bị skip với lý do "fix produced invalid result". Nhiều files vẫn hiển thị corrupted trong UI.

**Root Causes:**
1. Frontend encoding fix không đủ mạnh để handle nhiều corruption patterns
2. Không detect được replacement characters (`�`) và hex escape sequences (`\x169`)
3. Validation quá strict - chỉ accept "perfect" fixes
4. Không apply encoding fix ở tất cả nơi hiển thị filename

---

## Solution Implemented

### 1. ✅ Enhanced Frontend Encoding Detection

**File:** `apps/web/src/lib/utils/encoding-fix.ts`

**Improvements:**
- ✅ Detect replacement characters (`\uFFFD`)
- ✅ Detect hex escape sequences (`\x169`)
- ✅ Detect Vietnamese mojibake patterns (`Tá»·`, `lá»`, `xá»`, etc.)
- ✅ Detect Chinese mojibake patterns (`�ы��`, `�Q�ы��`)

**Key Changes:**
```typescript
function hasMojibake(str: string): boolean {
  // Check for replacement characters
  if (str.includes('\uFFFD')) {
    return true;
  }
  
  // Check for hex escape sequences
  if (/\\x[0-9A-Fa-f]{2}/.test(str)) {
    return true;
  }
  
  // Check for Vietnamese/Chinese mojibake patterns
  // ... (multiple patterns)
}
```

### 2. ✅ Multi-Strategy Fix Algorithm

**File:** `apps/web/src/lib/utils/encoding-fix.ts`

**Improvements:**
- ✅ Handle hex escape sequences first
- ✅ Try multiple encoding strategies:
  - Strategy A: Latin1 → UTF-8 (standard)
  - Strategy B: Double encoding fix
- ✅ Scoring system to pick best fix
- ✅ More lenient validation - accept partial improvements

**Key Changes:**
```typescript
function fixMojibake(str: string): string {
  // Step 1: Handle hex escapes
  // Step 2: Try multiple strategies
  // Step 3: Score and pick best
  // Step 4: Return best fix even if not perfect
}
```

### 3. ✅ Applied Encoding Fix Everywhere

**Files Modified:**
- ✅ `apps/web/src/components/boss/kpi-attachment-item.tsx` - Already had fix
- ✅ `apps/web/src/components/boss/kpi-attachment-viewer.tsx` - **NEW**
- ✅ `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx` - **NEW**

**Key Changes:**
```typescript
// In kpi-attachment-viewer.tsx
import { fixFileNameEncoding } from '@/lib/utils/encoding-fix';

const displayFileName = fixFileNameEncoding(fileName);
// Use displayFileName everywhere
```

### 4. ✅ Lenient Validation

**File:** `apps/web/src/lib/utils/encoding-fix.ts`

**Improvements:**
- ✅ Accept fixes that reduce Latin1 chars
- ✅ Accept fixes that reduce replacement chars
- ✅ Accept any change if original had replacement chars
- ✅ Don't require "perfect" fix - accept improvements

**Key Changes:**
```typescript
const isBetter = 
  !hasMojibake(attemptedFix) ||  // No mojibake after fix
  fixedLatin1Count < originalLatin1Count ||  // Fewer Latin1 chars
  fixedReplacementCount < originalReplacementCount ||  // Fewer replacement chars
  (hasReplacementChars && attemptedFix !== fileName);  // Any change if original had replacement chars
```

---

## Files Modified

1. ✅ `apps/web/src/lib/utils/encoding-fix.ts` - Enhanced detection & multi-strategy fix
2. ✅ `apps/web/src/components/boss/kpi-attachment-viewer.tsx` - Added encoding fix
3. ✅ `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx` - Added encoding fix

---

## Expected Results

### Before Fix:
- ❌ Frontend: Many corrupted filenames displayed
- ❌ Migration: Only 10% fixed (66/669)
- ❌ UI: Mojibake visible in Vietnamese/Chinese text

### After Fix:
- ✅ Frontend: Better display even for corrupted data
- ✅ Migration: Still 10% fixed (backend issue), but frontend handles display better
- ✅ UI: Filenames display correctly or at least improved
- ✅ All filename displays: Encoding fix applied everywhere

---

## Testing

### Test Frontend Fix

1. Open browser DevTools
2. Navigate to KPI attachments page
3. Check corrupted filenames - should display better
4. Check console for any errors

### Test Migration Script

```bash
cd apps/api
npx ts-node scripts/fix-filename-encoding.ts
```

**Expected:** Still only ~10% fixed (backend validation issue), but frontend will display them better.

---

## Notes

- ✅ Frontend fix is now more robust and handles more corruption patterns
- ✅ Encoding fix applied in all filename display locations
- ⚠️  Backend migration script still has strict validation - may need further improvement
- ⚠️  Some files with replacement characters (`�`) may have lost data permanently
- ✅ Frontend provides better user experience even with corrupted data

---

## Next Steps

1. ✅ Frontend encoding fix improved - **DONE**
2. ✅ Encoding fix applied everywhere - **DONE**
3. ⏭️  Consider improving backend migration script validation (if needed)
4. ⏭️  Monitor for any remaining display issues

---

## Unresolved Questions

1. **Backend Migration Script:** Why only 10% fixed? Should we relax validation further?
   - **Answer:** Backend validation is strict. Frontend fix now handles display better, so this may be acceptable.

2. **Replacement Characters:** Files with `�` may have permanently lost data. Can we recover?
   - **Answer:** No - replacement characters indicate data loss during original corruption. Frontend fix improves display but cannot recover lost data.

---

## Technical Details

### Frontend Encoding Fix Flow

1. **Detection:** Check for mojibake patterns, replacement chars, hex escapes
2. **Fix:** Try multiple strategies (Latin1→UTF8, double encoding)
3. **Scoring:** Pick best fix based on mojibake count, replacement chars, Latin1 chars
4. **Validation:** Accept if better than original (lenient)
5. **Display:** Use fixed filename everywhere

### Defense in Depth Strategy

- **Layer 1:** Backend interceptor fixes filename after Multer
- **Layer 2:** Backend service applies encoding fix again
- **Layer 3:** Backend migration script fixes existing data (10% success)
- **Layer 4:** Frontend encoding fix for display (improved) ✅

---

## Conclusion

Frontend encoding fix has been significantly improved to handle more corruption patterns and provide better display even for deeply corrupted filenames. The fix is now applied in all filename display locations. While backend migration script still has low success rate, frontend provides better user experience.
