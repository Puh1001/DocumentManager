# Phase 01: Backend – Ensure folder structure when loading tree

**Plan:** [plan.md](./plan.md)  
**Dependencies:** None

## Overview

- **Date:** 2026-02-03
- **Priority:** High
- **Implementation status:** Done
- **Review status:** Done ([report](./reports/phase-01-code-review.md))
- **Description:** When folder tree is requested for a department, ensure that department’s folder structure exists before building the tree so "Không có thư mục nào" does not appear for valid departments.

## Key Insights

- `ensureDepartmentFolderStructure(departmentId)` is idempotent and already used on department create; safe to call when loading tree.
- Only departments that were created before auto-create (or with failed ensure) have no folders.
- Two options: ensure inside `getTree()` when `departmentId` is set, or new endpoint `POST /storage/folders/ensure-department/:id` called by frontend before tree. Option A: transparent, one round-trip. Option B: explicit, easier to test and audit.

## Requirements

### Functional

- When `GET /storage/folders/tree?departmentId=:id` is called, the department’s folder structure (root, KPI, ISO_documents, Maintenance, Delete_files, versions) must exist before building the tree.
- If structure does not exist, create it (reuse `FolderService.ensureDepartmentFolderStructure`), then return tree as usual.
- Caller (controller) must enforce access: only allowed users can trigger ensure for a given department (e.g. user in that department or admin/dcc/boss).

### Non-functional

- No breaking change to existing tree response shape.
- Ensure must be safe to call repeatedly (idempotent; already implemented).

## Architecture

- **Option A (locked – see [reports/decisions-and-requirements.md](./reports/decisions-and-requirements.md)):** In `FolderService.getTree(departmentId?, includeInternal)`, when `departmentId` is provided, call `ensureDepartmentFolderStructure(departmentId)` once at the start, then build tree as today. No new endpoint; transparent to frontend. Do **not** implement Option B.

## Related Code Files

- **Modify:** `apps/api/src/modules/storage/services/folder.service.ts` – in `getTree()`, when `departmentId` is set, call `ensureDepartmentFolderStructure(departmentId)` before building tree; wrap in try/catch and log on failure (do not fail tree load if ensure fails, to avoid breaking existing clients).
- **Optional modify:** `apps/api/src/modules/storage/controllers/folder.controller.ts` – if adding Option B, add POST ensure endpoint and guard.
- **Reference:** `apps/api/src/modules/department/services/department.service.ts` (create → ensure), `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` (ensure before upload).

## Implementation Steps

1. In `FolderService.getTree(departmentId?, includeInternal)`:
   - If `departmentId` is truthy, call `this.ensureDepartmentFolderStructure(departmentId)` in a try block. On success, continue; on error, log and continue (return tree from existing DB state).
2. Build tree as today (same `where`, `findMany`, `buildTree`).
3. Add/update unit tests: getTree with departmentId when department has no folders → ensure is called; tree returned includes created folders (or mock ensure and assert call).
4. (Optional) Add POST /storage/folders/ensure-department/:id with access check; document for frontend if using Option B.

## Todo List

- [x] Implement ensure-before-tree in getTree (Option A) or ensure endpoint (Option B)
- [x] Ensure access control: only allowed users can trigger ensure for department (unchanged; controller already passes departmentId)
- [x] Add/update FolderService and controller tests
- [x] Verify existing getTree(departmentId) and getTree() (no departmentId) behavior unchanged

## Success Criteria

- For a department that has no folders, calling GET /storage/folders/tree?departmentId=:id creates structure and returns a non-empty tree (at least dept root + KPI, ISO_documents, Maintenance, Delete_files as per ensureDepartmentFolderStructure).
- Existing behavior when department already has folders is unchanged.
- No regression for getTree() without departmentId.

## Risk Assessment

- **Ensure fails (e.g. SMB down):** Mitigation: catch, log, still return tree from DB so UI does not break.
- **Permission:** Ensure does not check user; caller (controller) already passes departmentId from client. If tree is filtered by department, ensure is only for that department; consider adding guard if tree endpoint is used by unprivileged users.

## Security Considerations

- getTree(departmentId) is already called with departmentId from frontend; backend should validate user can access that department (e.g. user’s departments or admin). If not already enforced, add guard in controller before calling getTree.

## Next Steps

- Phase 02: Frontend – department selector (multi-dept) and Documents-only picker for ISO upload.
