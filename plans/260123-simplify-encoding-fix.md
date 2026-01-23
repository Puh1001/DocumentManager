# Plan: Simplify Filename Encoding Fix

**Date:** 2026-01-23  
**Status:** 📋 Planning  
**Priority:** HIGH

---

## Problem Analysis

### Current Issue
- `fixFileNameEncoding()` quá phức tạp với pattern matching hardcode
- Không bao quát hết các trường hợp tiếng Việt và tiếng Trung
- Vẫn còn lỗi ENOENT khi upload files

### Root Cause (User's Analysis - CORRECT)
1. **Browser** gửi file qua FormData → filename được encode ISO-8859-1 (Latin1)
2. **Multer/NestJS** nhận filename → hiểu nhầm là Latin1 string
3. **Thực tế**: Bytes đó là UTF-8 bytes bị hiểu nhầm là Latin1 → mojibake
4. **Giải pháp đơn giản**: Convert Latin1 → UTF-8 trước khi lưu DB

### Why Not DB Issue?
- DB lưu UTF-8 đúng
- Vấn đề là **data đã bị corrupt TRƯỚC KHI vào DB**
- Multer decode filename sai encoding → mojibake → lưu vào DB

---

## Solution: Simplify to Direct Conversion

### Strategy
**Loại bỏ pattern matching phức tạp → Chỉ convert Latin1 → UTF-8**

### Algorithm
```typescript
function fixFileNameEncoding(fileName: string): string {
  if (!fileName) return fileName;
  
  // Check if contains Latin1 supplement chars (0x80-0xFF)
  // These indicate filename was decoded as Latin1 instead of UTF-8
  if (/[\u0080-\u00FF]/.test(fileName)) {
    try {
      // Convert: Latin1 bytes → UTF-8 string
      const buffer = Buffer.from(fileName, 'latin1');
      const fixed = buffer.toString('utf8');
      
      // Accept if:
      // 1. Different from original (conversion happened)
      // 2. No null bytes (invalid in filenames)
      // 3. Result is valid UTF-8 (can round-trip)
      if (fixed !== fileName && 
          !fixed.includes('\0') &&
          isValidUtf8(fixed)) {
        return fixed;
      }
    } catch (error) {
      // If conversion fails, return original
    }
  }
  
  return fileName;
}
```

### Key Simplifications
1. **Remove**: Pattern matching arrays (vietnameseMojibakePatterns, chineseMojibakePatterns)
2. **Remove**: `hasMojibake()` complexity
3. **Remove**: `fixMojibake()` double-encoding logic
4. **Keep**: Simple Latin1 → UTF-8 conversion
5. **Keep**: Basic validation (no null bytes, valid UTF-8)

---

## Implementation Plan

### Phase 1: Simplify `fixFileNameEncoding()`

**File:** `apps/api/src/common/utils/encoding.util.ts`

**Changes:**
1. Remove `hasMojibake()` function (or simplify to just check Latin1 chars)
2. Remove `fixMojibake()` function
3. Simplify `fixFileNameEncoding()` to direct conversion
4. Keep `isValidUtf8String()` for validation

