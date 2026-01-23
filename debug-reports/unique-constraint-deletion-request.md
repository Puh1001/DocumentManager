# Debug Report: Unique Constraint Failed on Deletion Request

**Date:** 2026-01-22  
**Issue:** `Unique constraint failed on the fields: (document_id)` when submitting deletion request  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

**Error:**
```
Unique constraint failed on the fields: (`document_id`)
```

**When:** User tries to submit a new deletion request for a document that already has a REJECTED request.

---

## Root Cause

**Schema Constraint:**
```prisma
model DeletionRequest {
  documentId String @unique @map("document_id") // One request per document
  // ...
}
```

**Problem Flow:**
1. User submits deletion request → Creates request with status PENDING ✅
2. DCC rejects request → Updates status to REJECTED ✅
3. User tries to submit again → `checkDeletionStatus()` returns `hasActiveRequest: false` (only checks PENDING) ✅
4. Code tries to `create()` new request → **FAILS** because `documentId` is unique ❌

**Issue:**
- `submitDeletionRequest()` checks `hasActiveRequest` (only PENDING)
- If request is REJECTED, `hasActiveRequest = false`
- Code tries to create new request
- Database rejects due to unique constraint on `documentId`

---

## Solution

**Option 1: Update existing REJECTED request (Recommended)**
- If document has REJECTED request, update it to PENDING instead of creating new
- Maintains schema constraint (one request per document)
- Allows users to resubmit after rejection

**Option 2: Change schema**
- Remove `@unique` from `documentId`
- Add composite unique on `(documentId, status)` where status = PENDING
- More complex, requires migration

**Recommended: Option 1**

---

## Fix Plan

**In `submitDeletionRequest()`:**
1. Check if document has ANY request (PENDING or REJECTED)
2. If has PENDING → throw error (already exists)
3. If has REJECTED → update to PENDING with new reason
4. If no request → create new

**Code:**
```typescript
// Check for existing request (any status)
const existingRequest = await prisma.deletionRequest.findUnique({
  where: { documentId },
});

if (existingRequest) {
  if (existingRequest.status === 'PENDING') {
    throw new BadRequestException('A deletion request for this document already exists');
  }
  // If REJECTED, update it to PENDING (resubmit)
  return await prisma.deletionRequest.update({
    where: { id: existingRequest.id },
    data: {
      status: 'PENDING',
      reason,
      replacementFileId,
      requestedBy: userId,
      requestedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      reviewerComment: null,
    },
    include: { document: true, requester: true, replacementFile: true },
  });
}

// No existing request, create new
return await prisma.deletionRequest.create({ ... });
```

---

## Files to Fix

1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Update `submitDeletionRequest()` to handle existing REJECTED requests

---

## Expected Behavior After Fix

1. User submits request → Creates PENDING request ✅
2. DCC rejects → Updates to REJECTED ✅
3. User resubmits → Updates REJECTED request to PENDING ✅
4. No unique constraint error ✅

---

## Status

✅ **FIXED** - `submitDeletionRequest()` now handles REJECTED requests by updating them to PENDING

**Implementation:**
- Check for existing request (any status) using `findUnique`
- If REJECTED → Update to PENDING (resubmit)
- If PENDING → Throw error (already exists)
- If APPROVED → Throw error (already processed)
- If no request → Create new

**Files Modified:**
1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Updated `submitDeletionRequest()` to handle resubmission of rejected requests

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ Logic: Handles all request statuses correctly
