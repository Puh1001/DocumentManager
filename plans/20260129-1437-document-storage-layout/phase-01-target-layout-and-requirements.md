## Context Links

- Parent plan: `plans/20260129-1437-document-storage-layout/plan.md`
- Research:
  - Storage/layout: `research/researcher-01-report.md`
  - Permissions/UI: `research/researcher-02-report.md`
- Core docs: `docs/system-architecture.md`, `docs/codebase-summary.md`, `docs/project-overview-pdr.md`

## Overview

- **Date**: 2026-01-29
- **Description**: Define a precise, enforceable SMB folder layout for all documents per department, covering current files, versions, and deletions.
- **Priority**: High (impacts every document + KPI + maintenance file).
- **Implementation Status**: Planned.
- **Review Status**: Not yet reviewed.

## Key Insights

- Current system already uses **department roots** and section subfolders (`KPI`, `Documents`, `Maintenance`, `Deleted files`) but adds `current/` + `version/` layers.
- User wants a **simple mental model**: inside each section, files are directly visible, with a single `versions/` folder per section; `Delete files` + `versions` are admin-only.
- Any layout must **not break** checksum, versioning, and deletion workflows, and should stay compatible with SMB sync and Real-time updates.

## Requirements

1. **Per-department root**
   - Root folder name = `department.code` (existing behavior).
2. **Fixed section subfolders** under each department:
   - `KPI/` – KPI attachments and related documents.
   - `Maintenance/` – maintenance notices/docs.
   - `Documents/` – general ISO documents.
   - `Delete files/` – administrative area for deleted/archived docs (hidden from normal users).
3. **Within `KPI`, `Maintenance`, `Documents`**:
   - Current files are stored **directly** in the section folder (no `current/` subfolder in UI model).
   - A **single `versions/` folder** holds historical versions for that section; implementation may still use per-document subfolders under `versions/` for scalability.
4. **Deletion behavior**:
   - When a document is deleted (user self-delete or DCC decision), it is removed from the main section folder.
   - A copy (or last active file) is retained under the same section’s `versions/` tree OR under `Delete files/` depending on final design; requirement prefers `versions`.
5. **Visibility**:
   - `versions` and `Delete files` must be hidden from normal users in **all UIs** and tree APIs.
   - Only `admin` (and optionally `DCC`) can see and browse them.

## Architecture

- New canonical layout per department (conceptual):
  - `{dept}/KPI/`
    - Current files (by document id or safe name).
    - `versions/{documentId}/vNNN_...` (implementation detail).
  - `{dept}/Maintenance/`
    - Same pattern as KPI.
  - `{dept}/Documents/`
    - Same pattern as KPI.
  - `{dept}/Delete files/`
    - Admin-only, may mirror per-section subtrees or be used only for hard-deleted content.

## Related Code Files (for later phases)

- Backend:
  - `apps/api/src/modules/storage/services/folder.service.ts`
  - `apps/api/src/modules/storage/services/version.service.ts`
  - `apps/api/src/modules/storage/services/document-deletion.service.ts`
  - `apps/api/src/modules/storage/services/document.service.ts`
  - `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
- Frontend:
  - Document tree + browser components under `apps/web/src/app/[locale]/dashboard/documents`
  - Boss KPI components under `apps/web/src/components/boss/*` and `/dashboard/kpi/page.tsx`

## Implementation Steps (High-Level)

1. Finalize exact physical path patterns for:
   - Current files in each section.
   - Version files (including naming and subfolder structure).
   - Deleted/archived files.
2. Document all patterns in `docs/system-architecture.md` and `docs/deployment-guide.md` (storage section).
3. Agree on whether `Delete files/` is still needed in addition to `versions/`, or whether it becomes purely an admin archive overlay.
4. Define mapping rules for migration: from current `{dept}/{Section}/current` + `version/{documentId}` to new layout.
5. Define which roles get access to `versions` and `Delete files` (admin-only vs admin+DCC).

## Todo List

- [ ] Lock in target path patterns for current, versions, and deleted files.
- [ ] Decide on use of `Delete files/` vs `versions/` for long-term retention.
- [ ] Update architecture docs with final layout diagrams.
- [ ] Confirm role matrix for internal folders (admin, DCC, boss, others).

## Success Criteria

- Single, documented folder layout that matches business expectations and is consistent across all departments.
- No ambiguity on where current files, versions, and deleted files live for any section.
- Clear mapping from existing layout to new layout for migration scripts.

## Risk Assessment

- **Medium** risk of breaking legacy utilities or manual SMB access patterns if layout changes significantly.
- **Medium** migration risk: large number of files, potential path conflicts.
- **Low** technical risk if changes remain additive and carefully scripted.

## Security Considerations

- Internal folders (`versions`, `Delete files`) must never be exposed to non-admin users via API or UI.
- Strong audit logging is required for any admin operations in those folders (view, restore, purge).

## Next Steps

- Use this phase as input for Phase 02 (backend storage & versioning design) and Phase 03 (permissions & UI visibility).
- Once layout is fully specified and approved, derive concrete path formulas and migration logic.
