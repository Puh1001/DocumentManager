# Phase 02: Frontend — Month Selector & Monthly Uploads

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-01-database-and-api.md](./phase-01-database-and-api.md)
- Research: [researcher-02-report.md](./research/researcher-02-report.md)
- Docs: `./docs/code-standards.md`, `./docs/frontend-development` (if any)

## Overview

| Field | Value |
|-------|--------|
| Date | 2026-01-30 |
| Priority | High |
| Implementation status | Done |
| Review status | Done (see [reports/phase-02-code-review.md](./reports/phase-02-code-review.md)) |
| Description | Add month dropdown next to year on KPI page; scope attachment list and upload to selected month. |

## Key Insights

- Current KPI page has only Year dropdown (current ± 5). Screenshot shows empty space for month next to “Year 2025”.
- Records load remains by department + year; only attachment list and upload are month-scoped.
- **Default month:** Chọn sẵn tháng hiện tại — `selectedMonth` default = `new Date().getMonth() + 1`.
- **Multiple files:** Cho phép nhiều file một tháng; UI không giới hạn số lượng upload.

## Requirements

### Functional

- Month selector next to Year (1–12 or “All months”). Same row, top-right of main content.
- When a month is selected: list attachments for each KPI record filtered by that month; upload sends selected month.
- When “All months”: list all attachments for the record (no month filter); upload defaults to current month when “All” selected.
- Unsaved-changes warning when switching month (same as year/department).

### Non-functional

- i18n for month labels (EN, VI, ZH).
- Reuse existing attachment components; extend props/API client for month.

## Architecture

- **State:** `selectedMonth: number | null` (1–12 or null = “All”). **Default: current month** (`new Date().getMonth() + 1`).
- **API client:** `getAttachments(recordId, month?: number)`; `uploadAttachment(recordId, file, folderId?, description?, month?)`.
- **Components:** KpiAttachmentList receives optional month filter (or backend returns filtered list); KpiAttachmentUpload receives current selectedMonth and sends in upload.

## Related Code Files

**Modify**

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` — add selectedMonth state; month dropdown; pass month to attachment fetch and upload; unsaved check on month change.
- `apps/web/src/components/boss/kpi-attachment-upload.tsx` — accept `month` prop; include in upload payload.
- `apps/web/src/components/boss/kpi-attachment-list.tsx` — optional display/filter by month if needed (or rely on backend-filtered list).
- `apps/web/src/lib/api.ts` — `kpiAttachmentApi.getAttachments(recordId, month?)`, `uploadAttachment(..., month?)`.
- Locale JSON under `apps/web/` (e.g. `messages/en.json`, `vi.json`, `zh.json`) — add keys for “Month”, “All months”, “January”…“December”.

## Implementation Steps

1. **State & UI**
   - Add `selectedMonth` state (number | null). **Default: current month** — `useState<number | null>(() => new Date().getMonth() + 1)`.
   - In the same flex row as the Year dropdown, add a Month `<select>`: options “All months” (value "") plus 1–12 (or Jan–Dec). Set value from `selectedMonth`; on change update state and confirm if unsaved.

2. **Load attachments**
   - In the effect that loads attachments per record, call API with current month when selected: `getAttachments(record.id, selectedMonth ?? undefined)`. When “All months”, call without month param.

3. **Upload**
   - Pass `selectedMonth` into `KpiAttachmentUpload`. On upload, send `month: selectedMonth` (or current month if “All” and product allows). If “All” and upload must have month, either default to current month or disable upload until a month is selected.

4. **API client**
   - `getAttachments(kpiRecordId, month?: number)`: GET `/kpi/records/${kpiRecordId}/attachments${month != null ? `?month=${month}` : ''}`.
   - `uploadAttachment(kpiRecordId, file, folderId?, description?, month?)`: include `month` in form/body.

5. **i18n**
   - Add keys e.g. `kpi.month`, `kpi.allMonths`, `kpi.months.1`…`kpi.months.12` (or full names). Use in month dropdown.

6. **Unsaved changes**
   - On month dropdown change, if `hasUnsavedChanges && isEditMode`, confirm same way as year/department switch.

## Todo List

- [x] Add selectedMonth state and month dropdown to KPI page.
- [x] Wire getAttachments(recordId, month) in load effect.
- [x] Pass month to KpiAttachmentUpload and include in upload API.
- [x] Update api.ts getAttachments and uploadAttachment for month.
- [x] Add i18n keys for month labels (en, vi, zh).
- [x] Confirm dialog when changing month with unsaved changes.

## Success Criteria

- Month dropdown visible next to Year; selecting month filters attachment list per record.
- Uploading a file stores it with the selected month; listing with that month shows it.
- “All months” shows all attachments; behavior when uploading with “All” is defined and implemented.
- All three locales show correct month labels.

## Risk Assessment

- **Default = current month:** First load shows current month; no “All” as default.
- **Performance:** One attachment list request per record; unchanged. No extra N+1.

## Security Considerations

- Reuse existing KPI view/create permissions; no new endpoints. Month is data field only.

## Next Steps

- Phase 03: tests and docs updates (README, codebase-summary, API docs).
