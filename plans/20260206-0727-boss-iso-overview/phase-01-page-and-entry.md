# Phase 01: Boss ISO overview page and entry

## Done

- Added route `/[locale]/dashboard/boss/iso-documents` with client page.
- Page: cyber styling (cyber-bg, cyber-grid, cyber-scanline, cyber-card, font-cyber), total count, paginated list (20 per page), document rows with name, documentNo, department, level, updatedAt, link to view (open in new tab). Back button to boss home.
- Entry from Boss home: new button "ISO Overview" / "Tổng quan ISO" next to "Departments" and "KPI Status" that navigates to the new page.
- Translations: `boss.viewType.isoOverview`, `boss.isoOverview.*` (title, description, totalDocuments, noDocuments, errorLoad, paginationSummary) in en, vi, zh.
- Reused GET /storage/documents (status=ACTIVE, pagination). No new API.

## Notes

- Existing web tests (kpi-attachment-viewer, kpi-attachment-list) still fail; not caused by this feature.
