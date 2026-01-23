# Debug Report: Deletion Request Reject - UI Not Updating

**Date:** 2026-01-22  
**Issue:** After rejecting deletion request, UI still shows "Pending DCC Review"  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

User reported:
- Rejected deletion request ✅ (backend works)
- UI still shows "Pending DCC Review" ❌ (frontend not updating)
- Document badge still shows pending status

---

## Root Cause Analysis

### Issue 1: Backend `checkDeletionStatus()` Checks Wrong Status

**Problem:**
```typescript
// Line 96-100 in document-deletion.service.ts
const activeRequest = await prisma.deletionRequest.findUnique({
  where: { documentId },  // ❌ No status filter!
});

return {
  hasActiveRequest: !!activeRequest,  // ❌ Returns true even for REJECTED requests!
};
```

**Impact:**
- `hasActiveRequest` returns `true` for REJECTED/APPROVED requests
- Frontend badge shows "Pending DCC Review" even after rejection
- Logic should only check PENDING requests

### Issue 2: No WebSocket Event Broadcast on Reject

**Problem:**
```typescript
// Line 257-261 in document-deletion.service.ts
} else {
  this.logger.log(`Deletion request ${requestId} rejected...`);
  // ❌ No WebSocket broadcast!
}
```

**Impact:**
- Frontend doesn't know request was rejected
- `useDeletionStatus` hook doesn't refresh
- UI doesn't update in real-time

### Issue 3: Frontend Hook Doesn't Listen for Request Status Changes

**Problem:**
```typescript
// use-deletion-status.ts line 62-74
const handleSyncEvent = useCallback((event: SyncEvent) => {
  if (event.documentId === documentIdRef.current &&
      (event.type === 'document_updated' || event.type === 'document_deleted')) {
    fetchStatus();  // ❌ No event for deletion_request_rejected!
  }
}, [fetchStatus]);
```

**Impact:**
- Hook only refreshes on document events
- No refresh when deletion request status changes
- UI stays stale

---

## Evidence

**Backend Code:**
- `checkDeletionStatus()` line 96-100: No status filter
- `reviewRequest()` line 257-261: No WebSocket broadcast on reject

**Frontend Code:**
- `use-deletion-status.ts` line 62-74: Only listens to document events
- `deletion-status-badge.tsx` line 65-71: Shows "Pending" if `hasActiveRequest` is true

**Flow:**
1. User rejects request → Backend updates status to REJECTED ✅
2. Backend doesn't broadcast event ❌
3. Frontend `useDeletionStatus` doesn't refresh ❌
4. Badge still shows "Pending DCC Review" ❌

---

## Solution

### Fix 1: Backend - Only Check PENDING Requests

```typescript
// BEFORE (WRONG):
const activeRequest = await prisma.deletionRequest.findUnique({
  where: { documentId },
});

// AFTER (CORRECT):
const activeRequest = await prisma.deletionRequest.findFirst({
  where: {
    documentId,
    status: 'PENDING',  // Only PENDING requests are "active"
  },
});
```

### Fix 2: Backend - Broadcast WebSocket Event on Reject/Approve

```typescript
// In reviewRequest() after updating request:
if (approve) {
  await this.executeDelete(...);
  // Broadcast document_deleted event (already handled)
} else {
  // Broadcast deletion_request_rejected event
  this.folderSyncGateway.broadcastSyncEvent({
    type: 'deletion_request_rejected',
    documentId: request.documentId,
    data: { requestId: updatedRequest.id },
  });
}
```

### Fix 3: Frontend - Listen for Request Status Events

```typescript
// In use-deletion-status.ts:
const handleSyncEvent = useCallback((event: SyncEvent) => {
  if (event.documentId === documentIdRef.current &&
      (event.type === 'document_updated' ||
       event.type === 'document_deleted' ||
       event.type === 'deletion_request_rejected' ||  // NEW
       event.type === 'deletion_request_approved')) {  // NEW
    fetchStatus();
  }
}, [fetchStatus]);
```

---

## Files to Fix

1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Fix `checkDeletionStatus()` to only check PENDING requests (line 96-100)
   - Add WebSocket broadcast on reject (line 257-261)
   - Inject `FolderSyncGateway` for broadcasting

2. `apps/web/src/hooks/use-deletion-status.ts`
   - Add event types for deletion request status changes (line 62-74)

3. `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts`
   - Add new event types: `deletion_request_rejected`, `deletion_request_approved`

---

## Expected Behavior After Fix

1. User rejects request → Backend updates to REJECTED ✅
2. Backend broadcasts `deletion_request_rejected` event ✅
3. Frontend `useDeletionStatus` hook refreshes ✅
4. Badge updates to show correct status (no longer "Pending") ✅
5. DCC page removes rejected request from list ✅

---

## Status

✅ **FIXED** - All issues resolved

**Implementation:**
- ✅ Fixed `checkDeletionStatus()` to only check PENDING requests
- ✅ Added WebSocket broadcast on reject/approve
- ✅ Updated frontend hooks to listen for new event types
- ✅ Injected `FolderSyncGateway` into `DocumentDeletionService`

**Files Modified:**
1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Fixed `checkDeletionStatus()` to filter by status='PENDING' (line 96-100)
   - Added `FolderSyncGateway` injection
   - Added WebSocket broadcast on reject (line 257-261)

2. `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts`
   - Added new event types: `deletion_request_rejected`, `deletion_request_approved`

3. `apps/web/src/hooks/use-deletion-status.ts`
   - Added new event types to `SyncEvent` interface
   - Updated event handler to listen for request status changes

4. `apps/web/src/hooks/use-folder-sync.ts`
   - Added new event types to `SyncEvent` interface

5. `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`
   - Updated to listen for request status change events

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ ESLint: PASSED

**Expected Behavior:**
- After reject: Backend updates status to REJECTED ✅
- Backend broadcasts `deletion_request_rejected` event ✅
- Frontend hooks refresh deletion status ✅
- Badge updates to show correct status (no longer "Pending") ✅
- DCC page removes rejected request from list ✅
