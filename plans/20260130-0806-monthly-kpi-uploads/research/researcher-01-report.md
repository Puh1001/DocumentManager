# Researcher 01: Backend & Data Model for Monthly KPI Uploads

**Aspect:** KPI data model, API, and storage for month-scoped uploads.

## Current State

- **KpiRecord**: `departmentId`, `year`, `title`, `target`, ... Unique `(departmentId, year, title)`. Records are year-scoped.
- **KpiMetric**: `kpiRecordId`, `values` JSON with `m1`..`m12` (monthly numeric values). No change needed for "monthly uploads" — metrics already per record/year.
- **KpiAttachment**: `kpiRecordId`, `documentId`, `description`, `createdById`. **No month field.** Attachments are per KPI record (effectively per year), not per month.
- **API**: `GET /kpi/records?departmentId=&year=`, `POST /kpi/records/:id/attachments` (upload), `GET /kpi/records/:id/attachments` (list). No month in query or body.
- **Storage**: KPI folder structure is `Department/KPI/current` (or similar); attachments not organized by month.

## Requirement Interpretation

"Uploads KPI theo từng tháng" = KPI uploads per month. So:
- User selects **Year** and **Month** (e.g. 2025, January).
- Attachments are scoped to a **month** within a KPI record (which is already year-scoped).
- List/filter attachments by month; upload associates attachment with selected month.

## Recommended Backend Changes

1. **Schema**
   - Add `month` (Int, 1–12) to `KpiAttachment`. Optional: allow NULL for legacy "no month" (default to current month or require migration).
   - Unique: `(kpiRecordId, documentId)` already unique via 1:1 Document. For "one file per month per record" semantics, consider unique `(kpiRecordId, month)` only if business rule is one attachment per month per KPI; otherwise allow multiple files per month (no extra unique).

2. **API**
   - `GET /kpi/records?departmentId=&year=` — unchanged.
   - `GET /kpi/records/:id/attachments?month=` — add optional `month` (1–12) query; filter list by month; if omitted, return all (or all with month set).
   - `POST /kpi/records/:id/attachments` — body/form: add required (or optional with default) `month` (1–12). Validate 1–12.
   - Export/stream/download: no change; attachment id is enough.

3. **Storage path (optional)**
   - Current: files under department KPI folder (e.g. `Department/KPI/current`).
   - Option A: Keep flat under `current`, only DB stores month.
   - Option B: Subfolders by month, e.g. `Department/KPI/2025/01`, `.../02`. Requires folder service changes and migration; better for large volume.

4. **Migration**
   - Add `month` column (nullable Int 1–12). Backfill: NULL or e.g. 1 (January) for existing rows. Frontend can treat NULL as "unspecified" and show in "all" or a legacy section.

## Key Files

- `apps/api/prisma/schema.prisma` — KpiAttachment model.
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` — list/upload params.
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` — create with month; list filter by month.
- `apps/api/src/modules/kpi/dto/create-kpi-attachment.dto.ts` — add month field.

## Risks

- Existing attachments without month: need clear UX (show in "All" or assign default month).
- If unique (kpiRecordId, month): only one file per month per KPI; confirm with product.

## Resolved (product)

- **Multiple files per month:** Cho phép nhiều file cùng tháng (no unique on kpiRecordId+month).
- **Legacy (NULL month):** Không backfill; list `?month=M` trả về (month = M) OR (month IS NULL) → dữ liệu cũ hiển thị mọi tháng cùng năm.
- **Upload default:** Khi không gửi month, default tháng hiện tại.
