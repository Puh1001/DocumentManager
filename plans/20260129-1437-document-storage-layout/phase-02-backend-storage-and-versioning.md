## Context Links

- Parent plan: `plans/20260129-1437-document-storage-layout/plan.md`
- Requirements: `phase-01-target-layout-and-requirements.md`
- Research: `research/researcher-01-report.md`
- Core backend docs: `docs/system-architecture.md`, `docs/codebase-summary.md`

## Overview

- **Date**: 2026-01-29
- **Description**: Design backend changes (NestJS + Prisma + SMB) to enforce the new per-department layout and versioning scheme.
- **Priority**: High.
- **Implementation Status**: Planned.
- **Review Status**: Not yet reviewed.

## Key Insights

- Current services (`FolderService`, `VersionService`, `DocumentService`, `DocumentDeletionService`) already centralize folder and version logic; we should extend them rather than scatter path math across features.
- KPI attachments have recently been hardened to always use the canonical KPI current folder – that pattern should be generalized for all sections.
- Backward compatibility and migration require that new logic can **interpret old paths** long enough to move them safely.

## Requirements

1. Eliminate dependency on `.../current` + `.../version` layout in code; replace with functions that map from `(departmentId, section, documentId, isVersion)` → path.
2. For new documents, generate physical paths according to the final layout from Phase 01 (likely Strategy B: `{dept}/{Section}/{docId}{ext}` + `{dept}/{Section}/versions/{docId}/vNNN_...`).
3. Ensure versioning still guarantees:
   - Single “current” file path per document.
   - Append-only version history with checksum + metadata.
4. Deletion flows must move or copy files according to the new rules (to `versions` and/or `Delete files`) and update `Document` + `DocumentVersion` as needed.
5. All changes must integrate with existing file sync and checksum logic.

## Architecture

- Introduce a **StoragePathBuilder** abstraction (can be a utility module or methods on `FolderService`):
  - `resolveSectionRoot(departmentId, section: "KPI" | "Documents" | "Maintenance" | "Delete files")`
  - `resolveCurrentPath(document)` → `sectionRoot/{document.id}{ext}`
  - `resolveVersionPath(document, versionNumber)` → `sectionRoot/versions/{document.id}/vNNN_timestamp_user.ext`
  - Optional helpers for deleted/archived paths if `Delete files` is used differently.
- `FolderService.ensureDepartmentFolderStructure()` becomes the single source of truth for creating:
  - Section roots (`KPI`, `Documents`, `Maintenance`, `Delete files`).
  - `versions` subfolders under each section (no `current`/`version` siblings).
- `VersionService.createVersion()` and any update flows delegate to StoragePathBuilder instead of manual string concatenation.

## Related Code Files

- `apps/api/src/modules/storage/services/folder.service.ts`
- `apps/api/src/modules/storage/services/version.service.ts`
- `apps/api/src/modules/storage/services/document.service.ts`
- `apps/api/src/modules/storage/services/document-deletion.service.ts`
- `apps/api/src/modules/storage/services/folder-sync.service.ts`
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

## Implementation Steps

1. **Define path builder contract** (TypeScript types + functions) and add it as a small utility module under `storage/utils` or inside `FolderService`.
2. **Refactor `VersionService`**:
   - Replace direct `baseFolderPath` string manipulation with calls to the path builder.
   - Ensure it works for all three sections (KPI, Documents, Maintenance).
3. **Refactor `FolderService.ensureDepartmentFolderStructure()`**:
   - Stop creating `current` and `version` siblings; instead create section roots + `versions` subfolders.
   - Persist any metadata flags needed later (e.g., `isInternal` for `versions`).
4. **Align `DocumentService.upload` + `updateFile`**:
   - Use the path builder for determining where current file and versions go.
   - Confirm deletion window + checksum logic still work.
5. **Adjust deletion workflows**:
   - Decide concretely whether deleted current files are moved to `versions` (as extra version entries) or to `Delete files`.
   - Update `DocumentDeletionService` to use new paths, still honoring 72h window + DCC approval.
6. **Update sync logic**:
   - `FolderSyncService` must treat `versions` and `Delete files` correctly:
     - Possibly exclude them from normal sync counts or handle them as special cases.
7. Add focused unit/integration tests for path builder + VersionService to lock in expected paths for each section.

## Todo List

- [ ] Design StoragePathBuilder signatures and section enum.
- [ ] Refactor VersionService to use builder for all paths.
- [ ] Update FolderService to create `{Section}` + `versions` only.
- [ ] Decide final deletion storage behavior and update DocumentDeletionService.
- [ ] Update sync service to respect new layout.
- [ ] Add tests covering path generation and migration edge cases.

## Success Criteria

- New documents and versions are always written to the canonical layout.
- Deletion and version history flows behave as before from the user’s perspective, but on top of new paths.
- No hard-coded `current/` or `version/` string concatenation remains in business logic.

## Risk Assessment

- **Medium**: path builder mistakes can break all file I/O; must be heavily tested.
- **Medium**: sync and deletion flows may reference old paths; incomplete refactor could cause orphaned files.
- **Low**: performance risk, as layout still uses per-document subfolders in `versions/`.

## Security Considerations

- Ensure path builder never allows path traversal (no user-controlled segments beyond validated names/ids).
- Version and deletion paths must not be guessable by unprivileged users; rely on IDs, not raw user-input filenames, for physical names.

## Next Steps

- Feed this design into Phase 03 (permissions & UI visibility) to ensure internal folders can be safely hidden.
- In Phase 04, design migration scripts to move existing files/paths onto the new scheme.