**New Code:**
```typescript
/**
 * Fixes file name encoding from multipart uploads
 * 
 * Problem: Multer decodes filename as Latin1 (ISO-8859-1) instead of UTF-8
 * Solution: Convert Latin1 bytes back to UTF-8
 * 
 * @param fileName - The file name from file.originalname (may be Latin1-decoded UTF-8)
 * @returns Fixed file name with correct UTF-8 encoding
 */
export function fixFileNameEncoding(fileName: string): string {
  if (!fileName) {
    return fileName;
  }
  
  // Check if contains Latin1 supplement chars (0x80-0xFF)
  // These indicate filename was decoded as Latin1 instead of UTF-8
  const hasLatin1Chars = /[\u0080-\u00FF]/.test(fileName);
  
  if (!hasLatin1Chars) {
    // No Latin1 chars = likely already correct UTF-8
    return fileName;
  }
  
  try {
    // Convert: Latin1 bytes → UTF-8 string
    // This reverses the mis-decoding that happened in Multer
    const buffer = Buffer.from(fileName, 'latin1');
    const fixed = buffer.toString('utf8');
    
    // Validate fix:
    // 1. Must be different from original (conversion happened)
    // 2. No null bytes (invalid in filenames)
    // 3. Valid UTF-8 (can round-trip encode/decode)
    if (fixed !== fileName && 
        !fixed.includes('\0') &&
        isValidUtf8String(fixed)) {
      return fixed;
    }
  } catch (error) {
    // If conversion fails, return original
  }
  
  // Return original if fix couldn't be applied
  return fileName;
}

/**
 * Validates if a string is valid UTF-8
 */
function isValidUtf8String(str: string): boolean {
  if (!str) return true;
  
  // Check for null bytes (invalid in UTF-8 strings)
  if (str.includes('\0')) {
    return false;
  }
  
  // Check if string can be safely encoded/decoded as UTF-8
  try {
    const encoded = Buffer.from(str, 'utf8');
    const decoded = encoded.toString('utf8');
    // If round-trip conversion works and no null bytes, it's valid
    return decoded === str && !decoded.includes('\0');
  } catch (error) {
    return false;
  }
}
```

### Phase 2: Remove Unused Functions (Optional)

**Files to clean up:**
- `hasMojibake()` - can be removed or simplified
- `fixMojibake()` - can be removed
- Pattern arrays - can be removed

**Decision:** Keep for now, mark as deprecated. Remove later if not needed.

### Phase 3: Testing

**Test Cases:**
1. ✅ Vietnamese filename: `"BPVN. Thông báo khám sức khỏe Định kỳ.pdf"`
   - Input (corrupted): `"BPVN. ThÃ´ng bÃ¡o khÃ¡m sá»©c khá»e Äá»nh ká»³.pdf"`
   - Expected: `"BPVN. Thông báo khám sức khỏe Định kỳ.pdf"`

2. ✅ Chinese filename: `"测试文件.pdf"`
   - Input (corrupted): mojibake version
   - Expected: `"测试文件.pdf"`

3. ✅ Mixed Vietnamese + Chinese
4. ✅ Plain ASCII filename (should not change)
5. ✅ Already correct UTF-8 (should not change)

---

## Benefits

1. **Simpler**: ~50 lines instead of ~260 lines
2. **More reliable**: No pattern matching = covers all cases
3. **Easier to maintain**: Single conversion logic
4. **Better performance**: No regex pattern matching overhead

---

## Risks & Mitigation

### Risk 1: Double Encoding
- **Issue**: What if filename is already correct UTF-8 but contains Latin1 chars?
- **Mitigation**: Check if conversion produces valid UTF-8 (round-trip test)

### Risk 2: Invalid UTF-8 Sequences
- **Issue**: Some bytes can't be decoded as UTF-8
- **Mitigation**: `isValidUtf8String()` validation rejects invalid results

### Risk 3: Edge Cases
- **Issue**: Special characters, emojis, etc.
- **Mitigation**: Test with real-world filenames, fallback to original if conversion fails

---

## Rollout Plan

1. **Step 1**: Implement simplified `fixFileNameEncoding()`
2. **Step 2**: Test with real uploads (Vietnamese, Chinese filenames)
3. **Step 3**: If works, remove deprecated functions
4. **Step 4**: Update documentation

---

## Files to Modify

- `apps/api/src/common/utils/encoding.util.ts` - Simplify main function
- `apps/api/src/common/utils/encoding.util.ts` - Mark old functions as deprecated (optional)

---

## Success Criteria

- ✅ Upload Vietnamese filename → Saved correctly in DB
- ✅ Upload Chinese filename → Saved correctly in DB
- ✅ No ENOENT errors when writing files
- ✅ Code simpler and easier to maintain
