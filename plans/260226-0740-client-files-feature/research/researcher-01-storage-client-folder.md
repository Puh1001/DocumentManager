# Research: Storage & Client Folder for Client Files

**Date:** 2026-02-26  
**Scope:** How to store client files (Word, Excel, PPT) in a dedicated "Client" folder; reuse existing storage patterns.

## Key Findings

### 1. Current Storage Model
- **SMB shared folder**: Files live on network share; DB stores metadata (Folder, Document, DocumentVersion).
- **Department structure**: `FolderService.ensureDepartmentFolderStructure()` creates per-department: `{code}/KPI`, `{code}/ISO_documents`, `{code}/Maintenance`, `{code}/Delete_files`, plus `versions/` under KPI/ISO_documents/Maintenance.
- **Documents**: Stored under folder path; `Document` has `folderId`, `filePath`, `name`, `status`, `deletionExpiresAt`, etc.

### 2. Client Folder Placement Options
- **Option A – Global "Client" root**: Single root folder `Client` (or `Client/current`) at SMB base; no department. Simple list; all client files in one place. Fits "files for factory clients" as a shared space.
- **Option B – Per-department Client**: Add `Client` next to KPI/ISO_documents under each department. Mirrors KPI/ISO; allows per-department client files. More complex; requirement says "thư mục Client" (one Client folder).
- **Recommendation:** Option A – one global **Client** folder (e.g. path `Client` or `Client/current`). Reuse existing Document + Folder model; no new DB tables. Optional: `Folder.departmentId = null` for global Client.

### 3. Reusable Patterns
- **KPI attachments**: Upload → resolve folder (ensure structure) → create Document + version → write file via SMB. Client upload can follow same flow with a single "Client" folder (find-or-create by path).
- **Document upload**: `DocumentService` creates Document, writes to `folder.path/current/` and versions; use same service with Client folderId.
- **Allowed file types**: KPI restricts `.pdf`. For Client: allow `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, **`.pdf`**. Validate MIME/extension in backend.

### 4. Implementation Hooks
- **Folder**: Create/ensure one Folder with path `Client` (or `Client/current`). If using `current` subfolder, ensure `Client` and `Client/current` exist (similar to department sections).
- **No department**: Client folder has `departmentId: null`; list/dashboard not filtered by department.
- **Sync**: Folder sync will pick up Client folder and files if they exist on disk; ensure create is idempotent (find by path, then create if missing).

## References
- `apps/api/src/modules/storage/services/folder.service.ts` – `ensureDepartmentFolderStructure`, folder CRUD.
- `apps/api/src/modules/storage/services/document.service.ts` – upload, create document.
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` – upload flow, folder resolve, single file type.

## Unresolved
- Exact SMB path for Client: `Client` vs `Client/current` (current = files; versions optional for Client?).
- Whether Client folder should be created at app bootstrap or on first upload (lazy).
