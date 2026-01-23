# Phase 2: Frontend - UI Updates

**Date:** 2026-01-22  
**Priority:** High  
**Status:** ✅ Completed

---

## Goal

Update KPI attachment UI to show deletion status, remaining time, and handle deletion requests.

---

## Requirements

1. **Deletion Status Display**
   - Show badge with remaining time or "Expired" status
   - Display "Contact DCC" message when expired
   - Update delete button based on status

2. **Deletion Request Dialog**
   - Show dialog when user tries to delete expired file
   - Allow submitting deletion request with reason
   - Show pending request status

3. **API Integration**
   - Add deletion status API call
   - Add deletion request API call
   - Update delete API to handle errors properly

---

## Implementation

### Step 1: Update API Client

**File:** `apps/web/src/lib/api.ts`

```typescript
export const kpiAttachmentApi = {
  // ... existing methods
  
  getDeletionStatus: (attachmentId: string) =>
    api.get<DeletionStatus>(`/kpi/attachments/${attachmentId}/deletion-status`),
  
  submitDeletionRequest: (
    attachmentId: string,
    reason: string,
    replacementFileId?: string,
  ) =>
    api.post<DeletionRequest>(
      `/kpi/attachments/${attachmentId}/deletion-request`,
      { reason, replacementFileId },
    ),
};
```

### Step 2: Create Deletion Status Badge Component

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

```typescript
interface KpiAttachmentDeletionBadgeProps {
  attachmentId: string;
  documentId: string;
  variant?: 'default' | 'cyber';
}

export function KpiAttachmentDeletionBadge({
  attachmentId,
  documentId,
  variant = 'default',
}: KpiAttachmentDeletionBadgeProps) {
  // Fetch deletion status
  // Show badge with remaining time or expired status
  // Show "Contact DCC" if expired
}
```

### Step 3: Update KpiAttachmentList

**File:** `apps/web/src/components/boss/kpi-attachment-list.tsx`

- Add deletion status badge to each attachment
- Update delete button to check status first
- Show deletion request dialog if expired

### Step 4: Create Deletion Request Dialog

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-dialog.tsx`

- Dialog for submitting deletion request
- Form with reason field
- Optional replacement file upload
- Show pending request status

---

## UI Flow

1. **Within 72 hours:**
   - Show badge: "Can delete for X hours"
   - Delete button enabled
   - Click delete → Confirm → Delete

2. **After 72 hours:**
   - Show badge: "Expired - Contact DCC"
   - Delete button disabled or shows "Request Deletion"
   - Click → Show deletion request dialog

3. **Pending request:**
   - Show badge: "Pending DCC Review"
   - Delete button disabled
   - Show request details on hover/click

---

## Acceptance Criteria

- [ ] Deletion status badge displays correctly
- [ ] Remaining time shows accurately
- [ ] Expired files show "Contact DCC" message
- [ ] Deletion request dialog works
- [ ] Pending requests are visible
- [ ] All UI text is i18n compatible

---

**Status:** Ready for implementation
