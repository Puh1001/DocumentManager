# Debug Report: Filename Encoding Still Broken After Migration

**Date:** 2026-01-22  
**Issue:** Files still show corrupted filenames after running migration script  
**Priority:** HIGH - Migration didn't fully fix the issue

---

## Problem Summary

### User Reports:
- **Vẫn đang bị lỗi font** - Still showing corrupted filenames
- Migration script đã chạy nhưng vẫn còn nhiều files bị lỗi

### Visual Evidence:
From screenshot, we can see:
- File 1: `T L O T O N...` ❌ (corrupted) - Should be "Tỷ lệ đào tạo nhân viên..."
- File 2: `T L CH M C N...` ❌ (corrupted) - Should be "Tỷ lệ chấm công chính xác..."
- File 3: `TỶ LỆ ĐẠT MỤC TIÊU...` ✅ (correct!) - This one works
- File 4: `T L LU N CHUY...` ❌ (corrupted) - Should be "Tỷ lệ luân chuyển nhân viên..."

**Key Observation:** File 3 shows correctly, proving the UI CAN display Vietnamese. The issue is with the **data in database**.

---

## Migration Script Results

From terminal output:
- ✅ **92 files fixed**
- ⏭️ **577 files skipped** (no mojibake detected or fix produced invalid result)
- ❌ **0 errors**

**Problem:** Many files were skipped because:
1. Fix produced invalid result (null bytes, invalid UTF-8)
2. No mojibake detected (but still corrupted in UI)

---

## Root Cause Analysis (5 Whys)

### Why 1: Why are files still corrupted after migration?
- **Answer:** Migration script skipped many files because fix produced invalid results

### Why 2: Why did fix produce invalid results?
- **Answer:** Some files have:
  - Double/triple encoding
  - Invalid UTF-8 sequences
  - Mixed encoding (Chinese + Vietnamese)
  - Severely corrupted data

### Why 3: Why can't we fix these files?
- **Answer:** Current fix logic:
  - Only attempts Latin1→UTF-8 conversion
  - Doesn't handle all encoding scenarios
  - Validation rejects fixes with replacement characters

### Why 4: Why does validation reject fixes with replacement characters?
- **Answer:** Validation checks for:
  - No null bytes ✅
  - Valid UTF-8 ✅
  - No mojibake ✅
  - But replacement characters () are valid UTF-8, just not perfect

### Why 5: What's the fundamental issue?
- **Answer:** Some corrupted data **cannot be perfectly fixed** because original encoding information is lost. We need to:
  1. Accept "better but not perfect" fixes (with replacement chars)
  2. OR manually fix files that can't be auto-fixed
  3. OR prevent new uploads from being corrupted

---

## Evidence

### Migration Output Analysis:

**Files Fixed (92):**
- Some fixed correctly: `TAI Náº N Há»A HOáº N.pdf` → `TAI NẠN HỎA HOẠN.pdf` ✅
- Some fixed but with replacement chars: `Tá»¶ Lá» CHáº¤M CÃNG CHÃNH XÃC.pdf` → `T L CH M C NG CH NH X C.pdf` ⚠️

**Files Skipped (577):**
- Many because fix produced invalid result
- Some because no mojibake detected (but still corrupted)

### Frontend Display:
- UI component: `kpi-attachment-item.tsx` line 112
- Displays: `{attachment.fileName}` directly from API
- No client-side encoding fix applied

---

## Fix Plan

### Phase 1: Improve Fix Logic
- Accept fixes with replacement characters if they're better than original
- Better handling of mixed encoding (Chinese + Vietnamese)
- More aggressive fix attempts

### Phase 2: Client-Side Fix (Frontend)
- Add encoding fix on frontend as fallback
- Fix filenames when displaying if still corrupted

### Phase 3: Verify New Uploads
- Test with new upload to ensure they're fixed
- Verify encoding utility works for new uploads

### Phase 4: Manual Fix for Remaining
- Identify files that can't be auto-fixed
- Provide manual fix option or better fix logic

---

## Immediate Actions

1. ⏳ **Improve fix logic** - Accept "better but not perfect" fixes
2. ⏳ **Add frontend fix** - Fix on display as fallback
3. ⏳ **Test new upload** - Verify new uploads work correctly
4. ⏳ **Identify unfixable files** - List files that need manual fix
