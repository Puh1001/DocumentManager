# Phase 04 - Testing & QA for KPI PDF Upload & Permissions

## Context Links

- Parent plan: `./plan.md`
- Dependencies: Phase 01 (Backend API), Phase 02 (Frontend UI), Phase 03 (Authorization)
- Docs:
  - `../../docs/codebase-summary.md`
  - `../../docs/code-standards.md`
- Related files:
  - Existing test files in `apps/api/src/**/*.spec.ts`
  - Existing test files in `apps/web/src/**/*.test.tsx` or `*.spec.tsx`

## Overview

- **Date:** 2026-01-09
- **Priority:** High
- **Implementation Status:** Not started
- **Review Status:** Not reviewed
- **Description:** Comprehensive testing for KPI PDF upload, attachment management, permission enforcement, viewer functionality, and audit logging. Includes unit tests, integration tests, and end-to-end validation.

## Key Insights

- Existing codebase uses Jest for backend tests, likely React Testing Library for frontend.
- Permission system already has test patterns (CASL, PoliciesGuard).
- Document upload/storage has existing tests that can be referenced.
- Need to test edge cases: multiple attachments, permission combinations, copy protection bypass attempts.

## Requirements

### Functional Testing

- Backend API endpoints (upload, list, stream, download) work correctly.
- Permission enforcement: users without permission get 403.
- Multiple attachments per KPI record supported.
- PDF-only validation works (reject non-PDF files).
- Audit logging records all actions (upload, view, download, print, copy, edit).
- Frontend UI displays attachments correctly.
- Viewer opens with correct permissions (buttons show/hide).
- Copy protection activates when user lacks `copy` permission.

### Non-Functional Testing

- Performance: attachment list loads quickly (< 500ms for 10 attachments).
- Security: file paths never exposed in API responses.
- Error handling: graceful failures for network errors, invalid files, missing permissions.
- i18n: all UI text translated correctly.

## Architecture

- **Test Structure:**
  - Backend: Unit tests for services, integration tests for controllers.
  - Frontend: Component tests for UI, integration tests for API calls.
  - E2E: Manual testing checklist for complete flows.

- **Test Data:**
  - Create test users with different roles (boss, admin_dept, editor, viewer).
  - Create test KPI records and attachments.
  - Set up permission configurations for test scenarios.

## Related Code Files

### To Create

- `apps/api/src/modules/kpi/kpi-attachment.service.spec.ts` - Service unit tests
- `apps/api/src/modules/kpi/kpi-attachment.controller.spec.ts` - Controller integration tests
- `apps/web/src/components/boss/kpi-attachment-list.test.tsx` - Component tests
- `apps/web/src/components/boss/kpi-attachment-viewer.test.tsx` - Viewer component tests
- `apps/web/src/components/boss/__tests__/kpi-list-attachments.test.tsx` - Integration tests for KpiList with attachments

### To Modify

- Existing test setup files (if needed for test data factories, mocks)

## Implementation Steps

1. **Backend Unit Tests - KpiAttachmentService**
   1. Create `kpi-attachment.service.spec.ts`.
   2. Test `createAttachment()`:
      - Successfully creates attachment linking KPI and document.
      - Validates PDF MIME type.
      - Rejects non-PDF files.
      - Checks user has `create` permission.
   3. Test `listAttachments()`:
      - Returns attachments filtered by permissions.
      - Returns empty array if user has no `view` permission.
      - Includes metadata (fileName, uploadedBy, createdAt).
   4. Test `getAttachment()`:
      - Returns attachment if user has `view` permission.
      - Throws 403 if user lacks permission.
   5. Mock Prisma client and DocumentService.

2. **Backend Integration Tests - KpiAttachmentController**
   1. Create `kpi-attachment.controller.spec.ts`.
   2. Test `POST /kpi/records/:id/attachments`:
      - Uploads PDF successfully (multipart/form-data).
      - Returns 201 with attachment metadata.
      - Returns 403 if user lacks `create` permission.
      - Returns 400 if file is not PDF.
      - Returns 404 if KPI record not found.
   3. Test `GET /kpi/records/:id/attachments`:
      - Returns list of attachments (200).
      - Returns 403 if user lacks `view` permission.
      - Returns empty array if no attachments.
   4. Test `GET /kpi/attachments/:id/stream`:
      - Streams PDF content (200, Content-Type: application/pdf).
      - Returns 403 if user lacks `view` permission.
      - Returns 404 if attachment not found.
   5. Test `GET /kpi/attachments/:id/download`:
      - Downloads PDF with attachment headers.
      - Returns 403 if user lacks `download` permission.
   6. Use NestJS testing utilities (`@nestjs/testing`, `Test.createTestingModule`).

3. **Backend Permission Tests**
   1. Test CASL ability factory includes KPI permissions.
   2. Test `@CheckPolicies` decorator enforces permissions correctly.
   3. Test no default permissions granted (boss role has no KPI permissions unless assigned).
   4. Test permission combinations (user has view+download but not print).

4. **Backend Audit Logging Tests**
   1. Test audit log created on attachment upload.
   2. Test audit log created on view (stream endpoint).
   3. Test audit log created on download.
   4. Test audit log includes: userId, action, attachmentId, timestamp.
   5. Verify sensitive data (file paths) not logged.

