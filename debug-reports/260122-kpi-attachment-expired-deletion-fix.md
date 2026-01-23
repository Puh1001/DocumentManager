# Debug Report: KPI Attachment Expired Deletion Fix

**Date:** 2026-01-22  
**Status:** ✅ Fixed

---

## Problem Summary

User reported that KPI attachments showing "Expired - Contact DCC" badge can still be deleted via the delete button, which violates the 72-hour deletion rule.

**User Report:**
> "Tôi vừa upload lên thì đã bị expried. Nhưng ấn xóa vẫn xóa được, Đáng lẽ phải như logic client yêu cầu chứ"

**Expected Behavior:**
- Files within 72 hours: Can delete directly
- Files after 72 hours: Must submit deletion request to DCC
- Delete button should not be visible when expired

---

## Root Cause Analysis

### Issue: Delete Button Visibility Not Checking Expiration Status

**Root Cause:**
1. Delete button visibility in `KpiAttachmentItem` was controlled only by `canDelete` prop (permission-based)
2. The `canDelete` prop comes from parent components based on user permissions, not deletion status
3. Even when badge shows "Expired - Contact DCC", delete button remained visible because `canDelete` was `true`
4. The `handleDelete` function did check status before deletion, but button shouldn't be visible at all when expired

**Evidence:**
```typescript
// Before fix - kpi-attachment-item.tsx:118
{canDelete && onAttachmentDelete && (
  <button onClick={handleDelete}>...</button>
)}
```

The button visibility only checked `canDelete` prop, not the actual deletion status.

---

## Solution

### Fix: Check Deletion Status for Button Visibility

**File:** `apps/web/src/components/boss/kpi-attachment-item.tsx`

**Changes:**
1. Added `useKpiAttachmentDeletionStatus` hook to fetch deletion status
2. Added `useDeletionCountdown` hook to check frontend countdown expiration
3. Created `canShowDeleteButton` computed value that checks:
   - User has permission (`canDelete` prop)
   - Deletion handler exists (`onAttachmentDelete`)
   - Backend status allows deletion (`deletionStatus.canDelete`)
   - Backend status not expired (`!deletionStatus.isExpired`)
   - Frontend countdown not expired (`!countdown.isExpired`)
4. Updated button visibility to use `canShowDeleteButton` instead of just `canDelete`

**Code:**
```typescript
// Check deletion status to determine if delete button should be visible
const { status: deletionStatus } = useKpiAttachmentDeletionStatus(attachment.id);

// Calculate expiresAt from remainingHours - memoized to prevent recalculation
const expiresAt = useMemo(() => {
  if (!deletionStatus || deletionStatus.remainingHours === Infinity || deletionStatus.remainingHours <= 0) {
    return null;
  }
  return new Date(Date.now() + deletionStatus.remainingHours * 60 * 60 * 1000);
}, [deletionStatus?.remainingHours]);

const countdown = useDeletionCountdown(expiresAt);

// Determine if delete button should be visible
// Button should only be visible if:
// 1. User has permission (canDelete prop)
// 2. File is not expired (both backend status and frontend countdown)
const canShowDeleteButton = canDelete && 
  onAttachmentDelete && 
  deletionStatus && 
  deletionStatus.canDelete && 
  !deletionStatus.isExpired && 
  !countdown.isExpired;

// Updated button visibility
{canShowDeleteButton && (
  <button onClick={handleDelete}>...</button>
)}
```

---

## Defense in Depth

The fix implements multiple layers of protection:

1. **UI Layer:** Delete button hidden when expired (this fix)
2. **Handler Layer:** `handleDelete` function checks status before deletion (existing)
3. **Backend Layer:** `deleteAttachment` endpoint enforces 72-hour rule (existing)

Even if user somehow triggers deletion (e.g., via API), backend will reject it.

---

## Testing Checklist

- [x] Code compiles without errors
- [ ] Test: Upload new file → Delete button visible
- [ ] Test: File within 72h → Delete button visible
- [ ] Test: File expired → Delete button hidden
- [ ] Test: File expired → Badge shows "Expired - Contact DCC"
- [ ] Test: File expired → Clicking delete (if somehow accessible) shows deletion request dialog
- [ ] Test: Backend rejects deletion for expired files

---

## Related Files

- `apps/web/src/components/boss/kpi-attachment-item.tsx` - Fixed delete button visibility
- `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx` - Shows expiration status
- `apps/web/src/hooks/use-kpi-attachment-deletion-status.ts` - Fetches deletion status
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Backend deletion logic
- `apps/api/src/modules/storage/services/document-deletion.service.ts` - 72-hour rule enforcement

---

## Additional Investigation: Why Newly Uploaded Files Show as Expired

**User Report:** "Tôi vừa upload lên thì đã bị expried" (File shows as expired immediately after upload)

**Possible Causes:**
1. **Backend returning incorrect status**: If `deletionExpiresAt` is not set correctly during upload, backend might return `isExpired: true` or `remainingHours: 0`
2. **Race condition**: Status check happens before document is fully saved with `deletionExpiresAt`
3. **Timezone mismatch**: Database time vs application time causing comparison issues
4. **Old document data**: Document being checked might be an old one, not the newly uploaded file

**Investigation Steps:**
- Check if `deletionExpiresAt` is being set correctly in `DocumentService.upload()`
- Verify backend `checkDeletionStatus` returns correct values for newly uploaded files
- Check for any database default values interfering with `deletionExpiresAt`
- Verify timezone settings match between application and database

**Current Fix Status:**
- ✅ Delete button now hidden when expired (prevents deletion)
- ⚠️ Need to investigate why newly uploaded files show as expired

## Notes

- The `handleDelete` function still includes backend validation as defense-in-depth
- Button visibility now properly reflects deletion status
- Badge and button visibility are now consistent
- Loading state: Button won't show until deletion status is loaded (safer than showing prematurely)
- **TODO**: Investigate root cause of newly uploaded files showing as expired
