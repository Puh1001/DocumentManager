# Debug Report: KPI Files Mới Upload Hiển Thị "Expired - Contact DCC"

**Date:** 2026-01-23  
**Issue:** Files mới upload theo business logic phải có 72h đếm ngược và users được xóa, nhưng lại hiển thị "Contact DCC" ở dashboard/KPI

---

## Problem Summary

Files mới upload đang hiển thị badge "Expired - Contact DCC" thay vì hiển thị countdown 72 giờ, mặc dù theo business logic:
- Files mới upload phải có 72h countdown
- Users có thể tự xóa trong 72h
- Sau 72h mới cần "Contact DCC"

---

## Root Cause Analysis

### 1. Code Flow Check

**Upload Flow:**
- `KpiAttachmentService.uploadAttachment()` → `DocumentService.upload()`
- `DocumentService.upload()` line 119: `deletionExpiresAt = new Date(now.getTime() + SEVENTY_TWO_HOURS_MS)`
- ✅ `deletionExpiresAt` được set đúng khi upload

**Status Check Flow:**
- `KpiAttachmentService.getDeletionStatus()` → `DocumentDeletionService.checkDeletionStatus()`
- `checkDeletionStatus()` lines 76-83:
  ```typescript
  const expiresAt =
    document.deletionExpiresAt ||
    new Date(
      (document.uploadedAt || document.createdAt).getTime() +
        DocumentDeletionService.DELETION_WINDOW_MS,
    );
  const isExpired = now >= expiresAt;
  ```

### 2. Potential Issues

**Issue A: Files Uploaded Before Feature Was Added**
- Files cũ có thể có `deletionExpiresAt = null` và `uploadedAt = null`
- Fallback về `createdAt` → files cũ sẽ expired ngay lập tức
- **Nhưng user nói "files mới upload"** → không phải issue này

**Issue B: Database Migration Issue**
- Files được upload sau khi feature được thêm nhưng migration chưa chạy
- `deletionExpiresAt` không được set trong DB
- Cần check database records

**Issue C: Timezone/Calculation Bug**
- Calculation có thể sai do timezone
- `now >= expiresAt` comparison có thể có edge case

**Issue D: Frontend Badge Logic**
- Badge component có thể check sai condition
- `kpi-attachment-deletion-badge.tsx` line 126: checks `status.isExpired || status.requiresDCCApproval || countdown.isExpired`

---

## Evidence

### Code Evidence
1. ✅ `DocumentService.upload()` sets `deletionExpiresAt` correctly (line 119)
2. ✅ `DocumentDeletionService.checkDeletionStatus()` has fallback logic (lines 76-83)
3. ⚠️ Badge component checks multiple conditions (line 126)

### Database Check Needed
- Check recent KPI attachments: `SELECT id, uploaded_at, deletion_expires_at, created_at FROM documents WHERE id IN (SELECT document_id FROM kpi_attachments ORDER BY created_at DESC LIMIT 10)`
- Verify `deletionExpiresAt` is set for new uploads
- Check if `uploadedAt` is null for any recent files

---

## Hypothesis

**Most Likely:** Files được upload trước khi deletion tracking feature được deploy, hoặc có files cũ trong database không có `deletionExpiresAt` set. Badge component đang hiển thị "Expired" cho tất cả files không có valid `deletionExpiresAt`.

**Alternative:** Frontend badge logic có bug - đang check `countdown.isExpired` trước khi verify `status.canDelete`.

---

## Fix Plan

### Step 1: Verify Database State
- Query recent KPI attachments để check `deletionExpiresAt` values
- Identify files missing `deletionExpiresAt`

### Step 2: Fix Badge Logic ✅ FIXED
- ✅ Updated `kpi-attachment-deletion-badge.tsx` để prioritize `status.canDelete` check
- ✅ Only show "Expired" if `status.isExpired === true` AND `status.canDelete === false`
- ✅ Don't rely solely on `countdown.isExpired` for expired status
- ✅ Handle `remainingHours === Infinity` correctly (for DCC users)
- ✅ Only calculate `expiresAt` if `status.canDelete === true` and `remainingHours > 0`

**Changes Made:**
1. Updated `expiresAt` calculation to only set when `status.canDelete === true` and `remainingHours > 0`
2. Updated "Can Delete" condition to check `expiresAt === null || !countdown.isExpired`
3. Updated "Expired" condition to only show when `status.isExpired === true && !status.canDelete`

### Step 3: Backfill Missing Data (if needed)
- Run backfill script for files missing `deletionExpiresAt`
- Or update logic to handle null `deletionExpiresAt` better

