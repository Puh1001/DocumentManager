# Phase 02: ISO Document Table View & Filters

## Context
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-rename-and-navigation.md](phase-01-rename-and-navigation.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md)

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Replace or augment current document list with table per design: columns No., Title, Version, Level, Responsible Department, Preparer, Reviewer, Approver, Approval Date, Receipt Date, Storage Location, Status, uploadPDF; filters Status, Level, Department.
- **Implementation status:** Done
- **Review status:** Done ([phase-02-code-review.md](reports/phase-02-code-review.md))

## Key insights
- Current: folder tree + list (Name, Type, Size, Updated, Deletion Status, Actions). Document model has no Level, Preparer, Reviewer, Approver, Approval/Receipt dates.
- Version derivable from DocumentVersion; Responsible Department from Folder.departmentId; Storage Location from Folder.path/physicalLocation; Status from Document.status.
- Option A (recommended): Table with existing data; placeholder "—" for Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date. Option B (later): Extend schema and API.

## Requirements
- **Functional:** ISO Document page shows table with columns per image; dropdown filters for Status, Department; Level filter optional (hidden or "All").
- **Non-functional:** Reuse existing APIs where possible; no DB migration in this phase unless product confirms ISO metadata fields.

## Architecture
- **Layout:** Keep or simplify: either (A) folder tree left + table right (table shows documents in selected folder) or (B) single table with filters (requires list API with query params). Image suggests single table + filters — prefer (B) if product confirms.
- **Data:** If (B): add GET /storage/documents?status=&departmentId= (flat list with folder/department include). If (A): keep GET /storage/folders/:id and show table for selected folder.
- **Columns:** No. (index), Title (name), Version (from DocumentVersion count or latest), Level ("—"), Responsible Department (folder.department?.name), Preparer/Reviewer/Approver/Approval Date/Receipt Date ("—"), Storage Location (folder.path), Status (document.status), uploadPDF (link to view/stream).

## Related code files
| File | Action |
|------|--------|
| `apps/web/src/app/[locale]/dashboard/documents/page.tsx` | Modify layout: table + filters; optional hide tree |
| `apps/web/src/components/documents/document-list.tsx` | Replace/extend columns to match design |
| `apps/web/src/components/documents/document-toolbar.tsx` | Add filter dropdowns (Status, Department, optional Level) |
| `apps/web/messages/*/documents.json` | Add column headers and filter labels |
| `apps/api/src/modules/storage/document.controller.ts` | Optional: add list endpoint with query params |
| `apps/api/src/modules/storage/document.service.ts` | Optional: findAll with filters |

## Implementation steps
1. Add i18n keys for new table headers (no, title, version, level, responsibleDepartment, preparer, reviewer, approver, approvalDate, receiptDate, storageLocation, status, uploadPDF) and filters (status, level, department).
2. Implement filter UI: Status dropdown (ACTIVE/ARCHIVED/DELETED), Department dropdown (from GET /departments), Level dropdown (optional: "All" only or hide).
3. Decide layout: (A) table per folder vs (B) flat list. If (B), add API GET /storage/documents?status=&departmentId= and use in page.
4. Update document list component: new table columns; map Document + Folder + Department to row data; Version from document versions count or "—"; placeholder "—" for Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date; uploadPDF column = link to view/stream.
5. Wire filters to state/API (filter by status, departmentId; optional level when available).
6. Preserve existing actions (view, download, open to edit, version history, delete) in uploadPDF or Actions column.

## Todo list
- [x] i18n: column and filter labels (en/vi/zh)
- [x] Filter dropdowns (Status, Department; Level optional — hidden)
- [x] Reuse folder documents + GET /storage/folders/:id?status= + version count
- [x] Table columns and row mapping (ISO columns; placeholder "—" for Level, Preparer, Reviewer, Approver, dates)
- [x] uploadPDF / View link; Actions column preserved
- [x] Existing document actions (view, download, open to edit, version history, rename, delete) still work

## Success criteria
- Table displays with all columns per design; placeholders where data missing.
- Status and Department filters narrow list; Level filter if implemented.
- uploadPDF/View opens document; existing actions available.
- No regression on permissions or folder tree (if kept).

## Risk assessment
- Medium: layout change (tree vs flat) may affect UX; confirm with product. Low technical risk if reusing existing APIs.

## Security considerations
- List/filter API must respect existing document/folder permissions (PoliciesGuard, subject Document).

## Next steps
- Phase 03: Testing & docs. Optionally later: schema extension for Level, Preparer, Reviewer, Approver, dates.
