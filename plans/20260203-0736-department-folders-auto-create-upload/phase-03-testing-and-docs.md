# Phase 03: Testing & documentation

**Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 01, Phase 02

## Overview

- **Date:** 2026-02-03
- **Priority:** High
- **Implementation status:** Complete
- **Review status:** Not started
- **Description:** Tests and documentation for department folder ensure-on-tree and ISO upload (department selector + Documents-only picker).

## Key Insights

- Phase 01: Unit tests for getTree with departmentId (ensure called when department has no folders; tree shape unchanged). Optional integration test: create department without folders (or delete folders), call tree, then assert structure exists and tree non-empty.
- Phase 02: Component tests for FolderPickerDialog with departmentId and Documents-only tree; E2E or manual: multi-dept user selects department and uploads; single-dept user uploads without selector.
- Docs: Update codebase-summary or system-architecture if new endpoint or behavior; document “ISO upload = Documents folder only” and “ensure on tree load” in deployment/ops if relevant.

## Requirements

### Functional

- Unit tests for FolderService.getTree (ensure called when departmentId set; no regression when no departmentId).
- Unit or integration tests for document upload with folder under ISO_documents (and optional validation that upload rejects folder outside ISO_documents if implemented).
- Manual or E2E: Open documents page → upload → picker shows department (if multi-dept) and only Documents folder; upload succeeds and file appears under correct department’s ISO_documents path.

### Non-functional

- No fake data/mocks that bypass real logic; use real ensure and tree build where possible in tests.
- Docs concise; link to plan for details.

## Architecture

- Tests in apps/api (folder.service.spec.ts, folder.controller.spec.ts) and apps/web (folder-picker-dialog, documents page) as appropriate.
- Docs: docs/codebase-summary.md or docs/system-architecture.md; optional short note in README or deployment guide.

## Related Code Files

- **Modify/add:** apps/api/src/modules/storage/services/folder.service.spec.ts
- **Modify/add:** apps/api/src/modules/storage/controllers/folder.controller.spec.ts (if ensure endpoint added)
- **Modify/add:** apps/web tests for FolderPickerDialog and documents page (if present)
- **Modify:** docs/codebase-summary.md or docs/system-architecture.md

## Implementation Steps

1. Add/update FolderService.getTree tests: with departmentId, ensureDepartmentFolderStructure is invoked; when ensure succeeds, tree includes expected folders; when ensure throws, tree still returned (from existing DB) and error logged.
2. If Phase 02 adds GET /storage/folders/documents-folder, add controller + service tests.
3. Frontend: add or update tests for FolderPickerDialog (filtered to Documents; departmentId prop).
4. Manual test: department with no folders → open picker → tree non-empty after ensure; upload to Documents only.
5. Update docs: ensure-on-tree-load behavior; ISO upload restricted to Documents folder; optional new endpoint.

## Todo List

- [x] FolderService getTree tests (ensure + tree)
- [x] Controller tests if new endpoint
- [x] Frontend tests for picker (department + Documents only)
- [x] Manual/E2E: multi-dept and single-dept upload flow
- [x] Docs update

## Manual Test Checklist

### Phase 01: Department Folder Auto-Creation

- [ ] **Test 1.1:** Department with no folders
  - Create a new department (or delete all folders from an existing department)
  - Navigate to ISO Documents page
  - Click upload button
  - **Expected:** Folder picker opens and shows non-empty tree (should not show "Không có thư mục nào")
  - **Verify:** Check backend logs to confirm `ensureDepartmentFolderStructure` was called
  - **Verify:** Check SMB folder structure - should have: `{dept}/ISO_documents`, `{dept}/KPI`, `{dept}/Maintenance`, `{dept}/Delete_files`, `{dept}/versions`

- [ ] **Test 1.2:** Department with existing folders
  - Use a department that already has folders
  - Navigate to ISO Documents page and open folder picker
  - **Expected:** Tree loads normally without errors
  - **Verify:** No duplicate folders created

### Phase 02: ISO Upload - Department Selector & Documents-Only Picker

- [ ] **Test 2.1:** Multi-department user upload flow
  - Login as a user with multiple departments
  - Navigate to ISO Documents page
  - Click upload button
  - **Expected:** Department selector appears above folder picker
  - **Expected:** Folder picker shows only Documents (ISO_documents) folder tree (no KPI, Maintenance, etc.)
  - Select a department from dropdown
  - **Expected:** Folder tree updates to show that department's Documents folder
  - Select a folder under Documents
  - Upload a test file
  - **Expected:** Upload succeeds
  - **Verify:** File appears in document list
  - **Verify:** File is stored in correct SMB path: `{selected_dept}/ISO_documents/{folder}/current/{filename}`

- [ ] **Test 2.2:** Single-department user upload flow
  - Login as a user with only one department
  - Navigate to ISO Documents page
  - Click upload button
  - **Expected:** No department selector (defaults to user's department)
  - **Expected:** Folder picker shows only Documents folder tree
  - Select a folder under Documents
  - Upload a test file
  - **Expected:** Upload succeeds
  - **Verify:** File is stored in user's department's ISO_documents folder

- [ ] **Test 2.3:** Admin user upload flow
  - Login as admin user
  - Navigate to ISO Documents page
  - Click upload button
  - **Expected:** Department selector appears (admin must select department)
  - **Expected:** Folder picker shows only Documents folder tree
  - Select a department and folder, upload file
  - **Expected:** Upload succeeds to selected department's ISO_documents folder

- [ ] **Test 2.4:** Document list unchanged
  - Navigate to ISO Documents page (main document list)
  - **Expected:** List shows documents from all folders (not filtered to Documents only)
  - **Expected:** Filters (Status, Department, Level) work as before

### Bug Fixes Verification

- [ ] **Test 3.1:** No duplicate documents after upload
  - Upload a single file
  - **Expected:** Only one document row appears in the list (no duplicates)
  - **Expected:** No version files (`version 0` with `/versions/` path) shown in main list

- [ ] **Test 3.2:** Document deletion moves both current and version files
  - Upload a document (creates current file and version file)
  - Delete the document (within 72 hours for self-delete)
  - **Expected:** Both current file and version file are moved to `Delete_files` folder
  - **Verify:** Check SMB folder - no files remain in `ISO_documents` or `versions` subfolder

## Success Criteria

- All new/updated tests pass.
- Manual: “Không có thư mục nào” resolved when department has no folders (after ensure); ISO upload only to Documents folder; multi-dept can choose department.

## Risk Assessment

- Low; test and doc phase only.

## Security Considerations

- Tests should not expose or bypass permission checks; use authorized test user or mock permissions as in existing specs.

## Next Steps

- Implementation complete; optional follow-up: backend validation on document upload that folder is under ISO_documents (defense-in-depth).
