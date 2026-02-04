# KPI Status Month Selector (Boss UI)

## Overview
Add month selector to Boss KPI Status view so users can check which departments have "completed" KPI for a specific month and year.

## Current behavior
- Year selector only. "Completed" = KPI record has `status === "COMPLETED"` (set when any attachment is uploaded).

## Target behavior
- Year + **Month** (1–12) selectors.
- "Completed for month M": for each KPI record (of selected year), fetch attachments with `?month=M`. Record counts as completed for that month if it has ≥1 attachment for month M. Department completed for month M = all its records have ≥1 attachment for month M.
- No backend change: use existing `GET /kpi/records?departmentId=&year=` and `GET /kpi/records/:id/attachments?month=`.

## Scope
- **Frontend only**: `apps/web/src/components/boss/department-kpi-status.tsx`
- **i18n**: `boss.year` exists; add `boss.month` and use existing `boss.months.jan`…`dec` for dropdown.
- **API**: `kpiAttachmentApi.getAttachments(recordId, month)` already exists.

## Implementation (single phase)
1. Add `selectedMonth` state (1–12), default = current month.
2. In `loadStatuses`: for each dept fetch records; for each record fetch attachments with `selectedMonth`; treat record as completed for month when `attachments.length >= 1`; compute department status from these counts.
3. Add month dropdown next to year in header; wire to `selectedMonth`.
4. Add i18n key `month` in en/vi/zh boss.json.

## Out of scope
- New backend endpoints.
- Changing record-level status semantics.
