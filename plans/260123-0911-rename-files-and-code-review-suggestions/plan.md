# Rename Files & Code Review Suggestions Implementation

**Date:** 2025-01-23  
**Status:** In Progress

## Overview

1. Implement code review suggestions from `docs/code-review/260126-unique-id-filename-review.md`
2. Add rename functionality for documents and KPI attachments

## Requirements

### Code Review Suggestions
1. ✅ Extension validation utility - Already implemented in `file.util.ts` and used in `version.service.ts`
2. ✅ Improve cleanup error handling - Already done
3. ✅ Add migration metrics - Already done
4. ✅ Consider transaction safety - Already done
5. ⚠️ Add unit test for cleanup logic - Need to implement

### Rename Functionality
1. Add PATCH endpoint to rename documents (`/storage/documents/:id`)
2. Add PATCH endpoint to rename KPI attachments (`/kpi/attachments/:id`)
3. Update `name` and `fileName` fields in database
4. Validate new name (not empty, sanitize)
5. Add audit logging for rename operations
6. Check permissions before allowing rename

## Implementation Phases

### Phase 1: Code Review - Unit Test for Cleanup Logic
- Add test case in `version.service.spec.ts` for cleanup of old files

### Phase 2: Document Rename
- Create DTO for rename request
- Add `rename` method in `DocumentService`
- Add PATCH endpoint in `DocumentController`
- Add permission checks
- Add audit logging

### Phase 3: KPI Attachment Rename
- Add `rename` method in `KpiAttachmentService`
- Add PATCH endpoint in `KpiAttachmentController`
- Add permission checks
- Add audit logging

### Phase 4: Frontend Integration
- Add rename API methods in `api.ts`
- Add rename UI components/actions
- Update document list and KPI attachment list to support rename

## Files to Modify

### Backend
- `apps/api/src/modules/storage/services/version.service.spec.ts` - Add cleanup test
- `apps/api/src/modules/storage/dto/rename-document.dto.ts` - New DTO
- `apps/api/src/modules/storage/services/document.service.ts` - Add rename method
- `apps/api/src/modules/storage/controllers/document.controller.ts` - Add PATCH endpoint
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Add rename method
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` - Add PATCH endpoint

### Frontend
- `apps/web/src/lib/api.ts` - Add rename API methods
- `apps/web/src/components/documents/document-list.tsx` - Add rename UI
- `apps/web/src/components/boss/kpi-attachment-list.tsx` - Add rename UI
