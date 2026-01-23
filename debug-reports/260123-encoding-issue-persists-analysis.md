# Debug Report: Encoding Issue Persists

**Date:** 2025-01-23  
**Status:** 🔍 ROOT CAUSE IDENTIFIED  
**Priority:** HIGH

---

## Problem Summary

API response shows correct filename, but database contains corrupted data with binary control characters, and frontend still displays corrupted characters.

**Evidence:**
1. ✅ API Response: `"fileName": "BPVN. Thông báo khám sức khỏe định kỳ.pdf"` - CORRECT
2. ❌ Database Query: Shows corrupted data with `\x07`, `\x10`, `\x11`, `\x03` control characters
3. ❌ Frontend Display: Shows replacement characters (diamond question marks)

---

## Root Cause Analysis

### Issue 1: Database Contains Binary Control Characters

**Database Query Result:**
```sql
file_name: "WK-BPVN-QA-PR-008 A1 2025t(\x07\x10uhWK Bng tnh trng \x11t \x11c mc tiu cht lng n\x03m 2025.pdf"
```

**Problem:**
- Database stores literal escape sequences: `\x07`, `\x10`, `\x11`, `\x03`
- These are control characters (0x07, 0x10, 0x11, 0x03) that corrupt the filename
- When PostgreSQL returns this data, it may be:
  - Stored as literal 4-character strings: `\`, `x`, `0`, `7`
  - OR stored as actual binary bytes: single byte 0x07

**Current Fix Behavior:**
- `fixFileNameEncoding()` handles hex escapes with regex: `/\\x[0-9A-Fa-f]{2}/`
- This pattern matches literal `\x07` in the string
- Control characters (0x00-0x1F) are removed (replaced with empty string)
- BUT: If database stores as binary bytes, the regex won't match

### Issue 2: API Response is Correct But Frontend Shows Corruption

**API Response:**
```json
{
  "fileName": "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
}
```

**Frontend Display:**
- Shows: "BPVN. Thng bo khm sc khe nh k.pdf" (with replacement characters)

**Possible Causes:**
1. Frontend receives different data (caching issue?)
2. Frontend encoding fix not working correctly
3. Browser encoding issue
4. Response encoding issue (Content-Type headers)

---

## Evidence Collection

### Database Content (PostgreSQL Query)
```sql
SELECT file_name FROM documents WHERE file_name LIKE '%BPVN%';
-- Returns:
-- "WK-BPVN-QA-PR-008 A1 2025t(\x07\x10uhWK Bng tnh trng \x11t \x11c mc tiu cht lng n\x03m 2025.pdf"
```

**Corruption Patterns:**
- `\x07`, `\x10`, `\x11`, `\x03` - Hex escape sequences (control characters)
- `` - Replacement characters (U+FFFD)
- `Bng` - Corrupted Vietnamese (should be "Bảng")
- `trng` - Corrupted Vietnamese (should be "trạng")

### API Response (Network Tab)
```json
{
  "id": "03d611e4-9048-4fbb-b155-8a40083a2f46",
  "documentId": "6d78a890-c277-445e-9071-e1fdcd4075be",
  "fileName": "BPVN. Thông báo khám sức khỏe định kỳ.pdf",
  "uploadedBy": "System Administrator",
  "createdAt": "2026-01-23T02:27:01.124Z"
}
```

**Status:** ✅ CORRECT - API is returning fixed filename

### Frontend Display (Visual)
- Shows: "BPVN. Thng bo khm sc khe nh k.pdf"
- Should be: "BPVN. Thông báo khám sức khỏe định kỳ.pdf"
- Has replacement characters (diamond question marks)

---

## Fix Plan

### Priority 1: Verify Database Storage Format

**Action:**
1. Check if database stores `\x07` as:
   - Literal 4 characters: `\`, `x`, `0`, `7` (string)
   - OR actual binary byte: single byte 0x07

**Test:**
```sql
SELECT 
  file_name,
  length(file_name) as len,
  encode(file_name::bytea, 'hex') as hex_encoded
FROM documents 
WHERE file_name LIKE '%\x07%' 
LIMIT 1;
```

### Priority 2: Enhance Encoding Fix for Binary Control Characters

**Current Issue:**
- Regex `/\\x[0-9A-Fa-f]{2}/` only matches literal escape sequences
- Doesn't handle actual binary control characters in the string

**Fix:**
```typescript
// Add detection for actual binary control characters
function hasBinaryControlChars(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Control characters (0x00-0x1F, except tab/newline/carriage return)
    if (code < 0x20 && ![0x09, 0x0A, 0x0D].includes(code)) {
      return true;
    }
  }
  return false;
}

// Remove binary control characters
function removeBinaryControlChars(str: string): string {
  return str.split('').filter(char => {
    const code = char.charCodeAt(0);
    return code >= 0x20 || [0x09, 0x0A, 0x0D].includes(code);
  }).join('');
}
```

### Priority 3: Verify Frontend Encoding Fix

**Check:**
1. Is `fixFileNameEncoding` being called in frontend?
2. Is the API response actually correct when received by frontend?
3. Are there any encoding issues in HTTP response headers?

**Test:**
```typescript
// In browser console:
fetch('/api/kpi/records/.../attachments')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('First fileName:', data[0]?.fileName);
    console.log('Has replacement chars:', data[0]?.fileName?.includes('\uFFFD'));
  });
```

### Priority 4: Database Migration for Corrupted Data

**For Existing Corrupted Records:**
- Create migration script to fix all corrupted `fileName` and `name` fields
- Apply `fixFileNameEncoding()` to all existing records
- Update database in batches

---

## Recommendations

### Immediate Actions

1. **Verify Database Storage Format**
   - Run SQL query to check if `\x07` is stored as literal or binary
   - This determines which fix approach to use

2. **Test API Response in Browser**
   - Check Network tab to see actual response
   - Verify Content-Type headers
   - Check if response is actually correct

3. **Enhance Encoding Fix**
   - Add binary control character detection and removal
   - Handle both literal escape sequences AND binary bytes

### Long-term Solutions

1. **Database Migration**
   - Fix all existing corrupted records
   - Ensure all filenames are properly encoded

2. **Prevention**
   - Ensure `Utf8FileFixInterceptor` runs on all uploads
   - Add validation to prevent corrupted data from being saved
   - Add database constraints if possible

---

## Fixes Applied

### ✅ Fix 1: Enhanced Backend Encoding Fix

**File:** `apps/api/src/common/utils/encoding.util.ts`

**Change:**
- Added Step 0: Remove actual binary control characters (0x00-0x1F) from string
- This handles cases where database stores actual binary bytes, not just literal escape sequences
- Control characters are filtered out before processing hex/Unicode escapes

**Code:**
```typescript
// Step 0: Remove actual binary control characters from the string
processed = processed.split('').filter(char => {
  const code = char.charCodeAt(0);
  // Keep printable characters (0x20+) and common whitespace
  return code >= 0x20 || [0x09, 0x0A, 0x0D].includes(code);
}).join('');
```

### ✅ Fix 2: Enhanced Frontend Encoding Fix

**File:** `apps/web/src/lib/utils/encoding-fix.ts`

**Change:**
- Added binary control character removal (same as backend)
- Enhanced hex escape handling to remove control characters
- Ensures frontend can handle corrupted data even if backend fix didn't work

## Next Steps

1. ✅ Enhanced encoding fix for binary control characters (DONE)
2. ⏳ Test with actual corrupted data from database
3. ⏳ Verify API response is correct in browser Network tab
4. ⏳ Create database migration script for existing corrupted records
