# KPI Attachment Deletion Workflow

**Date:** 2026-01-22  
**Priority:** High  
**Status:** ✅ Completed

---

## Overview

Apply the same 72-hour deletion business logic to KPI attachments that was implemented for regular documents.

**Business Requirements:**
1. File uploaders can delete/re-upload files they or their department uploaded within 72 hours
2. After 72 hours, deletion requires DCC approval via deletion request
3. Front-end shows remaining time or prompts to contact DCC

---

## Current State

- ✅ KPI attachments use `Document` model (already has `uploadedBy`, `uploadedAt`, `deletionExpiresAt`)
- ✅ `DocumentDeletionService` exists with full deletion workflow
- ❌ KPI attachment deletion doesn't check 72-hour rule
- ❌ No deletion status endpoint for KPI attachments
- ❌ Frontend doesn't show deletion status/time remaining

---

## Implementation Plan

### Phase 1: Backend - Deletion Status & Rules
- Add deletion status endpoint for KPI attachments
- Update `deleteAttachment` to use `DocumentDeletionService`
- Add deletion request support for KPI attachments

### Phase 2: Frontend - UI Updates
- Show deletion status badge on KPI attachments
- Display remaining time or "Contact DCC" message
- Add deletion request dialog for expired files
- Update delete button behavior based on status

---

## Success Criteria

- ✅ Users can delete KPI attachments within 72 hours
- ✅ After 72 hours, deletion requires DCC approval
- ✅ Frontend clearly shows remaining time or expiration
- ✅ Deletion requests work for KPI attachments
- ✅ DCC can approve/reject KPI attachment deletion requests

---

## Files to Modify

**Backend:**
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

**Frontend:**
- `apps/web/src/components/boss/kpi-attachment-list.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

---

**Next:** See `phase-01-backend-deletion-status.md`
