# Phase 01: Database Schema Extension — Code Review

**Scope:** Code touched by [phase-01-database-schema.md](../phase-01-database-schema.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 01 adds ISO metadata fields to Document (preparerId, reviewerId, approverId, approvalDate, receiptDate), makes levelId required, and introduces User relations for preparer/reviewer/approver. Schema, migration, and service/sync/spec updates align with code standards. No critical security issues. One performance suggestion (cache default level in sync handler) and one minor i18n suggestion (split error codes).

---

## Critical Issues

**None.** Schema, migration order, FKs, and service validation are consistent and safe.

---

## Suggestions (addressed)

### 1. Cache default level in document-sync handler — DONE

**Where:** `apps/api/src/modules/storage/handlers/document-sync.handler.ts` (lines 175–187)

**Issue:** For each new document during sync, the handler calls `documentLevel.findFirst({ where: { code: "LEVEL1", isActive: true } })`. A large sync run does one extra query per document.

**Recommendation:** Resolve the default level once per sync run (e.g. at the start of the sync or when first creating a document) and reuse its `id` for all document creates in that run. Optional; only needed if sync creates many documents in one run.

### 2. Split error code for “levelId required” vs “invalid level”

**Where:** `apps/api/src/modules/storage/services/document.service.ts` (lines 181–192)

**Issue:** Both “levelId is required” and “Invalid or inactive document level” use `ErrorCodes.DOCUMENT.INVALID_LEVEL`. Frontend/i18n may want different messages or keys.

**Done:** Added `ErrorCodes.DOCUMENT.LEVEL_REQUIRED`; document.service uses it when levelId is missing; `INVALID_LEVEL` kept for invalid/inactive level.

### 3. Migration: make INSERT idempotent for empty table

**Where:** `apps/api/prisma/migrations/20260130170000_add_iso_metadata_phase01/migration.sql` (step 2)

**Current:** `INSERT ... ON CONFLICT ("code") DO NOTHING` — correct when LEVEL1 already exists. If `document_levels` is empty, INSERT runs once and succeeds.

**Note:** If the migration is re-run (e.g. custom rollback and re-apply), step 1 would fail with “column already exists”. Standard Prisma migrations are not re-run; no change required unless you add custom re-run handling.

---

## Positive Feedback

- **Schema:** Document model has clear ISO fields and relations; `levelId` required with `onDelete: Restrict`; preparer/reviewer/approver nullable with `onDelete: SetNull`. User model has matching reverse relations. Naming and `@map` match existing conventions.
- **Migration order:** Add nullable columns → ensure LEVEL1 exists → backfill `level_id` → drop FK → set NOT NULL → re-add FK → add user FKs → add indexes. Safe for existing data.
- **Backfill:** LEVEL1 is ensured before backfill; documents with null `level_id` get LEVEL1. No orphaned documents.
- **Upload service:** levelId required and validated; preparerId and receiptDate set from userId/now; level checked for existence and isActive.
- **Document-sync:** Uses default LEVEL1 for sync-created documents; skips create with a clear log if LEVEL1 is missing, avoiding bad data.
- **Tests:** document.service.spec passes levelId and mocks DocumentLevelService; “should throw when levelId is missing” covers validation. Deletion-workflow integration ensures LEVEL1 and uses testLevelId in all document creates.
- **Code standards:** kebab-case files, PascalCase types, explicit validation, no implicit any. Matches project patterns.

---

## Security

- **Authorization:** preparerId/reviewerId/approverId are set server-side (upload sets preparerId = userId). No client-supplied approver/reviewer on create.
- **Integrity:** FKs to users and document_levels; ON DELETE SET NULL for user refs avoids broken references when users are removed.
- **Sync:** Sync handler does not accept user input for level; it uses a fixed default (LEVEL1). No injection risk from level choice.

---

## Performance

- **Indexes:** New indexes on preparerId, reviewerId, approverId, approvalDate, receiptDate support filtering and joins. Appropriate for typical list/filter usage.
- **Upload:** One extra `documentLevelService.findById` per upload; lookup table is small. Acceptable.
- **Sync:** One `documentLevel.findFirst` per created document during sync; consider caching default level per run if sync volume is high (see Suggestion 1).

---

## Conclusion

Phase 01 is in good shape: schema, migration, and application code are consistent and safe. No critical or blocking issues. Suggestions are optional improvements (default-level cache in sync, optional error-code split, and migration re-run behavior if you ever support it).
