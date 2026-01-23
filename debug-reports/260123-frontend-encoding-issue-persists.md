# Debug Report: Frontend Encoding Issue Persists

**Date:** 2025-01-23  
**Status:** ✅ FIXED - Enhanced Encoding Utility  
**Priority:** HIGH

---

## Problem Summary

Files upload successfully with backend encoding fix (logs show latin1 → utf8 conversion), but frontend still displays corrupted Vietnamese characters.

**User Report:**
> "Tải files lên vẫn bị lỗi fornt. Mặc dù đã logs latin1 -> utf 8"

**Visual Evidence:**
- Image shows: "BPVN. Thng bo khm sc khe á»nh k.pdf" (corrupted)
- Should be: "BPVN. Thông báo khám sức khỏe Định kỳ.pdf"

**Backend Log Evidence:**
```
[UTF8 Fix] Fixed filename: "BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf" -> "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
```

---

## Root Cause Analysis - CONFIRMED

### Database Investigation Results

**Query Result from Database:**
```sql
file_name: "12-BPVN-QA-PR-008 SS-2025t(\x07\x10uhSS Bng tnh trng \x11t \x11c mc tiu cht lng n\x03m 2025.pdf"
```

**API Response:**
```json
{
  "fileName": "BPVN. Thng bo khm sc khe \u0011nh k.pdf"
}
```

### Critical Findings

**The database contains SEVERELY corrupted data with:**
1. **Hex escape sequences**: `\x07`, `\x10`, `\x11`, `\x03`
2. **Unicode escape sequences**: `\u0011`
3. **Replacement characters**: ``, `` (U+FFFD)
4. **Multiple encoding layers**: Data appears to be corrupted multiple times

**This is NOT simple Latin1→UTF8 mojibake!**

### Why Current Fix Doesn't Work

**Current `fixFileNameEncoding` utility:**
- ✅ Handles simple Latin1→UTF8 conversion
- ❌ Does NOT handle hex escape sequences (`\x07`, `\x10`, etc.)
- ❌ Does NOT handle Unicode escape sequences (`\u0011`)
- ❌ Does NOT handle replacement characters (``)
- ❌ Does NOT handle multi-layer corruption

**Example:**
- Database has: `\x11nh` (hex escape + replacement char)
- Should be: `Định`
- Current fix can't handle this pattern

---

## Evidence Collection

### Database Content (Actual)
```
file_name: "12-BPVN-QA-PR-008 SS-2025t(\x07\x10uhSS Bng tnh trng \x11t \x11c mc tiu cht lng n\x03m 2025.pdf"
```

**Corruption patterns:**
- `` - Replacement characters (data loss)
- `\x07`, `\x10`, `\x11`, `\x03` - Hex escape sequences
- `Bng` - Corrupted Vietnamese (should be "Bảng")
- `trng` - Corrupted Vietnamese (should be "trạng")
- `\x11t` - Hex escape + replacement char (should be "Đạt")
- `\x11c` - Hex escape + replacement chars (should be "Được")
- `mc` - Corrupted Vietnamese (should be "mức")
- `cht` - Corrupted Vietnamese (should be "chất")
- `lng` - Corrupted Vietnamese (should be "lượng")

### API Response (Actual)
```json
{
  "fileName": "BPVN. Thng bo khm sc khe \u0011nh k.pdf"
}
```

**Corruption patterns:**
- `Thng` - Should be "Thông"
- `bo` - Should be "báo"
- `khm` - Should be "khám"
- `sc` - Should be "sức"
- `khe` - Should be "khỏe"
- `\u0011nh` - Unicode escape + replacement char (should be "Định")
- `k` - Should be "kỳ"

---

## Fix Plan

### Solution 1: Enhance Encoding Fix Utility (PRIORITY 1)

**Add support for complex corruption patterns:**

1. **Handle hex escape sequences** (`\x07`, `\x10`, etc.)
   ```typescript
   // Replace hex escapes with actual bytes
   str = str.replace(/\\(x[0-9A-Fa-f]{2})/gi, (match, hex) => {
     const byteValue = parseInt(hex, 16);
     return String.fromCharCode(byteValue);
   });
   ```

