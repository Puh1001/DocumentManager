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
| Implementation status | Pending |
| Review status | Not started |
| Description | Add `month` to KpiAttachment; extend list/upload API to support month filter and payload. |

## Key Insights

- KpiAttachment currently has no month; attachments are per KPI record (year). Adding `month` (1–12) scopes uploads to a specific month within the record’s year.
- Existing rows: add `month` as nullable; backfill or leave NULL and treat as “legacy” in UI.
- List endpoint: optional `month` query; filter by month when provided.
- Upload: accept `month` in body (required or default to current month).

## Requirements

### Functional

- KpiAttachment has a `month` field (1–12, nullable for existing data).
- GET `/kpi/records/:id/attachments` supports optional query `month` (1–12); when present, return only attachments for that month.
- POST `/kpi/records/:id/attachments` accepts `month` (1–12); store with new attachment. Validate 1 ≤ month ≤ 12.

### Non-functional

- Migration reversible (add column only; no data loss).
- Backward compatible: list without `month` returns all attachments; existing attachments without month still returned.

## Architecture

- **DB**: New column `KpiAttachment.month` (Int?, 1–12). Index optional: `@@index([kpiRecordId, month])` for filtered list.
- **API**: Query validation for `month` (optional, 1–12). Create DTO includes `month` (optional or required by product). Service: filter list by month; create with month.

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
   - In `KpiAttachment`, add `month Int? @map("month")` (nullable). Optionally add `@@index([kpiRecordId, month])`.
   - Run `npx prisma migrate dev --name add_kpi_attachment_month`.
   - Optionally backfill existing rows (e.g. `month = 1` or leave NULL).

2. **DTO**
   - In `CreateKpiAttachmentDto`, add `month?: number` with `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(12)`. Decide if required for new uploads (then `@IsNumber()` and remove optional when product confirms).

3. **Controller**
   - List: `@Query('month') month?: string` — parse to number, validate 1–12, pass to service.
   - Upload: read `month` from body (multipart/form or JSON per current impl); pass to service.

4. **Service**
   - `getAttachments(kpiRecordId, month?: number)`: if month provided, add `where: { month }` (or `month: month ?? undefined`). Return list as today.
   - `uploadAttachment(..., month?: number)`: create KpiAttachment with `month: month ?? undefined`. If product requires month for new uploads, throw when month missing.

5. **Response**
   - Ensure attachment list response includes `month` so frontend can display/filter.

## Todo List

- [ ] Add `month` to Prisma schema and run migration.
- [ ] Update CreateKpiAttachmentDto with month (validation 1–12).
- [ ] Controller: list query `month`; upload body `month`.
- [ ] Service: filter list by month; set month on create.
- [ ] (Optional) Backfill existing KpiAttachment rows.

## Success Criteria

- Migration runs; `KpiAttachment` has `month` (nullable).
- GET `/kpi/records/:id/attachments?month=3` returns only attachments with month 3.
- GET without `month` returns all attachments (including those with NULL month).
- POST with `month` creates attachment with that month; validation rejects month &lt; 1 or &gt; 12.

## Risk Assessment

- **Legacy attachments (NULL month):** List “all” shows them; filtering by month excludes them. Mitigation: document behavior; optional backfill.
- **Breaking clients:** If mobile/other clients send upload without month, either make optional (default NULL) or require and version API.

## Security Considerations

- No new permissions; reuse existing KPI attachment create/list permission and department access checks.
- Validate month on server (1–12) to avoid invalid data.

## Next Steps

- Proceed to Phase 02 (frontend month selector and attachment list/upload by month) after Phase 01 is implemented and reviewed.
