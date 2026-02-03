# Phase 03 Code Review: Testing & Documentation

**Scope:** Implementation per [phase-03-testing-and-docs.md](../phase-03-testing-and-docs.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 03 adds backend tests for month in list/upload, keeps Swagger month docs as-is, and updates README, system-architecture, and codebase-summary for monthly KPI attachments. Tests and docs align with the plan; a couple of test/docs gaps are noted below.

---

## Critical Issues

**None.** No security or correctness issues. Month validation (1–12) is covered for list; docs describe month for list and upload.

---

## Suggestions

### 1. Invalid month on upload (create) not covered by unit tests

**Phase requirement:** “Invalid month (0, 13) in create returns validation error.”

- **Controller spec:** Covers invalid `month` **query** for list (0, 13 → `BadRequestException`). Does not call upload with body `month: 0` or `month: 13`.
- **DTO:** `CreateKpiAttachmentDto` has `@Min(1)` `@Max(12)` on `month`; with `ValidationPipe`, invalid body month is rejected before the controller.

**Recommendation:** Either add a controller test that upload with `month: 0` or `month: 13` results in validation error (if ValidationPipe is applied in the test module), or document that invalid month on create is covered by DTO/e2e and leave unit tests as-is.

### 2. Service spec: `documentService.upload` call arity

**Location:** `apps/api/src/modules/kpi/services/kpi-attachment.service.spec.ts` (lines 201–205)

The test expects `documentService.upload` to have been called with 4 args:  
`("folder-1", mockPdfFile, mockAdminUser.userId, mockKpiRecord.title)`.  
The real service calls `this.documentService.upload(targetFolderId, file, user.userId, record.title, fileName)` (5 args).

**Recommendation:** If the real `DocumentService.upload` signature includes `fileName`, extend the expectation to 5 args and pass `undefined` as the 5th so the test stays accurate and avoids drift.

### 3. Phase doc: Review status

**Location:** `phase-03-testing-and-docs.md`

Review status is still “Not started”.

**Recommendation:** Set to “Done” (or “Done (see reports/phase-03-code-review.md)”) after this review.

---

## Positive Feedback

- **Controller spec:** Clear coverage for list with/without month and upload with month: `toMatchObject` for response, explicit 7-arg `uploadAttachment` and 3-arg `listAttachments` expectations; invalid month query (0, 13) throws `BadRequestException` and service is not called.
- **Service spec:** `$transaction` mock runs the callback with a consistent `tx` (kpiAttachment, auditLog, kpiRecord.update); all upload paths go through the same transaction shape. “should store month when provided (1-12)” asserts `create` data includes `month: 3` and return shape. “should filter by month when month provided (1-12)” asserts `findMany` with `OR: [{ month: 3 }, { month: null }]` (legacy behavior). FolderService, SmbService, DocumentDeletionService are mocked so the module compiles.
- **Docs:** README KPI section describes monthly filter and upload; API table mentions `?month=1…12` and body `month`. system-architecture.md documents GET `?month=` and POST body `month` and legacy NULL month. codebase-summary.md has “Monthly uploads” under KPI PDF Attachments and a “Latest Updates (2026-01-30)” bullet for monthly KPI uploads.
- **Standards:** Jest patterns and Nest testing style match existing specs; no new security surface; docs are markdown-only.

---

## Security

- No new endpoints or auth changes. Month is a filter/field; list/create still guarded by existing KPI policies. No issues identified.

---

## Performance

- Tests use mocks; no production path changes. Doc updates have no performance impact. No concerns.

---

## Checklist vs `code-standards.md`

| Item | Status |
|------|--------|
| Unit test style (describe/it, expect) | OK |
| No regression (existing tests extended, not replaced) | OK |
| API/docs describe month for list and upload | OK |
| KPI section reflects monthly uploads | OK |

---

## Verdict

**Approve with minor suggestions.** Phase 03 meets the plan: month covered in controller and service tests, Swagger already documents month, README/system-architecture/codebase-summary updated. Optional improvements: add or document coverage for invalid month on upload, align service spec `documentService.upload` expectation with 5-arg signature, and set phase review status to Done.

---

## Follow-up (Phase 03 suggestions implemented)

1. **Invalid month on create:** Not covered by controller unit tests (no ValidationPipe in test module). Documented: invalid body `month` (0, 13) is rejected by `CreateKpiAttachmentDto` `@Min(1)` `@Max(12)` via ValidationPipe at runtime; coverage is DTO/validation layer or e2e.
2. **Service spec `documentService.upload`:** Expectation updated to 5 args: `(folderId, file, userId, name, fileName)` with `undefined` as 5th (no fileName in test call).
3. **Phase doc review status:** Already set to Done with link to this report.
