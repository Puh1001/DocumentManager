# Phase 01: Month selector in Department KPI Status

## 1. State and data loading
- Add `selectedMonth` state: number 1–12, default `new Date().getMonth() + 1`.
- In `loadStatuses`, after fetching records per department:
  - For each record, call `kpiAttachmentApi.getAttachments(record.id, selectedMonth)`.
  - Consider record "completed for month" if `attachments.length >= 1`.
  - Compute `completedKpis` / `completionRate` / `status` from these per-record flags (same formula as now: completed = all done, partial = 50–99%, incomplete &lt; 50%).
- Add `selectedMonth` to `loadStatuses` dependency array.

## 2. UI
- In header (next to year select), add a month `<select>`:
  - Value = `selectedMonth`, onChange = `setSelectedMonth(Number(e.target.value))`.
  - Options: 1–12, label from `t('boss.months.jan')` … `t('boss.months.dec')` (map 1→jan, 2→feb, …).
- Reuse same styling as year select (cyber-button / cyber theme).

## 3. i18n
- Add key `"month": "Month"` (en), `"month": "Tháng"` (vi), `"month": "月份"` (zh) in `boss` namespace (sibling to `year`).
- Existing `boss.months.jan` … `dec` used for option labels.

## 4. Verification
- Run web typecheck/build.
- Manually: Boss → KPI Status → change year and month, confirm counts/status update.
