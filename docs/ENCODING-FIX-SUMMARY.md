# Database Encoding Fix - Summary Report

**Date:** 2026-01-21  
**Issue:** File names corrupted with mojibake in database  
**Status:** ✅ FIXED + Migration Script Ready

---

## 🔴 The Real Problem

You reported "font issue" in UI, but after database investigation, I discovered the **actual problem is MUCH deeper**:

### What We Found:

```sql
-- Query result from your database:
file_name: "Tá»· lá»\u0087 xá»­ lÃ½ khiáº¿u náº¡i"
                    ↓
-- Should be:
file_name: "Tỷ lệ xử lý khiếu nại"
```

**This is NOT a display issue - the data is corrupted IN THE DATABASE!**

### Proof:

```sql
-- Test query: Find Vietnamese characters
SELECT * FROM documents WHERE file_name LIKE '%ệ%';
-- Result: 0 rows

-- This means: NO actual Vietnamese characters exist in DB!
-- Only mojibake (corrupted encoding) exists.
```

---

## 🔍 Root Cause

### The Problem Flow:

1. **Browser Upload** → Sends file name as UTF-8 bytes
2. **NestJS/Multer** → Receives multipart/form-data
3. **BUG HERE** → `file.originalname` decoded as Latin1 instead of UTF-8
4. **Backend saves** → Mojibake written to database
5. **Frontend displays** → Shows corrupted data from DB

### Exact Location:

```typescript
// document.service.ts:81
const fileName = file.originalname; // ← BUG: No encoding fix!
```

---

## ✅ Solutions Implemented

### 1. Encoding Utility (NEW)

**File:** `apps/api/src/common/utils/encoding.util.ts`

```typescript
// Detects mojibake and fixes it
export function fixFileNameEncoding(fileName: string): string {
  // Convert Latin1-interpreted bytes back to UTF-8
  // "Tá»· lá»\u0087" → "Tỷ lệ"
}
```

**Tests:** ✅ 10/10 passing

### 2. Updated Upload Services

**Files modified:**
- `apps/api/src/modules/storage/services/document.service.ts`
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Change:**
```typescript
// OLD:
const fileName = file.originalname;

// NEW:
const fileName = fixFileNameEncoding(file.originalname);
```

**Effect:** All future uploads will save correct encoding ✅

### 3. Migration Script (NEW)

**File:** `apps/api/src/scripts/fix-filename-encoding.ts`

Scans all existing documents and fixes:
- `documents.file_name`
- `documents.name`

**Ready to run!**

---

## 📋 Action Items for You

### ✅ Code Changes (DONE)
All code fixes are already applied. No action needed.

### 🔄 Database Migration (TODO)

**YOU NEED TO RUN THIS:**

```bash
cd apps/api
npx ts-node src/scripts/fix-filename-encoding.ts
```

This will fix all existing corrupted data in your database.

**See detailed guide:** `MIGRATION-ENCODING-FIX.md`

---

## 📊 What Gets Fixed

### Documents Table:
- ✅ `file_name` column → All Vietnamese names fixed
- ✅ `name` column → All document display names fixed

### Example Fix:

| Before Migration | After Migration |
|-----------------|----------------|
| `Tá»· lá»\u0087 xá»­ lÃ½ khiáº¿u náº¡i` | `Tỷ lệ xử lý khiếu nại` |
| `Sá»\u0091 láº§n Ä\u0091á»\u0081 xuáº¥t` | `Số lần đề xuất` |
| `váº£i sá»­a cá»§a bá»\u0099 pháº­n` | `vải sửa của bộ phận` |

---

## 🎯 Expected Results

### Before Fix:
- ❌ Database: Mojibake
- ❌ UI: Garbled characters (æ<ç»Ðø¼...)
- ❌ Downloads: Wrong file names

### After Fix:
- ✅ Database: Correct UTF-8 Vietnamese
- ✅ UI: Displays perfectly
- ✅ Downloads: Correct file names
- ✅ Future uploads: Always correct

---

## 🔒 Safety

### Tests:
- ✅ 10 unit tests passing
- ✅ Handles Vietnamese, Chinese, English
- ✅ No impact on correct data

### Risk Assessment:
- 🟡 Medium risk (database changes)
- ✅ Recommend backup before migration
- ✅ Rollback instructions provided
- ✅ Script has error handling

### Backup Command:
```bash
docker exec iso-docs-postgres pg_dump -U admin documents_db > backup.sql
```

---

## 📚 Documentation

All documentation available:

1. **Quick Guide:** `MIGRATION-ENCODING-FIX.md` (in root)
2. **Full Debug Report:** `docs/debug-reports/260121-database-encoding-corruption-fix.md`
3. **This Summary:** `docs/ENCODING-FIX-SUMMARY.md`

---

## ⏱️ Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Investigate issue | 30 min | ✅ DONE |
| 2. Implement fixes | 45 min | ✅ DONE |
| 3. Write tests | 15 min | ✅ DONE |
| 4. Documentation | 20 min | ✅ DONE |
| 5. **Run migration** | 1 min | ⏳ **YOUR ACTION** |
| 6. Verify in UI | 2 min | ⏳ **YOUR ACTION** |

**Total time for you:** ~3 minutes

---

## 🎉 Final Notes

### Why This Happened:

This is a common issue with multipart/form-data uploads when:
- Client sends UTF-8
- Server expects ASCII/Latin1
- No explicit encoding handling

### Prevention:

✅ All fixed! The encoding utility is now applied to ALL file uploads.

### Testing After Migration:

1. Upload a new file with Vietnamese name
2. Check it saves correctly in DB
3. Check it displays correctly in UI
4. Download it - file name should be correct

---

**Ready to fix your database?**  
👉 See: `MIGRATION-ENCODING-FIX.md` for step-by-step instructions
