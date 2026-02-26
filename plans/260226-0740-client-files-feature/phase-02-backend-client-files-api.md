# Phase 02: Backend – Client Files API

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phase 01 (Client folder, Module)
- Docs: [code-standards.md](../../docs/code-standards.md), [scout/scout-01-client-related-paths.md](scout/scout-01-client-related-paths.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** API to list client files (with filters, search), upload file to Client folder, and delete (soft or move to delete folder as per existing pattern).

## Key Insights
- Reuse DocumentService for create/stream/delete; filter list by client folder id.
- **Allowed extensions:** .doc, .docx, .xls, .xlsx, .ppt, .pptx, **.pdf**. Validate in controller/service.
- List: pagination, search by name, filter by file type (extension) and/or date range.

## Requirements
- Functional: GET list of documents in Client folder; query params: search (name), fileType (extension), dateFrom, dateTo, page, limit.
- Functional: POST upload file to Client folder; validate type; create Document + version; return document info.
- Functional: DELETE document in Client folder (reuse existing delete or move-to-delete-folder if applicable for Client).
- Non-functional: Permission check via Client subject (Phase 03); use PoliciesGuard + CheckPolicies.

## Architecture
- **Option A:** New module `apps/api/src/modules/client/` with ClientController, ClientService. ClientService uses FolderService.ensureClientFolder(), DocumentService.create(), DocumentService.findMany() filtered by folderId, existing delete flow.
- **Option B:** Extend storage module with client-file.controller.ts and client-file.service.ts. Same logic, lives under storage.
- Recommendation: **Option A** – dedicated Client module for clarity and permission boundary.

## Related Code
- Create: `apps/api/src/modules/client/client.module.ts`, `client.controller.ts`, `client.service.ts`, `dto/list-client-files.dto.ts`, `dto/upload-client-file.dto.ts`
- Modify: `apps/api/src/app.module.ts` – register ClientModule
- Use: FolderService.ensureClientFolder(), DocumentService (create, findMany, delete/soft-delete), SmbService

## Implementation Steps
1. Create ClientModule; inject FolderService, DocumentService, SmbService, PrismaService.
2. ClientService: ensureClientFolder(), list(filters, pagination), upload(file, user), delete(documentId, user). List: Prisma document.findMany where folderId = clientFolderId; optional search on name; filter by extension/date from query.
3. ClientController: GET /client/files (query: search, fileType, dateFrom, dateTo, page, limit), POST /client/files/upload (multipart), DELETE /client/files/:id. Use JwtAuthGuard; CheckPolicies for Client (view/create/delete) in Phase 03.
4. Upload: validate MIME/extension allowlist (doc, docx, xls, xlsx, ppt, pptx, **pdf**); call DocumentService flow that creates Document and writes file to client folder path (e.g. Client/{filename} or Client/current/{filename}); set uploadedById.
5. Delete: ensure document belongs to Client folder then call existing document delete or move-to-delete logic (if Client has no delete folder, hard delete or define simple soft-delete).
6. Register ClientModule in AppModule.

## Todo
- [x] Create Client module, service, controller
- [x] DTOs for list (ListClientFilesDto)
- [x] List with filters and pagination
- [x] Upload with type validation (doc, docx, xls, xlsx, ppt, pptx, pdf)
- [x] Delete with folder check (soft-delete via DocumentService.delete)
- [x] Register module

## Success Criteria
- GET /client/files returns only documents in Client folder; filters work.
- POST /client/files/upload accepts **doc, docx, xls, xlsx, ppt, pptx, pdf** and stores file in Client folder; returns document.
- DELETE /client/files/:id removes or soft-deletes only if document in Client folder.

## Risk Assessment
- Medium if delete semantics differ from existing (e.g. no delete folder for Client); document clearly.

## Security Considerations
- Guard all routes with Client subject (view/create/delete). Validate upload size and type server-side.

## Next Steps
- Phase 03 adds Client subject and permission checks; then Phase 04 uses these endpoints from frontend.
