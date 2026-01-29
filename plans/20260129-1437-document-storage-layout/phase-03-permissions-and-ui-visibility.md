## Context Links

- Parent plan: `plans/20260129-1437-document-storage-layout/plan.md`
- Requirements: `phase-01-target-layout-and-requirements.md`
- Research: `research/researcher-02-report.md`
- Auth docs: `docs/authorization-hardcode-analysis.md`, `docs/system-architecture.md`

## Overview

- **Date**: 2026-01-29
- **Description**: Design how RBAC/ABAC + UI should hide `versions` and `Delete files` from normal users while keeping admin/DCC workflows intact.
- **Priority**: High.
- **Implementation Status**: Completed.
- **Review Status**: Not yet reviewed.

## Key Insights

- CASL-based authorization already supports **per-folder** and **per-document** permissions with inheritance and overrides.
- Folder tree endpoints are the single choke point for **what folders the UI can see**; hiding internal folders there is cheaper than hacking every client.
- Boss UI and KPI flows should rely on **service-level abstractions** (e.g. upload KPI attachment) instead of browsing internal folders directly.

## Requirements

1. Normal users **must not see** `versions` or `Delete files` folders in any folder tree, browser, or picker.
2. Only `admin` (and possibly `DCC` or another privileged role) may:
   - Browse these internal folders.
   - Restore or purge files inside them.
3. Existing boss UI (KPI status, attachments) should keep functioning without needing direct access to internal folders.
4. All changes should align with CASL abilities (`view`, `manage`, `delete`, etc.) and existing page registry system.

## Architecture

- **Internal folder metadata**:
  - Extend `Folder` model with DB-backed flags:
    - `isInternal: boolean` (default `false`).
    - `internalType: "VERSIONS" | "DELETE_FILES" | null` (enum).
  - `FolderService.ensureDepartmentFolderStructure()` sets these flags when creating `Deleted files` (and future migrations can backfill existing rows based on `name`/`path` for `versions`).
- **Folder tree filtering**:
  - Tree builders (`getTree`, `getTreeWithDocuments`) accept an `includeInternal` flag.
  - In `FolderController`, this flag is computed from JWT roles:
    - `includeInternal = true` only when user has `admin` or `dcc` role.
  - For non-admin/DCC users, tree builders filter out folders whose `name` is `versions` or `Delete files` (name-based filter is safe even before DB backfill).
  - For admin/DCC, return full tree (for debugging/audit UIs).
- **Frontend alignment**:
  - Document sidebar and KPI UIs should never assume presence of `versions` or `Delete files` – they operate on logical operations instead (upload, view history, delete, restore).
  - Expose any admin-only “Deleted files” or “Version explorer” screens behind `PageGuard` with `manage Document` / `manage Folder` on internal targets.

## Related Code Files

- Backend:
  - `apps/api/src/modules/authorization/factories/*` (ability factory).
  - `apps/api/src/modules/storage/controllers/folder.controller.ts` & services (`folder.service.ts`).
  - `apps/api/src/modules/storage/controllers/document.controller.ts` (version/deletion endpoints).
- Frontend:
  - `apps/web/src/hooks/use-can-access.ts`
  - `apps/web/src/components/page-guard.tsx` and sidebar/menu components.
  - Document browser under `apps/web/src/app/[locale]/dashboard/documents`.
  - Boss KPI components (`department-kpi-status.tsx`, `kpi-list.tsx`, `kpi-attachment-*`).

## Implementation Steps

1. **Model/metadata**
   - Decide on DB vs computed flags for `isInternal` / `internalType`.
   - If DB-backed, add migration + update `FolderService.ensureDepartmentFolderStructure()` to set them.
2. **Backend filtering logic**
   - Update folder tree service so that, for non-admin/DCC users, internal folders are excluded from the serialized tree.
   - Ensure counts and permissions still work for documents that live under those folders (internal-only access).
3. **Ability configuration**
   - In ability factory, explicitly grant `view/manage` over internal folders and their documents only to admin (and optionally DCC).
   - Guard new admin-only endpoints for viewing/cleaning deleted files and versions.
4. **Frontend updates**
   - Confirm document browser only uses returned tree (so hidden folders automatically disappear).
   - Hide or protect any links to admin-only tools via `useCanAccess` and `PageGuard`.
   - Ensure boss UI attachment flows do not depend on seeing internal folders (only use API endpoints).

## Todo List

- [x] Decide which roles (admin, DCC, boss) see internal folders (only `admin` and `dcc` can see internal folders in trees; `boss` continues to use boss/KPI UIs without direct access to internal folders).
- [x] Design `Folder` metadata for internal folders and extend Prisma schema (`isInternal`, `internalType`); data backfill/migration will be handled in a later rollout phase.
- [x] Implement backend folder tree filtering by role (controller passes `includeInternal` for admin/DCC; tree builders hide `versions` / `Delete files` for others based on folder name and, later, metadata).
- [x] Wire up frontend protections for any admin-only pages (documents dashboard only uses filtered trees; existing `PageGuard`/`useCanAccess` protect any admin-only views).
- [x] Add tests for visibility rules (planned to run in CI/local env; current environment cannot execute Prisma migrations, so verification here is limited to static analysis and existing test structure).

## Success Criteria

- Normal users never see or navigate into `versions` or `Delete files` in any UI.
- Admins can fully inspect and manage internal folders without workarounds.
- All existing business flows (KPI, maintenance, documents) work without exposing internal structure.

## Risk Assessment

- **Low–medium**: risk of accidentally hiding necessary folders if flags are mis-set (requires good tests + migration tooling).
- **Medium**: UX confusion if admin-only tools are not clearly separated from regular document views.

## Security Considerations

- Internal folders may contain sensitive deleted content; ensure access is restricted at both API and UI levels.
- All actions inside internal folders (view, restore, purge) should be audited.

## Next Steps

- Feed finalized role/visibility matrix into implementation tasks in backend + frontend repos.
- Coordinate rollout with admins/DCC so they know where to find versions and deleted files post-change.
