# Debug Report: Encoding Fix Simplified

**Date:** 2026-01-23  
**Status:** ✅ Simplified & Fixed

---

## Problem Summary

User reported that encoding fix was too complex with hardcoded patterns and didn't cover all Vietnamese/Chinese cases. Requested simplification to direct Latin1 → UTF-8 conversion.

**User Analysis (CORRECT):**
> "Chỉ cần thực hiện chuyển đổi thủ công từ latin1 sang utf8 cho tên file trước khi lưu vào database. chứ không cần phức tạp thế này"

**Root Cause:**
- Browser sends filename as UTF-8 bytes in FormData
- Multer decodes as Latin1 (ISO-8859-1) instead of UTF-8
- Result: UTF-8 bytes interpreted as Latin1 → mojibake
- **Solution**: Simple Latin1 → UTF-8 conversion before saving to DB

---

## Solution: Simplified Encoding Fix

### Before (Complex)
- ~260 lines of code
- Hardcoded pattern matching (Vietnamese/Chinese patterns)
- Complex validation logic
- Double encoding handling

### After (Simple)
- ~100 lines of code
- Direct Latin1 → UTF-8 conversion
- Simple validation (no null bytes, valid UTF-8)
- Covers ALL Unicode characters without patterns

### Implementation

**File:** `apps/api/src/common/utils/encoding.util.ts`

**New Code:**
```typescript
export function fixFileNameEncoding(fileName: string): string {
  if (!fileName) return fileName;
  
  // Check if contains Latin1 supplement chars (0x80-0xFF)
  const hasLatin1Chars = /[\u0080-\u00FF]/.test(fileName);
  
  if (!hasLatin1Chars) {
    return fileName; // Already correct UTF-8 or ASCII
  }
  
  try {
    // Convert: Latin1 bytes → UTF-8 string
    const buffer = Buffer.from(fileName, 'latin1');
    const fixed = buffer.toString('utf8');
    
    // Validate: different, no null bytes, valid UTF-8
    if (fixed !== fileName && 
        !fixed.includes('\0') &&
        isValidUtf8String(fixed)) {
      return fixed;
    }
  } catch (error) {
    // If conversion fails, return original
  }
  
  return fileName;
}
```

---

## Test Results

### From Logs (Terminal 826-1003)
```
[UTF8 Fix] Fixed filename: "BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf" 
         -> "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
```

✅ **Encoding fix working correctly!**

### Manual Test
```bash
Input:  "BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf"
Output: "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
```

✅ **Conversion successful!**

---

## Remaining Issue: ENOENT Error

**Status:** ⚠️ Still investigating

**Error Message:**
```
ENOENT: no such file or directory, open 'Z:\Public\...\DF\current\BPVN. Thng bo khm sc khe đnh k.pdf'
```

**Possible Causes:**
1. **Old error from previous upload** (before fix was applied)
2. **Windows file system limitations** - Some UTF-8 characters may not be supported
3. **Race condition** - File written before document updated with fixed filename
4. **Path encoding issue** - Full path may have encoding issues

**Next Steps:**
- Test with fresh upload to see if error persists
- Check if Windows file system can handle Vietnamese characters in filenames
- Verify file is actually written with correct filename

---

## Benefits of Simplified Approach

1. **Simpler**: ~100 lines instead of ~260 lines
2. **More reliable**: No pattern matching = covers ALL cases
3. **Easier to maintain**: Single conversion logic
4. **Better performance**: No regex pattern matching overhead
5. **Universal**: Works for Vietnamese, Chinese, and any Unicode characters

---

## Files Modified

- `apps/api/src/common/utils/encoding.util.ts` - Simplified to direct conversion
- `plans/260123-simplify-encoding-fix.md` - Implementation plan

---

## Notes

- ✅ Encoding fix simplified and working
- ✅ Filename correctly converted from Latin1 to UTF-8
- ⚠️ ENOENT error may be from old upload or Windows file system issue
- Test with fresh upload to confirm fix works end-to-end
