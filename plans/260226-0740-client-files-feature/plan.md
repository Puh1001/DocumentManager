# Plan: Client Files Feature

**Created:** 2026-02-26  
**Status:** Draft – Pending review  
**Goal:** Add "Client" section: sidebar item, upload/store files (Word, Excel, PPT, …) in a Client folder, dashboard table with filters/search, and Boss tab.

## Overview
- **Client folder**: Single global SMB folder "Client" (or Client/current); files stored as Document records.
- **Who**: Khách hàng (clients), users with role DCC and Admin can upload; Boss can view.
- **UI**: `/dashboard/client` – table, filters, search bar; Boss dashboard – new tab next to Departments, KPI Status, ISO Overview.

## Research & Scout
- [research/researcher-01-storage-client-folder.md](research/researcher-01-storage-client-folder.md) – Storage and Client folder design.
- [research/researcher-02-permissions-and-ui.md](research/researcher-02-permissions-and-ui.md) – Permissions, page registry, Boss tab.
- [scout/scout-01-client-related-paths.md](scout/scout-01-client-related-paths.md) – File paths to create/modify.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Backend: Client folder & module | Done | 100% |
| 02 | Backend: Client files API (list, upload, delete) | Done | 100% |
| 03 | Authorization: Client subject & permissions | Done | 100% |
| 04 | Frontend: Client page (table, filters, search, upload) | Done | 100% |
| 05 | Frontend: Sidebar & page registry | Done | 100% |
| 06 | Boss dashboard: Client tab | Done | 100% |
| 07 | i18n & tests | Done | 100% |

- **Phase 01:** [phase-01-backend-client-folder-and-module.md](phase-01-backend-client-folder-and-module.md)
- **Phase 02:** [phase-02-backend-client-files-api.md](phase-02-backend-client-files-api.md)
- **Phase 03:** [phase-03-authorization-client-subject.md](phase-03-authorization-client-subject.md)
- **Phase 04:** [phase-04-frontend-client-page.md](phase-04-frontend-client-page.md)
- **Phase 05:** [phase-05-frontend-sidebar-and-registry.md](phase-05-frontend-sidebar-and-registry.md)
- **Phase 06:** [phase-06-boss-dashboard-client-tab.md](phase-06-boss-dashboard-client-tab.md)
- **Phase 07:** [phase-07-i18n-and-tests.md](phase-07-i18n-and-tests.md)

## Dependencies
- Phase 01 → 02, 03.  
- Phase 02, 03 → 04, 05, 06.  
- Phase 04, 05, 06 → 07.

## Key Decisions
- One global "Client" folder (no per-department); reuse Document + Folder model.
- New subject "Client" and Module "Client" for RBAC; DCC and admin get create/delete, Boss view/download.
- **Allowed file types:** doc, docx, xls, xlsx, ppt, pptx, **pdf**.
- **PPT/PPTX viewer:** When viewing a client file that is PPT/PPTX, support **presentation mode** (chế độ trình chiếu): fullscreen slideshow with next/previous slide (and optionally keyboard shortcuts).