### Step 4: Add Logging
- Add debug logs in `checkDeletionStatus()` to track calculation
- Log `deletionExpiresAt`, `uploadedAt`, `createdAt`, and calculated `expiresAt`

---

## Root Cause (Confirmed)

**Bug in Badge Component Logic:**
1. Badge was checking `countdown.isExpired` even when `status.canDelete === true`
2. When `remainingHours === Infinity` (DCC users) or `remainingHours <= 0`, `expiresAt = null`
3. `countdown.isExpired = true` when `expiresAt === null`
4. This caused badge to show "Expired" even for files that can still be deleted

**Fix:**
- Prioritize `status.canDelete` from backend over frontend countdown
- Only show "Expired" when backend explicitly says `isExpired === true` AND `canDelete === false`
- Handle `remainingHours === Infinity` case (DCC users can always delete)

---

## Issue 2: Countdown Shows 0h 0m and No Delete Button

**Date:** 2026-01-23 (Update)  
**Issue:** Files hiển thị "Can Delete (0h 0m left)" và không có nút delete

### Root Cause

1. **Backend `calculateRemainingHours` uses `Math.floor()`**: 
   - Nếu file còn < 1 giờ, `remainingHours = 0`
   - Frontend thấy `remainingHours = 0` → `expiresAt = null` → `countdown.isExpired = true`

2. **Frontend logic too strict**:
   - Badge: Check `remainingHours > 0` → không tính `expiresAt` khi = 0
   - Delete button: Check `!countdown.isExpired` → không hiển thị khi `expiresAt = null`

### Fix Applied ✅

1. **Badge Component**:
   - ✅ Calculate `expiresAt` even when `remainingHours = 0` (as long as `canDelete = true` and `!isExpired`)
   - ✅ Use minimum 1 minute if `remainingHours = 0` to ensure countdown works
   - ✅ Display "Less than 1h" when hours = 0
   - ✅ Fallback to `remainingHours` from backend if countdown unavailable

2. **Delete Button Logic**:
   - ✅ Remove `!countdown.isExpired` check
   - ✅ Only rely on backend `canDelete` and `!isExpired`
   - ✅ Prioritize backend status over frontend countdown

### Changes Made

**File: `kpi-attachment-deletion-badge.tsx`**
- Updated `expiresAt` calculation to handle `remainingHours = 0`
- Updated display logic to show "Less than 1h" when appropriate
- Use backend `remainingHours` as fallback

**File: `kpi-attachment-item.tsx`**
- Updated `expiresAt` calculation to handle `remainingHours = 0`
- Removed `!countdown.isExpired` check from `canShowDeleteButton`
- Only check backend `canDelete` and `!isExpired`

---

## Issue 3: File Vừa Update Nhưng Chỉ Còn < 1h

**Date:** 2026-01-23 (Update)  
**Issue:** File vừa update nhưng chỉ hiển thị "Less than 1h left" thay vì 72h

### Root Cause

**Bug trong `DocumentService.updateFile()`:**
- Khi user update file (re-upload version mới), method `updateFile()` chỉ tạo version mới
- **KHÔNG reset `deletionExpiresAt`, `uploadedAt`, và `uploadedBy`**
- File vẫn dùng `deletionExpiresAt` cũ → có thể đã gần hết hạn hoặc đã hết hạn
- Nếu file được upload trước khi feature được thêm, `deletionExpiresAt = null` → fallback về `createdAt + 72h` → expired ngay

### Fix Applied ✅

**File: `document.service.ts` - `updateFile()` method**
- ✅ Reset `deletionExpiresAt` = now + 72h khi update file
- ✅ Reset `uploadedAt` = now
- ✅ Reset `uploadedBy` = userId (người update)
- ✅ Cho user 72h window mới để delete file sau khi update

**File: `document-deletion.service.ts` - `checkDeletionStatus()` method**
- ✅ Thêm debug logging khi `deletionExpiresAt` missing
- ✅ Log fallback calculation để debug

### Changes Made

```typescript
// Before: updateFile() chỉ tạo version, không reset deletionExpiresAt
async updateFile(...) {
  await this.versionService.createVersion(...);
  return this.findById(documentId);
}

// After: updateFile() reset deletion tracking fields
async updateFile(...) {
  const now = new Date();
  const newDeletionExpiresAt = new Date(now.getTime() + SEVENTY_TWO_HOURS_MS);
  
  await this.versionService.createVersion(...);
  
  await this.prisma.document.update({
    where: { id: documentId },
    data: {
      uploadedBy: userId,
      uploadedAt: now,
      deletionExpiresAt: newDeletionExpiresAt,
    },
  });
}
```

