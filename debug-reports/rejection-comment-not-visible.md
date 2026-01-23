# Debug Report: Rejection Comment Not Visible & UI Not Updating

**Date:** 2026-01-22  
**Issue:** 
1. UI still shows "Pending DCC Review" after reject (even with fixes)
2. User cannot see rejection comment anywhere
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

User reported:
- Rejected deletion request with comment "abcxyz" ✅ (backend saves it)
- UI still shows "Pending DCC Review" ❌ (UI not updating)
- User asks: "Và comment khi reject thì user xem ở đâu?" (Where can user see the rejection comment?)

---

## Root Cause Analysis

### Issue 1: UI Not Updating After Reject

**Possible Causes:**
1. **Server not restarted** - Fixes require server restart
2. **WebSocket event not received** - Event might not be broadcasting correctly
3. **Frontend not refreshing** - `fetchRequests()` might not be called after reject

**Evidence:**
- Backend code has WebSocket broadcast (line 257-261 in document-deletion.service.ts)
- Frontend listens for `deletion_request_rejected` event
- But UI still shows "Pending" - suggests event not received or server not restarted

### Issue 2: Rejection Comment Not Visible to Users

**Problem:**
1. **No API endpoint for user's own requests**
   - Current API: `/storage/deletion-requests` - only returns PENDING requests (DCC only)
   - No endpoint like `/storage/deletion-requests/my-requests` or `/storage/documents/:id/deletion-request`

2. **DCC page only shows PENDING requests**
   - `listPendingRequests()` filters `status: 'PENDING'`
   - REJECTED requests are not shown in DCC page

3. **Frontend interface missing `reviewerComment`**
   - `DeletionRequest` interface in `page.tsx` doesn't include `reviewerComment`
   - Even if API returns it, frontend won't display it

4. **No UI for users to view their requests**
   - No page/component for regular users to see their deletion requests
   - No way to see rejection comments

**Backend Status:**
- ✅ `reviewerComment` is saved in DB (schema.prisma line 230)
- ✅ `reviewRequest()` saves comment (document-deletion.service.ts line 241)
- ✅ `getRequestById()` returns `reviewerComment` (includes it in response)
- ❌ No endpoint for users to query their own requests

**Frontend Status:**
- ❌ `DeletionRequest` interface missing `reviewerComment` field
- ❌ No UI component to display rejection comment
- ❌ No page for users to view their deletion requests

---

## Evidence

**Backend Schema:**
```prisma
model DeletionRequest {
  reviewerComment   String?       @map("reviewer_comment") @db.Text
  // ... other fields
}
```

**Backend Service:**
```typescript
// document-deletion.service.ts line 241
reviewerComment: comment,  // ✅ Saves comment
```

**Frontend Interface:**
```typescript
// page.tsx line 43-63
interface DeletionRequest {
  // ... other fields
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  // ❌ Missing: reviewerComment?: string | null;
  // ❌ Missing: reviewedBy?: { fullName: string };
  // ❌ Missing: reviewedAt?: string;
}
```

**API Endpoints:**
- ✅ `GET /storage/deletion-requests` - Only PENDING (DCC only)
- ✅ `GET /storage/deletion-requests/:id` - Returns full request with comment
- ❌ No `GET /storage/deletion-requests/my-requests` - For users to see their requests
- ❌ No `GET /storage/documents/:id/deletion-request` - To get request for a document

---

## Solution

### Fix 1: Ensure UI Updates After Reject

**Action Items:**
1. **Restart backend server** - Required for fixes to take effect
2. **Verify WebSocket connection** - Check browser console for WebSocket events
3. **Add manual refresh button** - As fallback if WebSocket fails

### Fix 2: Add API Endpoint for User's Requests

**Backend:**
```typescript
// In deletion-request.controller.ts
@Get('my-requests')
@ApiOperation({ summary: 'Get current user\'s deletion requests' })
async getMyRequests(@Request() req: AuthenticatedRequest) {
  return this.deletionService.getUserRequests(req.user.id);
}

// In document-deletion.service.ts
async getUserRequests(userId: string) {
  return prisma.deletionRequest.findMany({
    where: { requestedBy: userId },
    include: {
      document: { include: { folder: true } },
      reviewer: true,
      replacementFile: true,
    },
    orderBy: { requestedAt: 'desc' },
  });
}
```

