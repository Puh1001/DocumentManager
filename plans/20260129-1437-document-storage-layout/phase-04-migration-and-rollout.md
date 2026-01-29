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
- **Implementation Status**: Planned.
- **Review Status**: Not yet reviewed.

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
   - Extend or create new scripts that:
     - Enumerate all `documents` + `document_versions`.
     - Compute _expected new path_ via StoragePathBuilder.
     - Move physical files (with rename or copy+delete fallback).
     - Update DB `filePath` only after successful move.
     - Log conflicts (dest exists with different size) and missing-source cases.
3. **Dry run mode**
   - Support `--dry-run` flag to only log planned operations (no writes).
   - Use this to validate scale and detect edge cases before real run.
4. **Execute migration in stages**
   - Option A: per-department batches.
   - Option B: per-section (KPI, Documents, Maintenance) across departments.
   - Monitor logs and metrics; pause if high conflict/missing counts arise.
5. **Backfill folder metadata**
   - After paths are corrected, run a script to set `isInternal`/`internalType` on `versions` and `Delete files` folders, if DB-backed.
6. **Post-migration verification**
   - Run SQL queries to ensure no `filePath` still refers to legacy structures (`/current/`, `/version/` etc.).
   - Spot-check random documents through the UI (view, download, version history, deletion flows).
7. **Rollout & monitoring**
   - Enable new backend + frontend builds in staging, then production.
   - Monitor error logs, sync jobs, and user feedback.

## Todo List

- [ ] Define exact mapping from old to new paths (for all sections).
- [ ] Implement migration script(s) with dry-run mode.
- [ ] Prepare operational runbook (commands, order, expected duration).
- [ ] Define rollback strategy (restore from backup + revert container images).
- [ ] Add verification queries and automated checks.

## Success Criteria

- All documents and versions are stored according to the new layout.
- No broken links or missing files discovered in routine usage.
- Operators have a repeatable process to re-run or extend migration if needed.

## Risk Assessment

- **High**: Direct filesystem manipulation over SMB; network issues or partial moves can lead to inconsistencies without careful logging.
- **Medium**: Long-running scripts may need to be resumable or chunked.
- **Medium**: Coordination between code deployment and migration timing.

## Security Considerations

- Ensure backups are securely stored and access-controlled.
- Migration scripts must not weaken access control; internal folders should remain non-browsable to normal users throughout.

## Next Steps

- Once backend design (Phase 02) is stable, refine migration mapping and start building scripts in `apps/api/scripts`.
- Plan a staging dry run using a copy of production data before touching real environment.
