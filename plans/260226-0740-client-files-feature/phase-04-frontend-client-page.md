# Phase 04: Frontend – Client Page (Table, Filters, Search, Upload)

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phase 02 (API), Phase 03 (permissions)
- Docs: [code-standards.md](../../docs/code-standards.md), [design-guidelines.md](../../docs/design-guidelines.md) if present, [scout/scout-01-client-related-paths.md](scout/scout-01-client-related-paths.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** Dashboard page at `/dashboard/client`: table of client files, filters (e.g. file type, date), search bar, upload button (DCC/admin).

## Key Insights
- Reuse patterns from documents table or KPI attachment list: DataTable, filters, search, pagination.
- useCanAccess('create', 'Client') for upload button; useCanAccess('view', 'Client') already guarded by PageGuard.
- API client: add getClientFiles(params), uploadClientFile(file), deleteClientFile(id).

## Requirements
- Functional: Page at [locale]/dashboard/client; PageGuard with metadata (module Client, action view).
- Functional: Table columns: name, file type, size, uploaded by, date; sortable where applicable.
- Functional: Search bar (by name); filters: file type (dropdown), date range optional.
- Functional: Upload button opens modal or file picker; **allowed types: doc, docx, xls, xlsx, ppt, pptx, pdf**; call POST /client/files/upload; refresh list on success.
- Functional: **View:** Open file in viewer. For **PDF**: use existing PdfViewer. For **PPT/PPTX**: use viewer that supports **presentation mode** (chế độ trình chiếu) – fullscreen slideshow with next/previous slide (and optionally keyboard arrows).
- Functional: Delete action (icon) for each row if user can delete; confirm dialog; call DELETE /client/files/:id; refresh list.

## Architecture
- Page: `apps/web/src/app/[locale]/dashboard/client/page.tsx` – PageGuard(metadata), layout, ClientFileTable (or inline table), ClientUploadModal, filters state, search state.
- **Viewer:** Reuse PdfViewer for PDF. For PPT/PPTX: add or reuse PptViewer component with **presentation mode** (fullscreen, next/prev slide); e.g. fullscreen container + slide index state + keyboard (ArrowLeft/ArrowRight) and on-screen buttons.
- API: `lib/api.ts` or `lib/api/client.ts` – getClientFiles, uploadClientFile, deleteClientFile.
- Reuse: Table from shadcn/ui or existing documents table pattern; Input for search; Select for file type filter; Button upload/delete.

## Related Code
- Create: `apps/web/src/app/[locale]/dashboard/client/page.tsx`
- Create (optional): `apps/web/src/components/client/client-file-table.tsx`, `client-upload-modal.tsx` (or inline in page to keep simple)
- Create (optional): `apps/web/src/components/viewers/ppt-viewer.tsx` or integrate in client page – PPT/PPTX viewer with **presentation mode** (fullscreen, next/prev slide)
- Modify: `apps/web/src/lib/api.ts` – add client files API helpers

## Implementation Steps
1. Add API helpers: getClientFiles({ search, fileType, dateFrom, dateTo, page, limit }), uploadClientFile(formData), deleteClientFile(id).
2. Create client page: export pageMetadata (path: '/dashboard/client', name: 'Client', module: 'Client', action: 'view', icon: 'FolderOpen' or 'Users', order: after documents). Wrap content in PageGuard(metadata).
3. State: list data, loading, error, search query, filter (fileType), pagination (page, limit, total). Fetch on mount and when search/filters/pagination change.
4. Table: map list to rows; columns name, type (extension), size, uploadedBy, createdAt; actions column with view/download link and delete button (if can delete). Use useCanAccess('delete','Client') for delete visibility.
5. Search: controlled input; debounce or on Enter; set search state and refetch.
6. Filters: file type select (optional: All, .docx, .xlsx, …); optional date range; apply and refetch.
7. Upload: button visible if useCanAccess('create','Client'); on click open file input or modal; **accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf"**; on submit call uploadClientFile; on success refetch and close.
8. **Viewer for client file:** When user clicks view on a row: open modal or inline viewer. If PDF → PdfViewer. If PPT/PPTX → PptViewer (or equivalent) with **presentation mode**: toggle fullscreen, show one slide at a time, Next/Previous (and keyboard ArrowLeft/ArrowRight). Implement or integrate PPT viewer (e.g. iframe to Office Online, or client-side lib that renders slides; ensure "presentation mode" is available).
9. Delete: confirm dialog; call deleteClientFile(id); refetch on success.

## Todo
- [x] API helpers for client files
- [x] Client page with pageMetadata and PageGuard
- [x] Table with columns and actions
- [x] Search and filters
- [x] Upload flow (**include .pdf** in accept)
- [x] **Viewer: PDF (PdfViewer) and PPT/PPTX with presentation mode** (fullscreen slideshow, next/prev)
- [x] Delete with confirm

## Success Criteria
- Page loads for users with view Client; table shows client files; search and filters narrow results; upload adds file (including PDF) and refreshes; delete removes row and refreshes.
- **PPT/PPTX:** User can open file and switch to **presentation mode** (fullscreen slideshow, next/previous slide).

## Risk Assessment
- Low. Standard CRUD UI.

## Security Considerations
- Upload/delete only shown when user has create/delete Client; API enforces permissions.

## Next Steps
- Phase 05 registers page in sidebar; Phase 06 adds Boss tab that can reuse same table or a simplified list.
