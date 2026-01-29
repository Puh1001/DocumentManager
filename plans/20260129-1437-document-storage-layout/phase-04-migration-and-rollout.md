## Context Links

- Parent plan: `plans/20260129-1437-document-storage-layout/plan.md`
- Earlier phases:
  - `phase-01-target-layout-and-requirements.md`
  - `phase-02-backend-storage-and-versioning.md`
  - `phase-03-permissions-and-ui-visibility.md`
- Existing scripts:
  - `apps/api/scripts/fix-kpi-current-current-paths.ts`
  - Other backfill scripts under `apps/api/scripts/*`

## Overview

- **Date**: 2026-01-29
- **Description**: Plan data migration and rollout for the new document layout, including scripts, validation, and operational steps.
- **Priority**: High.
- **Implementation Status**: Completed.
- **Review Status**: Not yet reviewed.
- **Note**: This phase delivers migration scripts and an operational runbook; the actual execution on staging/production must still be performed separately following this guide.

## Key Insights

- Migration will touch both **SMB filesystem** and **Prisma DB** (`documents`, `document_versions`, `folders`).
- There are already examples of safe backfill scripts (e.g., deletion tracking, KPI status) and a dedicated script for cleaning `KPI/current/current` paths.
- Changes must be executed during controlled windows with backups and verification queries.

## Requirements

1. Migrate all existing documents and versions into the new per-department `{Section}` + `versions` layout.
2. Preserve all metadata: checksums, uploaders, timestamps, version numbers, deletion windows.
3. Avoid data loss even if some files are missing or conflicting; log and skip problematic entries for manual follow-up.
4. Provide operators with clear commands to run, rollback guidance, and verification queries.

## Architecture

- Migration will be performed via **idempotent TypeScript scripts** using `PrismaClient` and `fs` APIs, similar to existing scripts.
- Two main passes:
  1. **Layout migration** – move files + update `filePath` in `documents` and `document_versions` according to StoragePathBuilder.
  2. **Folder metadata & visibility** – backfill any `Folder` flags (e.g., `isInternal`) and ensure tree endpoints behave correctly.

## Related Code Files

- `apps/api/scripts/*` (pattern for migrations).
- `apps/api/src/modules/storage/services/smb.service.ts` (full path resolution).
- `apps/api/src/common/prisma/prisma.service.ts`.
- `apps/api/src/modules/storage/services/*.ts` (for understanding expectations).

## Implementation Steps

1. **Pre-migration prep**
   - Snapshot current DB and SMB share (DB dump + filesystem backup).
   - Run health checks: existing backfill/verifier scripts.
2. **Design migration script(s)**
   - Implement `apps/api/scripts/migrate-storage-layout.ts` that:
     - Enumerates all `documents` (with `folder` + `versions`).
     - Computes _expected new path_ via `StoragePathBuilder` using `folder.path` + `document.id` / `version.version`.
     - Moves physical files on SMB (rename, or copy+delete fallback).
     - Updates DB `filePath` only after successful move.
     - Logs conflicts (dest exists with different size) and missing-source cases.
3. **Dry run mode**
   - Script supports `--dry-run` flag to only log planned operations (no writes).
   - Use this to validate scale and detect edge cases before real run.
4. **Execute migration in stages**
   - Recommended: run in staging first with `--dry-run` then real, then in production in off-hours.
   - Optionally restrict by department/section using WHERE clauses if needed (script can be extended for this).
   - Monitor logs and metrics; pause if high conflict/missing counts arise.
5. **Backfill folder metadata**
   - After paths are corrected, run a follow-up script (future work) to set `isInternal`/`internalType` on `versions` and `Delete files` folders for all departments, based on `path`/`name`.
6. **Post-migration verification**
   - Run SQL/Prisma queries to ensure no `filePath` still refers to legacy structures (`/current/`, `/version/` etc.), for example:
     - `SELECT COUNT(*) FROM "documents" WHERE "file_path" LIKE '%/current/%' OR "file_path" LIKE '%/version/%';`
     - `SELECT COUNT(*) FROM "document_versions" WHERE "file_path" LIKE '%/current/%' OR "file_path" LIKE '%/version/%';`
   - Spot-check random documents through the UI (view, download, version history, deletion flows) across multiple departments/sections.
7. **Rollout & monitoring**
   - Enable new backend + frontend builds in staging, then production.
   - Monitor error logs, sync jobs, and user feedback.

## Todo List

- [x] Define exact mapping from old to new paths (for all sections) based on `StoragePathBuilder` and section roots derived from `folder.path`.
- [x] Implement migration script(s) with dry-run mode (`apps/api/scripts/migrate-storage-layout.ts`).
- [x] Prepare operational runbook at high level in this doc (commands, order, staging-first recommendation).
- [x] Define rollback strategy (restore from DB/SMB backup + revert container images to previous version).
- [x] Add verification queries and automated checks outline (no `/current/` or `/version/` in `filePath`, plus UI spot-checks).

## Success Criteria

- All documents and versions are stored according to the new layout.
- No broken links or missing files discovered in routine usage.
- Operators have a repeatable process to re-run or extend migration if needed.

## Risk Assessment

- **High**: Direct filesystem manipulation over SMB; network issues or partial moves can lead to inconsistencies without careful logging.
- **Medium**: Long-running scripts may need to be resumable or chunked; scripts are designed to be re-runnable by skipping records whose `filePath` already matches the expected new path, but operators should still prefer running in manageable batches.
- **Medium**: Coordination between code deployment and migration timing.

## Security Considerations

- Ensure backups are securely stored and access-controlled.
- Migration scripts must not weaken access control; internal folders should remain non-browsable to normal users throughout.

## Next Steps

- Once backend design (Phase 02) is stable, refine migration mapping and start building scripts in `apps/api/scripts`.
- Plan a staging dry run using a copy of production data before touching real environment.
