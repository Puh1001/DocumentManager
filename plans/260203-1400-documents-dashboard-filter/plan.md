# Plan: Filter documents dashboard to ISO_documents only

**Created:** 2026-02-03  
**Status:** Planning

## Goal

Filter `/dashboard/documents` page to show **only** documents from the department's `ISO_documents` section. Exclude documents from `KPI`, `Maintenance`, and `Delete_files` sections.

**Product Owner Requirement (Vietnamese):**
> "Ở /dashboard/documents chỉ load trong thư mục Documents của department. Không cần hiển thị các files trong thư mục KPI, Maintenance và Delete_files."

**Interpretation:** The flat ISO documents list should only show documents stored in the department's **ISO_documents** section. Files in **KPI**, **Maintenance**, or **Delete_files** sections must NOT appear.

## Current State

- Backend: `DocumentService.findAll()` excludes `/versions/` and `Delete_files` folders
- Backend: Folder structure: `{dept.code}/KPI`, `{dept.code}/ISO_documents`, `{dept.code}/Maintenance`, `{dept.code}/Delete_files`
- Backend: `StoragePathBuilder.deriveSectionRootFromFolderPath()` normalizes legacy paths
- Frontend: `/dashboard/documents` calls `GET /storage/documents` and displays results
- Previous plan `20260203-0736` explicitly allowed showing documents from all folders

## Solution Approach

**Backend-centric filter:** Add path-based filtering in `DocumentService.findAll()` to only include folders whose section root is `ISO_documents`. This ensures all consumers of `GET /storage/documents` get correct behavior.

**Path matching logic:**
- Use `StoragePathBuilder.deriveSectionRootFromFolderPath()` to normalize folder paths
- Include folders where section root ends with `/ISO_documents` or equals `ISO_documents`
- Handles both new (`{dept}/ISO_documents`) and legacy (`{dept}/ISO_documents/current`) paths

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Backend: Add ISO_documents-only filter to `DocumentService.findAll()` | Pending |
| 02 | Frontend: Verify filtering works, update UX if needed | Pending |
| 03 | Testing: Unit tests, integration tests, regression checks | Pending |

## Constraints

- YAGNI, KISS, DRY principles
- Must not break existing KPI & Maintenance flows
- Backward compatible with legacy folder paths
- All tests must pass
- Code must compile

## Files to Modify

- `apps/api/src/modules/storage/services/document.service.ts` - Add ISO_documents filter
- `apps/api/src/modules/storage/services/document.service.spec.ts` - Add tests
- `apps/api/src/modules/storage/controllers/document.controller.spec.ts` - Update tests if needed
- `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Verify behavior (no changes expected)

## Dependencies

- Phase 02 depends on Phase 01
- Phase 03 depends on Phase 01 and 02

## Out of Scope

- Changing section names in database
- Modifying KPI or Maintenance upload flows
- Frontend filtering (backend handles it)
