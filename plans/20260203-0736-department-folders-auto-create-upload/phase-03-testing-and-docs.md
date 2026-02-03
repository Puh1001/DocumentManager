# Phase 03: Testing & documentation

**Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 01, Phase 02

## Overview

- **Date:** 2026-02-03
- **Priority:** High
- **Implementation status:** Pending
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

- [ ] FolderService getTree tests (ensure + tree)
- [ ] Controller tests if new endpoint
- [ ] Frontend tests for picker (department + Documents only)
- [ ] Manual/E2E: multi-dept and single-dept upload flow
- [ ] Docs update

## Success Criteria

- All new/updated tests pass.
- Manual: “Không có thư mục nào” resolved when department has no folders (after ensure); ISO upload only to Documents folder; multi-dept can choose department.

## Risk Assessment

- Low; test and doc phase only.

## Security Considerations

- Tests should not expose or bypass permission checks; use authorized test user or mock permissions as in existing specs.

## Next Steps

- Implementation complete; optional follow-up: backend validation on document upload that folder is under ISO_documents (defense-in-depth).
