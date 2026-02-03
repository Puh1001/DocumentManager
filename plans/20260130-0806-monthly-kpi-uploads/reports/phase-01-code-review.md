# Code Review: Phase 01 — Database & API for Monthly KPI Uploads

**Scope:** Implementation per [phase-01-database-and-api.md](../phase-01-database-and-api.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 01 adds a nullable `month` (1–12) to `KpiAttachment`, optional `month` query on list, optional `month` on upload (default current month), and list filter `month = M OR month IS NULL` for legacy. Implementation matches the plan and code standards. A few minor suggestions and one follow-up for type safety after Prisma client regeneration.

---

## Critical Issues

**None.** No blocking security or correctness issues.

---

## Suggestions

### 1. DTO: multipart form and `month` type — **Done**

- **Where:** `CreateKpiAttachmentDto` — `month` with `@Type(() => Number)`.
- **Implemented:** Controller now coerces before calling service: `const month = body.month != null ? Number(body.month) : undefined` and passes that to `uploadAttachment`.

### 2. Service: remove temporary type assertions after Prisma regenerate — **Deferred**

- **Where:** `kpi-attachment.service.ts` — temporary casts and local types.
- **Status:** Deferred until `npx prisma generate` is run (requires network). After regenerate, remove `KpiAttachmentCreateWithMonth` / `KpiAttachmentWhereMonth`, the create-data cast, `where as any`, and the list-map casts so Prisma’s generated types are used.

### 3. Controller: optional 400 for invalid `month` query — **Done**

- **Where:** `listAttachments` — invalid `month` was ignored.
- **Implemented:** When `month` query is provided but invalid (NaN, &lt; 1, or &gt; 12), controller now throws `BadRequestException("month must be between 1 and 12 when provided")`.

---

## Positive Feedback

- **Schema:** `month Int?` and `@@index([kpiRecordId, month])` match plan; nullable for legacy, index supports filtered list. Migration is additive and reversible.
- **Validation:** Month 1–12 enforced in DTO (`@Min(1)`, `@Max(12)`) and again in service (list and upload); invalid values do not reach DB.
- **Legacy behavior:** List filter `OR: [{ month }, { month: null }]` correctly shows legacy (NULL) attachments in every month; no backfill.
- **Security:** No new endpoints or permissions; existing KPI create/list and department access checks unchanged. Month is a validated data field only.
- **API design:** List `?month=` optional; upload `month` optional with server default; backward compatible.
- **Controller:** Query parsing and 1–12 check before calling service; Swagger documents `month` for list and upload.
- **Naming / structure:** Matches code standards (kebab-case files, PascalCase types, explicit types). DTO uses ApiProperty and class-validator as in the rest of the codebase.

---

## Security

- **Input:** Month validated 1–12 in DTO and service; no injection surface.
- **Authorization:** Same guards and department checks as before; `month` does not change access control.
- **Data:** No PII in `month`; legacy NULL handling does not expose extra data.

---

## Performance

- **Index:** `(kpi_record_id, month)` supports `WHERE kpi_record_id = ? AND (month = ? OR month IS NULL)`.
- **List:** Single `findMany` with include; no N+1. Filter by month is a simple predicate.
- **Upload:** Unchanged (one create + audit + status update in a transaction).

---

## Compliance with Code Standards

| Area | Status |
|------|--------|
| File naming (kebab-case) | OK |
| DTO with ApiProperty + validators | OK |
| Controller: guards, Swagger | OK |
| Service: explicit types, error handling | OK (temporary casts documented) |
| No implicit any | OK (only explicit `as any` with eslint-disable and comment) |

---

## Verdict

**Approve with minor follow-up.** Implementation is correct, secure, and aligned with the plan and code standards. Recommended follow-up: after `prisma migrate` + `prisma generate`, remove temporary type assertions and use generated Prisma types.
