# Remove Mojibake Fix - Frontend Cleanup

**Date:** 2025-01-23  
**Status:** ✅ COMPLETED

---

## Problem

API trả về đúng UTF-8:
```json
{
  "fileName": "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
}
```

Nhưng UI vẫn hiển thị sai vì frontend đang apply `fixFileNameEncoding()` trên data đã đúng, làm corrupt nó.

---

## Root Cause

Frontend có logic fix mojibake phức tạp trong `encoding-fix.ts`:
- Detect mojibake patterns
- Convert Latin1 → UTF-8
- Multiple encoding strategies

Khi API đã trả về đúng UTF-8, logic này:
1. Detect Latin1 chars trong UTF-8 string (false positive)
2. Apply fix → corrupt string đã đúng

---

## Solution

**Đơn giản hóa `encoding-fix.ts`** - chỉ return fileName trực tiếp:

```typescript
export function fixFileNameEncoding(fileName: string): string {
  // Backend sends correct UTF-8, no fix needed
  return fileName || '';
}
```

**Lý do:**
- API đã gửi `fileName` như text field (UTF-8 thô)
- Backend đã lưu đúng UTF-8 vào database
- Không cần fix gì ở frontend

---

## Changes Made

✅ **Simplified `apps/web/src/lib/utils/encoding-fix.ts`**
- Removed all mojibake detection logic
- Removed all encoding conversion logic
- Simple passthrough function

✅ **Kept all imports/usage** - No breaking changes
- All components still use `fixFileNameEncoding()`
- Function signature unchanged
- Just simplified implementation

---

## Files Modified

1. `apps/web/src/lib/utils/encoding-fix.ts` - Simplified to passthrough

---

## Testing

**Before:**
- API: `"BPVN. Thông báo khám sức khỏe định kỳ.pdf"` ✅
- UI: `"BPVN. Thng bo khm sc khe nh k.pdf"` ❌

**After:**
- API: `"BPVN. Thông báo khám sức khỏe định kỳ.pdf"` ✅
- UI: `"BPVN. Thông báo khám sức khỏe định kỳ.pdf"` ✅

---

## Benefits

1. ✅ **No false positives** - Không detect mojibake trên UTF-8 đúng
2. ✅ **Simple** - Passthrough function, không logic phức tạp
3. ✅ **Backward compatible** - Không breaking changes
4. ✅ **Correct display** - UI hiển thị đúng như API trả về
