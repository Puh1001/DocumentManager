## Document Storage Layout Plan

**Goal**: Enforce a canonical SMB folder layout per department and tighten versioning + deletion behavior while keeping system architecture, sync, and permissions clean.

### Phases

1. **Phase 01 – Target Layout & Requirements** (planned)
   - File: `phase-01-target-layout-and-requirements.md`
   - Clarify exact folder structure, naming, and behavior for current files, versions, and deletions.

2. **Phase 02 – Backend Storage & Versioning Design** (planned)
   - File: `phase-02-backend-storage-and-versioning.md`
   - Update SMB + Prisma model usages (folder service, version service, deletion service) to obey new layout.

3. **Phase 03 – Permissions & UI Visibility** (planned)
   - File: `phase-03-permissions-and-ui-visibility.md`
   - Hide `versions` and `Delete files` from normal users while preserving admin/DCC workflows.

4. **Phase 04 – Data Migration & Rollout** (planned)
   - File: `phase-04-migration-and-rollout.md`
   - Migrate existing data to the new structure, backfill metadata, and define rollout + rollback steps.

### Status Summary

- Overall plan: **Draft**
- Storage layout analysis: **In progress** (see `research/researcher-01-report.md`)
- Permissions & UI analysis: **In progress** (see `research/researcher-02-report.md`)
