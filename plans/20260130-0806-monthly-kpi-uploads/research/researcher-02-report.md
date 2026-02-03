# Researcher 02: Frontend & UI for Monthly KPI Uploads

**Aspect:** KPI page UI — month selector, attachment list/upload by month.

## Current UI (from codebase & screenshot)

- **KPI page** (`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`):
  - Department dropdown; **Year** dropdown (current year ± 5).
  - Records loaded by `departmentId` + `selectedYear`.
  - Each KPI record card: title, target, table (m1–m12), **attachments list** and **upload** button.
  - No month selector; attachments are listed for the whole record (year).

- **Screenshot**: "Year 2025" dropdown; red box indicates empty space for **month** selector next to it.

## Requirement

- Add **month** selection (1–12 or Jan–Dec) next to Year.
- Uploads and list are **per month**: user selects year + month; upload goes to that month; list shows attachments for selected month (or "all months" option).

## Recommended Frontend Changes

1. **State**
   - Add `selectedMonth: number | null` (1–12 or null for "all"). Default: current month or null.
   - Keep `selectedYear`; both drive API calls for attachments.

2. **UI**
   - Next to Year dropdown: add **Month** dropdown (e.g. "Tháng 1" … "Tháng 12" or "All months").
   - Place in same row as department/year (top-right area from screenshot).

3. **Data flow**
   - **Records**: still loaded by `departmentId` + `year` (unchanged). KPI records stay year-scoped.
   - **Attachments**: when loading attachments per record, pass `month` if selected (e.g. `GET /kpi/records/:id/attachments?month=3`). If "all months", omit param or pass `month=`.
   - **Upload**: on upload, send current `selectedMonth` in body (required when month is selected; or default to selected month).

4. **Components**
   - `KpiAttachmentList`: accept optional `month` filter; display only attachments for that month (or all if filter is "all"). Backend can return filtered list, or frontend filter by `attachment.month`.
   - `KpiAttachmentUpload`: accept `month: number` (or current selected month); include in upload API payload.

5. **i18n**
   - Add labels: e.g. "Month", "January" … "December", "All months" in `kpi` or `common` namespace for all locales (en, vi, zh).

6. **Backup / unsaved**
   - When switching month (or year), same unsaved-changes confirm as for year/department switch.

## Key Files

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` — state, month dropdown, pass month to attachment load/upload.
- `apps/web/src/components/boss/kpi-attachment-upload.tsx` — add month to upload payload.
- `apps/web/src/components/boss/kpi-attachment-list.tsx` — optional month filter display.
- `apps/web/src/lib/api.ts` — `kpiAttachmentApi.uploadAttachment(..., month?)`, `getAttachments(recordId, month?)`.
- Locale files under `apps/web/messages/` or similar — month labels.

## Edge Cases

- "All months": show all attachments for the record (no month filter); upload may require selecting a month first or default to current.
- Empty month: show "No attachments" for that month; upload CTA remains.

## Resolved (product)

- **Default view:** Chọn sẵn tháng hiện tại (`selectedMonth` default = current month).
- **Upload when "all months":** Default tháng hiện tại cho lần upload đó.