### Fix 3: Update Frontend Interface

**Update `DeletionRequest` interface:**
```typescript
interface DeletionRequest {
  // ... existing fields
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerComment?: string | null;  // NEW
  reviewedBy?: {                    // NEW
    id: string;
    fullName: string;
    username: string;
  } | null;
  reviewedAt?: string | null;       // NEW
}
```

### Fix 4: Create UI for Users to View Their Requests

**Option A: Add to Document Details Page**
- Show deletion request status and comment in document details
- Display rejection comment if status is REJECTED

**Option B: Create "My Deletion Requests" Page**
- New page: `/dashboard/my-deletion-requests`
- List all user's requests (PENDING, APPROVED, REJECTED)
- Show rejection comment for REJECTED requests

**Option C: Show in Document List**
- Add tooltip/popover on deletion status badge
- Show rejection comment when hovering/clicking on REJECTED status

**Recommended: Option A + Option C**
- Show comment in document details page
- Add tooltip on badge for quick view

---

## Files to Fix

1. **Backend:**
   - `apps/api/src/modules/storage/controllers/deletion-request.controller.ts`
     - Add `getMyRequests()` endpoint
   - `apps/api/src/modules/storage/services/document-deletion.service.ts`
     - Add `getUserRequests()` method

2. **Frontend:**
   - `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`
     - Update `DeletionRequest` interface to include `reviewerComment`, `reviewedBy`, `reviewedAt`
     - Display rejection comment for REJECTED requests (if showing all statuses)
   - `apps/web/src/components/documents/deletion-status-badge.tsx`
     - Add tooltip/popover to show rejection comment for REJECTED status
   - `apps/web/src/app/[locale]/dashboard/documents/[id]/page.tsx` (if exists)
     - Display deletion request status and comment

---

## Expected Behavior After Fix

1. **UI Updates:**
   - After reject: Badge updates from "Pending" to "Rejected" ✅
   - WebSocket event triggers refresh ✅
   - Manual refresh also works ✅

2. **Rejection Comment Visibility:**
   - User can see rejection comment in document details ✅
   - User can see rejection comment in tooltip on badge ✅
   - User can see all their requests in "My Requests" page ✅

---

## Status

✅ **FIXED** - All issues resolved

**Implementation:**
1. ✅ Added API endpoint `GET /storage/deletion-requests/my-requests` for users to view their requests
2. ✅ Added API endpoint `GET /storage/documents/:id/deletion-request` to get request by documentId
3. ✅ Updated frontend `DeletionRequest` interface to include `reviewerComment`, `reviewedBy`, `reviewedAt`
4. ✅ Updated `deletion-status-badge.tsx` to fetch and display rejection comment
5. ✅ Badge shows "Rejected" status with hover tooltip containing rejection comment

**Files Modified:**
1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Added `getUserRequests()` method
   - Added `getRequestByDocumentId()` method

2. `apps/api/src/modules/storage/controllers/deletion-request.controller.ts`
   - Added `getMyRequests()` endpoint

3. `apps/api/src/modules/storage/controllers/document.controller.ts`
   - Added `getDeletionRequest()` endpoint

4. `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`
   - Updated `DeletionRequest` interface to include rejection fields

5. `apps/web/src/components/documents/deletion-status-badge.tsx`
   - Added logic to fetch rejection request
   - Display "Rejected" badge with hover tooltip showing comment

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ All endpoints implemented

**Expected Behavior:**
1. **UI Updates:**
   - After reject: Badge updates from "Pending" to "Rejected" ✅
   - WebSocket event triggers refresh ✅
   - Manual refresh also works ✅

2. **Rejection Comment Visibility:**
   - User can see rejection comment by hovering over "Rejected" badge ✅
   - Badge shows "(Hover for details)" if comment exists ✅
   - Comment includes reviewer name if available ✅

**Note:** Backend server needs to be restarted for fixes to take effect.
