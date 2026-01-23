# KPI Attachment Deletion Workflow - Implementation Summary

**Date:** 2026-01-22  
**Status:** ✅ Completed

---

## Overview

Successfully applied the 72-hour deletion business logic to KPI attachments, matching the implementation for regular documents.

---

## Backend Changes

### 1. KpiAttachmentService Updates

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Changes:**
- ✅ Injected `DocumentDeletionService` dependency
- ✅ Added `getDeletionStatus()` method - checks 72-hour rule via DocumentDeletionService
- ✅ Added `submitDeletionRequest()` method - submits deletion requests via DocumentDeletionService
- ✅ Updated `deleteAttachment()` method:
  - Now uses `DocumentDeletionService.checkDeletionStatus()` to enforce 72-hour rule
  - Uses `DocumentDeletionService.selfDelete()` for actual deletion (within 72h)
  - Throws `ForbiddenException` if expired, prompting user to submit deletion request
  - Preserves KPI-specific logic (status revert, audit logging)

**Key Features:**
- Reuses existing `DocumentDeletionService` - no code duplication
- Maintains KPI record status auto-revert logic
- Proper error messages for expired files

### 2. KpiAttachmentController Updates

**File:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

**New Endpoints:**
- ✅ `GET /kpi/attachments/:id/deletion-status` - Get deletion status for attachment
- ✅ `POST /kpi/attachments/:id/deletion-request` - Submit deletion request

**Existing Endpoint Updated:**
- ✅ `DELETE /kpi/attachments/:id` - Now enforces 72-hour rule

---

## Frontend Changes

### 1. API Client Updates

**File:** `apps/web/src/lib/api.ts`

**New Methods:**
- ✅ `kpiAttachmentApi.getDeletionStatus()` - Fetch deletion status
- ✅ `kpiAttachmentApi.submitDeletionRequest()` - Submit deletion request

### 2. New Hook

**File:** `apps/web/src/hooks/use-kpi-attachment-deletion-status.ts`

- ✅ Custom hook to fetch and manage deletion status for KPI attachments
- ✅ Similar to `useDeletionStatus` but for KPI attachments

### 3. New Components

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`

- ✅ Displays deletion status badge
- ✅ Shows remaining time (e.g., "Can Delete (12h 30m left)")
- ✅ Shows "Expired - Contact DCC" when past 72 hours
- ✅ Shows "Pending DCC Review" for active requests
- ✅ Supports both "default" and "cyber" variants

**File:** `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx`

- ✅ Dialog for submitting deletion requests
- ✅ Form with reason field (min 10 characters)
- ✅ Optional replacement file ID field
- ✅ Proper validation and error handling

### 4. Updated Components

**File:** `apps/web/src/components/boss/kpi-attachment-list.tsx`

**Changes:**
- ✅ Added deletion status badge display for each attachment
- ✅ Updated delete handler to check status before deletion
- ✅ Shows deletion request dialog if file is expired
- ✅ Proper error handling and user feedback

---

## User Experience Flow

### Within 72 Hours:
1. User sees attachment with badge: "Can Delete (Xh Xm left)"
2. User clicks delete button
3. System checks status → allows deletion
4. User confirms → File deleted immediately

### After 72 Hours:
1. User sees attachment with badge: "Expired - Contact DCC"
2. User clicks delete button
3. System checks status → shows deletion request dialog
4. User fills reason and submits → Request sent to DCC
5. Badge changes to "Pending DCC Review"

### DCC Review:
1. DCC sees request in deletion requests page
2. DCC approves/rejects with comment
3. If approved → File deleted
4. If rejected → Badge shows "Rejected (Click for details)"

---

## Testing Checklist

- [ ] Upload KPI attachment
- [ ] Delete within 72 hours (should work)
- [ ] Try to delete after 72 hours (should show dialog)
- [ ] Submit deletion request
- [ ] Check deletion status badge displays correctly
- [ ] Verify DCC can review KPI attachment deletion requests
- [ ] Test rejection flow and comment display

---

## Files Modified

**Backend:**
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

**Frontend:**
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/boss/kpi-attachment-list.tsx`

**New Files:**
- `apps/web/src/hooks/use-kpi-attachment-deletion-status.ts`
- `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`
- `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx`

---

## Notes

- ✅ Reuses existing `DocumentDeletionService` - DRY principle
- ✅ Consistent with document deletion workflow
- ✅ Proper error handling and user feedback
- ✅ i18n compatible (uses translation keys)
- ✅ Supports both UI variants (default and cyber)

---

**Status:** Ready for testing and deployment
