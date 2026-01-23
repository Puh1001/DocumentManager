# Debug Report: KPI Attachment Rejected Status Not Displayed

**Date:** 2026-01-22  
**Status:** 🔴 Critical Issue Found

---

## Problem Summary

When a deletion request for a KPI attachment is rejected:
- **User who submitted the request**: Doesn't see the "Rejected" status badge with button to view comments
- **DCC account**: Can still check it normally (in deletion requests page)

The rejected status and rejection details are not visible to the submitting user in the KPI attachment badge.

---

## Root Cause Analysis

### Issue: Missing Rejected Request Display Logic

**Root Cause:**
- `KpiAttachmentDeletionBadge` component is missing the logic to:
  1. Fetch rejected deletion requests
  2. Display rejected status badge
  3. Show dialog with rejection details (comment, reviewer, date)

- Regular `DeletionStatusBadge` (for documents) has this logic:
  - Fetches deletion request when `!status.hasActiveRequest`
  - Displays "Rejected (Click for details)" badge
  - Shows dialog with rejection comment, reviewer info, dates

- `KpiAttachmentDeletionBadge` only handles:
  - Can delete (within 72h)
  - Expired - Contact DCC
  - Pending DCC Review
  - No Permission
  - **Missing: Rejected status**

**Evidence:**

**Document Badge (has rejected logic):**
```typescript
// apps/web/src/components/documents/deletion-status-badge.tsx:49-72
useEffect(() => {
  if (!status || !status.hasActiveRequest) {
    // Check if there's a rejected request
    const fetchRequest = async () => {
      const request = await api.get<DeletionRequest | null>(
        `/storage/documents/${documentId}/deletion-request`
      );
      if (request && request.status === 'REJECTED') {
        setRejectionRequest(request);
      }
    };
    fetchRequest();
  }
}, [documentId, status]);

// Lines 128-229: Display rejected badge with dialog
```

**KPI Attachment Badge (missing rejected logic):**
```typescript
// apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx
// Only handles: canDelete, expired, pending, noPermission
// Missing: rejected status display
```

**Missing API Endpoint:**
- Documents have: `GET /storage/documents/:id/deletion-request`
- KPI attachments don't have: `GET /kpi/attachments/:id/deletion-request`

---

## Fix Plan

### Step 1: Add Backend Endpoint

**File:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

Add endpoint to get deletion request:
```typescript
@Get("attachments/:id/deletion-request")
@CheckPolicies({ action: "view", subject: "Kpi" })
@ApiOperation({ summary: "Get deletion request for KPI attachment (if exists)" })
async getDeletionRequest(
  @CurrentUserWithDepartment() user: UserWithDepartments,
  @Param("id") attachmentId: string
) {
  return this.attachmentService.getDeletionRequest(attachmentId, user);
}
```

### Step 2: Add Service Method

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

Add method to get deletion request by attachment ID:
```typescript
async getDeletionRequest(
  attachmentId: string,
  user: UserWithDepartments,
) {
  const attachment = await this.loadAttachmentWithRecord(attachmentId, user);
  return this.deletionService.getRequestByDocumentId(attachment.documentId);
}
```

### Step 3: Update Frontend API Client

**File:** `apps/web/src/lib/api.ts`

Add method to fetch deletion request:
```typescript
getDeletionRequest: (attachmentId: string) =>
  api.get<DeletionRequest | null>(
    `/kpi/attachments/${attachmentId}/deletion-request`
  ),
```

### Step 4: Update Badge Component

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

Add:
- State for rejection request and dialog
- useEffect to fetch rejected request
- Display logic for rejected badge
- Dialog component to show rejection details

---

## Implementation Details

### Backend Changes

1. **Controller**: Add GET endpoint for deletion request
2. **Service**: Add method to get deletion request via documentId

### Frontend Changes

1. **API Client**: Add `getDeletionRequest` method
2. **Badge Component**: 
   - Add state: `rejectionRequest`, `dialogOpen`
   - Add useEffect to fetch rejected request
   - Add rejected badge display (before "No Permission")
   - Add dialog with rejection details (copy from document badge)

---

## Testing

1. ✅ Submit deletion request for KPI attachment
2. ✅ DCC rejects with comment
3. ✅ User who submitted sees "Rejected (Click for details)" badge
4. ✅ Click badge opens dialog with:
   - Rejection comment
   - Reviewer name
   - Review date
   - Request reason
   - Request date
5. ✅ DCC can still see it in deletion requests page

---

**Status:** ✅ Fixed

---

## Fixes Applied

### Fix 1: Add Backend Endpoint ✅

**File:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

**Added:**
```typescript
@Get("attachments/:id/deletion-request")
@CheckPolicies({ action: "view", subject: "Kpi" })
@ApiOperation({ summary: "Get deletion request for KPI attachment (if exists)" })
async getDeletionRequest(
  @CurrentUserWithDepartment() user: UserWithDepartments,
  @Param("id") attachmentId: string
) {
  return this.attachmentService.getDeletionRequest(attachmentId, user);
}
```

### Fix 2: Add Service Method ✅

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Added:**
```typescript
async getDeletionRequest(
  attachmentId: string,
  user: UserWithDepartments,
) {
  const attachment = await this.loadAttachmentWithRecord(attachmentId, user);
  return this.deletionService.getRequestByDocumentId(attachment.documentId);
}
```

### Fix 3: Update Frontend API Client ✅

**File:** `apps/web/src/lib/api.ts`

**Added:**
```typescript
getDeletionRequest: (attachmentId: string) =>
  api.get<DeletionRequest | null>(
    `/kpi/attachments/${attachmentId}/deletion-request`
  ),
```

### Fix 4: Update Badge Component ✅

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

**Added:**
- State: `rejectionRequest`, `dialogOpen`
- useEffect to fetch rejected request when `!status.hasActiveRequest`
- Rejected badge display (before "No Permission")
- Dialog component with rejection details:
  - Rejection comment
  - Reviewer name
  - Review date
  - Request reason
  - Request date

**Logic:**
- Fetches deletion request when status is loaded and no active request
- Shows "Rejected (Click for details)" badge if request is rejected
- Opens dialog on click showing all rejection information

---

## Testing Checklist

- [x] Backend endpoint returns deletion request
- [x] Service method correctly gets request via documentId
- [x] Frontend API method works
- [x] Badge fetches rejected request
- [x] Badge displays "Rejected (Click for details)"
- [x] Dialog opens on click
- [x] Dialog shows rejection comment
- [x] Dialog shows reviewer information
- [x] Dialog shows dates
- [x] Works for both default and cyber variants

---

**Status:** ✅ All fixes applied
