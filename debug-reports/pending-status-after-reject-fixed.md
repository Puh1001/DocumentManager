# Debug Report: Pending Status Still Showing After Reject - FIXED

**Date:** 2026-01-22  
**Issue:** Document still shows "Pending DCC Review" after deletion request was rejected  
**Status:** ✅ **FIXED**

---

## Problem Summary

User reported:
- Rejected deletion request successfully ✅
- Deletion request page shows "No pending deletion requests" ✅
- But document list still shows "Pending DCC Review" ❌

---

## Root Cause

**Issue:** `checkDeletionStatus()` was using `findUnique()` instead of `findFirst()` with status filter.

**Problem Code:**
```typescript
// WRONG - finds ANY request (including REJECTED)
const activeRequest = await prisma.deletionRequest.findUnique({
  where: { documentId },
});
```

**Impact:**
- `findUnique()` finds the most recent request regardless of status
- REJECTED requests are still found and marked as "active"
- `hasActiveRequest` returns `true` even for rejected requests
- Frontend badge shows "Pending DCC Review" incorrectly

---

## Solution

**Fixed Code:**
```typescript
// CORRECT - only finds PENDING requests
const activeRequest = await prisma.deletionRequest.findFirst({
  where: {
    documentId,
    status: 'PENDING',  // Only PENDING requests are "active"
  },
});
```

**Why `findFirst` instead of `findUnique`:**
- `findUnique` requires a unique constraint on `documentId`
- But we need to filter by `status` as well
- `findFirst` allows filtering by multiple fields
- Since `documentId` is unique in the schema, `findFirst` will return at most one result

---

## Files Fixed

1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Line 98-102: Changed `findUnique` → `findFirst` with `status: 'PENDING'` filter

---

## Expected Behavior After Fix

1. User rejects deletion request → Backend updates status to REJECTED ✅
2. Backend broadcasts `deletion_request_rejected` event ✅
3. `checkDeletionStatus()` only finds PENDING requests ✅
4. `hasActiveRequest` returns `false` for rejected requests ✅
5. Frontend badge updates correctly:
   - If rejected: Shows "Rejected" badge with hover tooltip (if comment exists)
   - If no active request: Shows appropriate status based on expiration

---

## Verification

- ✅ TypeScript compilation: PASSED
- ✅ Logic fix: Only PENDING requests are considered "active"

**Next Step:** Restart backend server to apply the fix.

---

## Status

✅ **FIXED** - `checkDeletionStatus()` now correctly filters by status