---

## Next Steps

1. ✅ Check database for recent KPI attachments
2. ✅ Review badge component logic
3. ✅ Fix badge to properly handle newly uploaded files
4. ✅ Fix countdown display for files with < 1 hour remaining
5. ✅ Fix delete button visibility logic
6. ✅ Fix `updateFile()` to reset `deletionExpiresAt`
7. ✅ Add debug logging for missing `deletionExpiresAt`
8. ⏳ Test with fresh upload
9. ⏳ Test with file update/re-upload
10. ⏳ Verify fix works for both new and old files
11. ⏳ Check if files need backfill for `deletionExpiresAt`

## Issue 4: KPI và Documents Hiển Thị Khác Nhau

**Date:** 2026-01-23 (Update)  
**Issue:** `/dashboard/documents` hiển thị đúng (71h 42m), nhưng `/dashboard/kpi` hiển thị sai ("nullh 0m")

### Root Cause

**Khác biệt giữa Documents và KPI:**

1. **Documents list:**
   - Nhận `deletionExpiresAt` từ document data (Date object)
   - Pass trực tiếp vào `DeletionStatusBadge` component
   - `useDeletionCountdown(expiresAt)` hoạt động đúng với Date object

2. **KPI attachment:**
   - KHÔNG có `deletionExpiresAt` trong API response
   - Phải tính `expiresAt` từ `status.remainingHours`
   - Khi `status.remainingHours` là `null` hoặc `undefined`, `displayHours` sẽ là `null`/`undefined`
   - Hiển thị `${displayHours}h` → "nullh" hoặc "undefinedh"

**Bug trong display logic:**
- Line 112: `const displayHours = expiresAt && !countdown.isExpired ? countdown.hours : status.remainingHours;`
- Nếu `status.remainingHours` là `null`/`undefined`, `displayHours` sẽ là `null`/`undefined`
- Không có validation để đảm bảo `displayHours` luôn là number

### Fix Applied ✅

**File: `kpi-attachment-deletion-badge.tsx`**

1. **Fix displayHours calculation:**
   - ✅ Validate `status.remainingHours` là number và không phải NaN
   - ✅ Fallback về 0 nếu null/undefined
   - ✅ Đảm bảo `displayHours` và `displayMinutes` luôn là number

2. **Fix expired logic:**
   - ✅ Check `status.requiresDCCApproval` OR `status.isExpired`
   - ✅ Check `countdown.isExpired` AND `!status.canDelete` (defense in depth)
   - ✅ Hiển thị "Expired - Contact DCC" khi hết thời gian

3. **Consistency với Documents:**
   - ✅ Logic tương tự documents nhưng phải tính `expiresAt` từ `remainingHours`
   - ✅ Hiển thị "Expired - Contact DCC" thay vì "Requires DCC Approval" (theo yêu cầu user)

### Changes Made

```typescript
// Before: displayHours có thể là null/undefined
const displayHours = expiresAt && !countdown.isExpired ? countdown.hours : status.remainingHours;

// After: displayHours luôn là number
let displayHours: number;
let displayMinutes: number;

if (expiresAt && !countdown.isExpired) {
  displayHours = countdown.hours ?? 0;
  displayMinutes = countdown.minutes ?? 0;
} else {
  displayHours = typeof status.remainingHours === 'number' && !isNaN(status.remainingHours)
    ? status.remainingHours
    : 0;
  displayMinutes = 0;
}
```

**Expired logic:**
```typescript
// Before: chỉ check status.requiresDCCApproval
if (status.requiresDCCApproval && !status.hasActiveRequest)

// After: check multiple conditions
if (!status.hasActiveRequest && (
  status.requiresDCCApproval || 
  status.isExpired || 
  (countdown.isExpired && !status.canDelete)
))
```

---

## Summary

Tất cả các fixes đã được apply:
1. ✅ Fix badge logic để prioritize `status.canDelete`
2. ✅ Fix countdown display cho files với < 1h remaining
3. ✅ Fix delete button visibility
4. ✅ Fix `updateFile()` để reset `deletionExpiresAt`
5. ✅ Fix displayHours để không hiển thị "nullh"
6. ✅ Fix expired logic để hiển thị "Contact DCC" khi hết thời gian

**Kết quả mong đợi:**
- Files mới upload: hiển thị countdown đúng (72h)
- Files trong 72h: hiển thị nút delete
- Files hết thời gian: hiển thị "Expired - Contact DCC" và không cho xóa
- KPI và Documents hiển thị nhất quán
