# Plan: Documents → ISO Document rename & table UI

**Created:** 2026-01-30  
**Status:** Draft — awaiting review

## Objective
1. Rename user-facing "documents" to "ISO Document" (nav, page title, related labels).
2. Display ISO Document list as table per provided design: columns No., Title, Version, Level, Responsible Department, Preparer, Reviewer, Approver, Approval Date, Receipt Date, Storage Location, Status, uploadPDF; filters Status, Level, Department.

## Phases

| Phase | Description | Status | Link |
|-------|-------------|--------|------|
| 1 | Rename & navigation (i18n, sidebar, page title) | Done | [phase-01-rename-and-navigation.md](phase-01-rename-and-navigation.md) |
| 2 | ISO Document table view & filters (columns, dropdowns) | Done | [phase-02-iso-document-table-and-filters.md](phase-02-iso-document-table-and-filters.md) |
| 3 | Testing & docs | Done | [phase-03-testing-and-docs.md](phase-03-testing-and-docs.md) |

## Key dependencies
- Phase 2 depends on Phase 1 (labels).
- Phase 3 runs after Phase 2.

## Approach
- **Rename:** Display strings only; keep route `/dashboard/documents`, i18n keys, and code identifiers.
- **Table:** Use existing Document + Folder + Department data; columns without DB fields show "—" (Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date). Optional later: schema extension for full ISO metadata.
- **Filters:** Status, Department (from folder); Level optional (hidden or "All" until Level exists).

## Research
- [researcher-01-report.md](research/researcher-01-report.md) — Rename & navigation scope.
- [researcher-02-report.md](research/researcher-02-report.md) — Table columns, filters, schema options.

## Unresolved
- Single flat document list with filters vs. keep folder tree + table per folder?
- Exact Vietnamese/Chinese wording for "ISO Document".
