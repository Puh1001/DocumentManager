# Plan: Department folders auto-create & ISO upload (Documents only)

**Created:** 2026-02-03  
**Status:** In progress (Phase 01–02 done)

## Goal

1. When a department has no folders → auto-create full structure (dept root, KPI, ISO_documents, Maintenance, Delete_files + versions) so "Không có thư mục nào" does not appear. **Option A:** ensure inside `getTree(departmentId?)` when departmentId is set.
2. **Everyone (including admin)** selects department when uploading from ISO documents page; upload goes into **Documents** (ISO_documents) folder of that department. Admin **view** permission unchanged (can still view files from all folders).
3. **List/browse:** Still show documents from **all folders** (no change). **Upload** (from ISO documents page) only → upload into **Documents** folder of the selected department.

## Phases

| Phase | Description                                                                              | Status  | Link                                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 01    | Backend: Ensure folder structure when loading tree (or dedicated endpoint)               | Done    | [phase-01-backend-ensure-folder-on-tree-load.md](./phase-01-backend-ensure-folder-on-tree-load.md)                                         |
| 02    | Frontend: Department selector (multi-dept) + Documents-only folder picker for ISO upload | Done    | [phase-02-frontend-department-selector-and-documents-only-picker.md](./phase-02-frontend-department-selector-and-documents-only-picker.md) |
| 03    | Testing, validation, docs                                                                | Pending | [phase-03-testing-and-docs.md](./phase-03-testing-and-docs.md)                                                                             |

## Context

- **Decisions (locked):** [reports/decisions-and-requirements.md](./reports/decisions-and-requirements.md) – Option A, everyone selects department for upload, list unchanged.
- **Research:** [research/researcher-01-report.md](./research/researcher-01-report.md), [research/researcher-02-report.md](./research/researcher-02-report.md)
- **Scout:** [scout/scout-01-report.md](./scout/scout-01-report.md)
- **Existing:** `FolderService.ensureDepartmentFolderStructure()` already creates structure; called only on department create. Tree load does not ensure; ISO upload has no "Documents only" restriction.

## Dependencies

- Phase 02 depends on Phase 01 (tree must return folders after ensure).
- Phase 03 after 01 and 02.

## Out of scope (this plan)

- Changing section name ISO_documents → Documents in DB/path (UI label only).
- KPI or Maintenance upload flows (unchanged).