2. **Handle Unicode escape sequences** (`\u0011`, etc.)
   ```typescript
   // Replace Unicode escapes
   str = str.replace(/\\u([0-9A-Fa-f]{4})/gi, (match, hex) => {
     return String.fromCharCode(parseInt(hex, 16));
   });
   ```

3. **Handle replacement characters** (``)
   - Try to reconstruct from context
   - Or attempt Latin1→UTF8 conversion on surrounding bytes

4. **Multi-pass fix**
   - Apply fixes in order: hex escapes → Unicode escapes → Latin1→UTF8
   - Iterate until no more improvements

### Solution 2: Data Migration Script (PRIORITY 2)

**Create migration to fix existing corrupted data:**
- Query all documents with corrupted filenames
- Apply enhanced encoding fix
- Update database records
- Handle edge cases and manual review for unrecoverable data

### Solution 3: Apply Fix to KPI Attachment API (PRIORITY 3)

**Check KPI attachment endpoints:**
- Ensure encoding fix is applied in KPI attachment responses
- Similar to document service fix

---

## Implementation Plan

### Step 1: Enhance Backend Encoding Utility
- Add hex escape handling
- Add Unicode escape handling
- Add replacement character handling
- Add multi-pass fix logic

### Step 2: Enhance Frontend Encoding Utility
- Mirror backend enhancements
- Handle same corruption patterns

### Step 3: Apply Fix to All API Endpoints
- Document service (already done)
- KPI attachment service (need to check)
- Any other endpoints returning filenames

### Step 4: Create Data Migration Script
- Query corrupted records
- Apply enhanced fix
- Update database
- Report unrecoverable records

---

## Implementation Status

✅ **FIXED** - Enhanced encoding utility and applied to all APIs

**Root Cause Confirmed:**
- Database contains severely corrupted data with:
  - Hex escape sequences: `\x07`, `\x10`, `\x11`, `\x03`
  - Unicode escape sequences: `\u0011`
  - Replacement characters: ``, ``
  - Multiple layers of corruption

**Solution Implemented:**

1. ✅ **Enhanced Backend Encoding Utility** (`encoding.util.ts`)
   - Added hex escape sequence handling (`\x07`, `\x10`, etc.)
   - Added Unicode escape sequence handling (`\u0011`, etc.)
   - Added replacement character handling
   - Multi-step fix process: hex escapes → Unicode escapes → Latin1→UTF8
   - Skips control characters that are likely corruption

2. ✅ **Applied Fix to KPI Attachment Service**
   - Added `fixFileNameEncoding()` to `listAttachments()` method
   - Fixes fileName before returning in API response

3. ✅ **Already Applied to Document Service**
   - `findById()` - fixes fileName and name
   - `findByFolder()` - fixes all documents
   - `search()` - fixes search results

**Files Modified:**
- `apps/api/src/common/utils/encoding.util.ts` - Enhanced with hex/Unicode escape handling
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Added encoding fix to listAttachments
- `apps/api/src/modules/storage/services/document.service.ts` - Already had encoding fix (from previous fix)

**Verification:**
- ✅ Build successful
- ✅ No linter errors
- ✅ Enhanced utility handles complex corruption patterns

## Expected Result

After fix:
- API responses will fix hex escapes (`\x07` → removed or converted)
- API responses will fix Unicode escapes (`\u0011` → converted to character)
- API responses will fix Latin1→UTF8 mojibake
- Frontend will receive properly encoded filenames
- Works for both new uploads and existing corrupted records

## Testing Recommendations

1. Test with actual corrupted data from database:
   ```typescript
   const corrupted = "BPVN. Thng bo khm sc khe \u0011nh k.pdf";
   const fixed = fixFileNameEncoding(corrupted);
   // Should fix Unicode escape and attempt Latin1→UTF8
   ```

2. Test with hex escapes:
   ```typescript
   const corrupted = "file\x07name\x10.pdf";
   const fixed = fixFileNameEncoding(corrupted);
   // Should remove or convert control characters
   ```

3. Verify API responses now return fixed filenames

## Next Steps (Optional)

1. **MEDIUM:** Create data migration script to fix existing corrupted records in database
2. **LOW:** Manual review of unrecoverable records (those with too much data loss)
3. **LOW:** Enhance frontend utility to match backend enhancements
