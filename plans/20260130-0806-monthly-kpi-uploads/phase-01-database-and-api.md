# Phase 01: Database & API for Monthly KPI Uploads

## Context Links

- Parent: [plan.md](./plan.md)
- Research: [researcher-01-report.md](./research/researcher-01-report.md)
- Docs: `./docs/code-standards.md`, `./docs/system-architecture.md`
- Schema: `apps/api/prisma/schema.prisma`

## Overview

| Field | Value |
|-------|--------|
| Date | 2026-01-30 |
| Priority | High |
| Implementation status | Done |
| Review status | Done — see [phase-01-code-review.md](./reports/phase-01-code-review.md) |
| Description | Add `month` to KpiAttachment; extend list/upload API to support month filter and payload. |

## Key Insights

- KpiAttachment currently has no month; attachments are per KPI record (year). Adding `month` (1–12) scopes uploads to a specific month within the record’s year.
- **Legacy (NULL month):** Không backfill. Attachments cũ giữ `month = NULL`; khi list theo tháng M, trả về cả rows có `month = M` **và** `month IS NULL` → dữ liệu cũ hiển thị ở mọi tháng cùng năm.
- **Multiple files:** Cho phép nhiều file cùng tháng; không unique `(kpiRecordId, month)`.
- List endpoint: optional `month` query; when provided, return attachments where `month = M OR month IS NULL`.
- Upload: accept `month` in body; default to current month (server or client) when omitted.

## Requirements

### Functional

- KpiAttachment has a `month` field (1–12, nullable for existing data).
- GET `/kpi/records/:id/attachments` supports optional query `month` (1–12); when present, return attachments for that month **and** legacy attachments (`month IS NULL`), so old data appears in every month of the year.
- POST `/kpi/records/:id/attachments` accepts `month` (1–12); store with new attachment. Validate 1 ≤ month ≤ 12.

### Non-functional

- Migration reversible (add column only; no data loss).
- Backward compatible: list without `month` returns all attachments; existing attachments without month still returned.

## Architecture

- **DB**: New column `KpiAttachment.month` (Int?, 1–12). No unique on `(kpiRecordId, month)` — multiple files per month allowed. Index optional: `@@index([kpiRecordId, month])` for filtered list.
- **API**: Query validation for `month` (optional, 1–12). Create DTO includes `month` (optional; default current month). Service: list when month M → `where: { OR: [{ month: M }, { month: null }] }`; create with month (default current month if omitted).

## Related Code Files

**Modify**

- `apps/api/prisma/schema.prisma` — add `month` to KpiAttachment.
- `apps/api/src/modules/kpi/dto/create-kpi-attachment.dto.ts` — add `month`.
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` — query `month` on list; pass to service; body month on upload.
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` — list filter by month; create with month; validate month 1–12.

**Create**

- Prisma migration file (via `npx prisma migrate dev`).

## Implementation Steps

1. **Schema**
   - In `KpiAttachment`, add `month Int? @map("month")` (nullable). Do **not** add unique on `(kpiRecordId, month)` — multiple files per month allowed. Optionally add `@@index([kpiRecordId, month])`.
   - Run `npx prisma migrate dev --name add_kpi_attachment_month`.
   - Do **not** backfill; leave existing rows with `month = NULL` so they appear in every month (legacy behavior).

2. **DTO**
   - In `CreateKpiAttachmentDto`, add `month?: number` with `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(12)`. Decide if required for new uploads (then `@IsNumber()` and remove optional when product confirms).

3. **Controller**
   - List: `@Query('month') month?: string` — parse to number, validate 1–12, pass to service.
   - Upload: read `month` from body (multipart/form or JSON per current impl); pass to service.

4. **Service**
   - `getAttachments(kpiRecordId, month?: number)`: if month provided, `where: { kpiRecordId, OR: [{ month }, { month: null }] }` so legacy (NULL) attachments appear in every month. If month omitted, return all (no month filter).
   - `uploadAttachment(..., month?: number)`: create with `month: month ?? currentMonth` (default to current month when omitted). Validate 1–12 when provided.

5. **Response**
   - Ensure attachment list response includes `month` so frontend can display/filter.

## Todo List

- [x] Add `month` to Prisma schema and run migration.
- [x] Update CreateKpiAttachmentDto with month (validation 1–12).
- [x] Controller: list query `month`; upload body `month`.
- [x] Service: filter list by month; set month on create.
- [x] Do not backfill; legacy NULL month = show in all months.

## Success Criteria

- Migration runs; `KpiAttachment` has `month` (nullable).
- GET `/kpi/records/:id/attachments?month=3` returns attachments with month 3 **and** month NULL (legacy = all months).
- GET without `month` returns all attachments.
- POST with `month` creates attachment with that month; validation rejects month &lt; 1 or &gt; 12.

## Risk Assessment

- **Legacy attachments (NULL month):** Shown in every month’s list (OR month = M OR month IS NULL). No backfill.
- **Breaking clients:** Upload without month defaults to current month on server.

## Security Considerations

- No new permissions; reuse existing KPI attachment create/list permission and department access checks.
- Validate month on server (1–12) to avoid invalid data.

## Next Steps

- Proceed to Phase 02 (frontend month selector and attachment list/upload by month) after Phase 01 is implemented and reviewed.
