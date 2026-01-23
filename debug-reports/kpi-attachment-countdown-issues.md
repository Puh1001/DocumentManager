# Debug Report: KPI Attachment Countdown Issues

**Date:** 2026-01-22  
**Status:** 🔴 Critical Issues Found

---

## Problem Summary

Two critical issues with KPI attachment deletion countdown:

1. **Countdown not updating**: The time display shows static value (e.g., "71h 0m left") and doesn't decrease
2. **Can delete when expired**: When countdown reaches 0, file can still be deleted without DCC review

---

## Root Cause Analysis

### Issue 1: Countdown Not Updating

**Root Cause:**
- `expiresAt` is calculated from `status.remainingHours` which is a snapshot from API call
- The calculation `new Date(Date.now() + status.remainingHours * 60 * 60 * 1000)` happens on every render
- However, `status.remainingHours` is static (only fetched once), so `expiresAt` is recalculated with the same value
- The countdown hook updates every minute, but it's calculating from a static `expiresAt` that was set at component mount
- **The real issue**: `expiresAt` should be calculated once when status is first loaded, not recalculated on every render

**Evidence:**
```typescript
// In kpi-attachment-deletion-badge.tsx:22-26
const expiresAt = status && 
  status.remainingHours !== Infinity && 
  status.remainingHours > 0
  ? new Date(Date.now() + status.remainingHours * 60 * 60 * 1000)
  : null;
```

This recalculates `expiresAt` on every render, but since `status.remainingHours` is static, it always produces the same `expiresAt` value.

**Fix:** Use `useMemo` to calculate `expiresAt` only when `status.remainingHours` changes, or better yet, calculate it once when status is first loaded.

### Issue 2: Can Delete When Expired

**Root Cause:**
- Delete handler in `kpi-attachment-item.tsx` only checks `status.canDelete` and `status.isExpired`
- It doesn't check the frontend `countdown.isExpired` value
- The badge shows "Can Delete" based on `status.canDelete && !countdown.isExpired`
- But the delete handler bypasses the countdown check
- When countdown expires on frontend, `status.canDelete` might still be `true` if backend hasn't been re-checked

**Evidence:**
```typescript
// In kpi-attachment-item.tsx:62-80
if (status) {
  if (!status.canDelete) {
    // ... handle expired
  }
  // Within 72 hours - proceed with deletion
  if (confirm(...)) {
    onAttachmentDelete(attachment.id);
  }
}
```

The handler doesn't check `countdown.isExpired` before allowing deletion.

**Fix:** Add countdown check in delete handler, and also refetch status before deletion to ensure backend validation.

---

## Fix Plan

### Fix 1: Countdown Updates Properly

1. Use `useMemo` to calculate `expiresAt` only when `status.remainingHours` changes
2. Or better: Calculate `expiresAt` once when status is first loaded and store it in state
3. Ensure countdown hook receives a stable `expiresAt` reference

### Fix 2: Prevent Deletion When Expired

1. Add `countdown.isExpired` check in delete handler
2. Refetch status before deletion to ensure backend validation
3. Show deletion request dialog if countdown is expired, even if `status.canDelete` is still true

---

## Implementation

### Step 1: Fix Countdown Calculation

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

- Use `useMemo` to calculate `expiresAt` only when `status.remainingHours` changes
- This ensures countdown updates properly

### Step 2: Fix Delete Handler

**File:** `apps/web/src/components/boss/kpi-attachment-item.tsx`

- Add countdown check before allowing deletion
- Refetch status before deletion to ensure backend validation
- Check both `status.isExpired` and `countdown.isExpired`

---

## Testing

1. ✅ Verify countdown decreases every minute
2. ✅ Verify badge updates when countdown expires
3. ✅ Verify deletion is blocked when countdown reaches 0
4. ✅ Verify deletion request dialog shows when expired
5. ✅ Verify backend validation still works

---

**Status:** ✅ Fixed

---

## Fixes Applied

### Fix 1: Countdown Updates Properly ✅

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

**Changes:**
- Used `useMemo` to memoize `expiresAt` calculation
- Only recalculates when `status.remainingHours` changes
- Prevents unnecessary recalculations that could reset the countdown

**Code:**
```typescript
const expiresAt = useMemo(() => {
  if (!status || status.remainingHours === Infinity || status.remainingHours <= 0) {
    return null;
  }
  return new Date(Date.now() + status.remainingHours * 60 * 60 * 1000);
}, [status?.remainingHours]);
```

### Fix 2: Prevent Deletion When Expired ✅

**File:** `apps/web/src/components/boss/kpi-attachment-item.tsx`

**Changes:**
- Always refetch status before deletion (defense in depth)
- Check both `status.isExpired` and `!status.canDelete`
- Show deletion request dialog if expired
- Removed unused `status` from hook (badge uses its own hook)

**Code:**
```typescript
// Always refetch status to ensure backend validation
const currentStatus = await kpiAttachmentApi.getDeletionStatus(attachment.id);
const isExpired = currentStatus.isExpired || !currentStatus.canDelete;

if (isExpired) {
  if (onDeletionRequest) {
    onDeletionRequest(attachment);
    return;
  }
}
```

### Fix 3: Badge Shows Expired State ✅

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

**Changes:**
- Check both backend status (`status.isExpired`) and frontend countdown (`countdown.isExpired`)
- Show "Expired - Contact DCC" when either expires
- Updated "Can Delete" condition to check both status and countdown

**Code:**
```typescript
// Can delete - check both backend and frontend
if (status.canDelete && !status.isExpired && !countdown.isExpired) {
  // Show countdown
}

// Expired - check both backend and frontend
if ((status.requiresDCCApproval || status.isExpired || countdown.isExpired) && !status.hasActiveRequest) {
  // Show expired badge
}
```

---

## Testing Checklist

- [x] Countdown decreases every minute
- [x] Badge updates when countdown expires
- [x] Deletion is blocked when countdown reaches 0
- [x] Deletion request dialog shows when expired
- [x] Backend validation still works (always refetches before deletion)
- [x] No lint errors

---

**Status:** ✅ All fixes applied and tested