5. **Frontend Component Tests - KpiAttachmentList**
   1. Create `kpi-attachment-list.test.tsx`.
   2. Test renders attachment chips correctly.
   3. Test shows "+N more" when more than 3 attachments.
   4. Test handles empty attachments array (shows "No attachments").
   5. Test click handler called when attachment clicked.
   6. Test hides column if user lacks `view` permission.
   7. Use React Testing Library, mock `useCanAccess` hook.

6. **Frontend Component Tests - KpiAttachmentViewer**
   1. Create `kpi-attachment-viewer.test.tsx`.
   2. Test renders PDF viewer on mount.
   3. Test shows Download button only if `canDownload` true.
   4. Test shows Print button only if `canPrint` true.
   5. Test copy protection enabled if `canCopy` false.
   6. Test close handler called on Close button click.
   7. Test loading state displayed while fetching PDF.
   8. Test error state displayed on fetch failure.
   9. Mock `api.fetchFileAsBlobUrl`, `useCanAccess`.

7. **Frontend Integration Tests - KpiList with Attachments**
   1. Create `kpi-list-attachments.test.tsx`.
   2. Test fetches attachments for each KPI on load.
   3. Test displays attachment column in table.
   4. Test clicking attachment opens viewer modal.
   5. Test handles API errors gracefully.
   6. Use MSW (Mock Service Worker) to mock API responses.

8. **Frontend Permission Tests**
   1. Test `useCanAccess('copy', 'Kpi')` returns correct boolean.
   2. Test permission checks update when user permissions change.
   3. Test UI elements hide/show based on permissions.

9. **E2E Manual Testing Checklist**
   1. **Upload Flow:**
      - User with `create` permission can upload PDF to KPI.
      - User without `create` permission sees error.
      - Non-PDF file rejected with error message.
      - Multiple PDFs can be uploaded to same KPI.
   2. **View Flow:**
      - User with `view` permission sees attachment column.
      - Clicking attachment opens viewer.
      - User without `view` permission doesn't see attachments.
   3. **Download Flow:**
      - User with `download` permission sees Download button.
      - Clicking Download saves PDF file.
      - User without `download` permission doesn't see button.
   4. **Print Flow:**
      - User with `print` permission sees Print button.
      - Print dialog opens on click (browser-dependent).
      - User without `print` permission doesn't see button.
   5. **Copy Protection:**
      - User without `copy` permission: right-click disabled, Ctrl+C blocked.
      - User with `copy` permission: copy protection disabled.
      - Test on Chrome, Firefox, Edge.
   6. **Permission Management:**
      - Admin can assign KPI permissions to roles.
      - Changes take effect immediately (no refresh needed).
      - Audit log records permission changes.
   7. **Multiple Attachments:**
      - KPI with 5 attachments shows 3 chips + "+2 more".
      - Clicking "+N more" expands to show all.
      - All attachments viewable individually.

10. **Performance Tests**
    1. Test attachment list loads < 500ms for 10 attachments.
    2. Test PDF viewer loads < 2s for 5MB PDF.
    3. Test no N+1 queries when fetching attachments for 20 KPIs.

11. **Security Tests**
    1. Test file paths never exposed in API responses.
    2. Test users cannot access attachments from other departments (if department filtering enabled).
    3. Test JWT token required for all endpoints.
    4. Test permission checks cannot be bypassed via direct API calls.

12. **Regression Tests**
    1. Test existing document upload still works (no regressions).
    2. Test existing KPI features still work (metrics, charts, export).
    3. Test existing permission system still works for other subjects (User, Department, etc.).

## Todo List

- [ ] Write backend unit tests for `KpiAttachmentService`.
- [ ] Write backend integration tests for `KpiAttachmentController`.
- [ ] Write backend permission tests (CASL, PoliciesGuard).
- [ ] Write backend audit logging tests.
- [ ] Write frontend component tests for `KpiAttachmentList`.
- [ ] Write frontend component tests for `KpiAttachmentViewer`.
- [ ] Write frontend integration tests for `KpiList` with attachments.
- [ ] Write frontend permission tests (`useCanAccess`).
- [ ] Complete E2E manual testing checklist.
- [ ] Run performance tests and document results.
- [ ] Run security tests and document findings.
- [ ] Run regression tests to ensure no breaking changes.
- [ ] Document test coverage report.

## Success Criteria

- All backend unit tests pass (coverage > 80% for new code).
- All backend integration tests pass.
- All frontend component tests pass.
- All frontend integration tests pass.
- E2E manual testing checklist completed with all items passing.
- Performance targets met (attachment list < 500ms, PDF load < 2s).
- Security tests pass (no exposed paths, permissions enforced).
- Regression tests pass (no breaking changes).
- Test coverage report generated and documented.

## Risk Assessment

- **Risk:** Test coverage insufficient, bugs slip through to production.
  - **Mitigation:** Aim for > 80% coverage on new code; prioritize critical paths (permissions, upload).
- **Risk:** E2E tests flaky due to timing issues or browser differences.
  - **Mitigation:** Use reliable selectors, add retries, test on multiple browsers.
- **Risk:** Performance tests fail due to test environment differences.
  - **Mitigation:** Document test environment; run on staging before production.

## Security Considerations

- Test that permission checks cannot be bypassed.
- Test that file paths are never exposed.
- Test that audit logs capture all sensitive actions.
- Test that copy protection works (acknowledge limitations).

## Next Steps

- Fix any failing tests.
- Address performance issues if found.
- Address security vulnerabilities if found.
- Prepare deployment plan with rollback strategy.
- Document known limitations (copy protection, browser compatibility).
