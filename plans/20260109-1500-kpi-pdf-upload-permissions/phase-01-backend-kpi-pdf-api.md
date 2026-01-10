# Phase 01 - Backend Data Model & API for KPI Signed PDFs

## Context Links

- Parent plan: `./plan.md`
- Research:
  - `./research/researcher-01-backend-kpi-pdf.md`
  - `./research/researcher-02-frontend-boss-kpi-ui.md`
- Docs:
  - `../251218-1102-iso-document-management/plan.md`
  - `../../docs/codebase-summary.md`
  - `../../docs/system-architecture.md`

## Overview

- **Date:** 2026-01-09
- **Priority:** High
- **Implementation Status:** Completed
- **Review Status:** Not reviewed
- **Description:** Extend database schema and NestJS API to support uploading, storing, and serving signed KPI PDF attachments with action-level permissions (view/download/print/copy).

## Key Insights

- Existing storage & document pipeline already covers upload, versioning, streaming, and download.
- KPI data already modeled (records + metrics); we only need attachment linkage, not a new storage backend.
- Permissions system (CASL + Permission/Role models) already supports actions `view`, `download`, `print` and can be extended/leveraged for KPI attachments.

## Requirements

### Functional

- Allow users with proper rights to upload **multiple** signed PDF files for a single KPI record.
- Persist linkage between KPI record and uploaded document(s).
- Expose APIs to:
  - List attachments of a KPI record with basic metadata.
  - Stream PDF for viewing (no forced download).
  - Download PDF file.
- All endpoints must enforce per-action permissions using existing authorization architecture.

### Non-Functional

- Only PDF MIME types accepted for this feature.
- Reuse existing SMB storage & checksum logic; physical files stored on the existing shared network drive.
- Enforce reasonable PDF size limit (e.g. ≤ 20–50MB), reusing any global upload size limits already configured.
- Detailed audit log for all actions: upload, view, download, print, copy, edit (where applicable).

## Architecture

- **Data Model:**
  - Introduce relation table `KpiAttachment` (or similar) linking:
    - `id`
    - `kpiRecordId` → FK to `KpiRecord`
    - `documentId` → FK to `Document`
    - `description` (optional)
    - `createdByUserId`, `createdAt`
  - Reuse existing `Document` and `DocumentVersion` tables.
- **Modules:**
  - Extend `kpi` module with:
    - `KpiAttachmentService`
    - `KpiAttachmentController` (or handlers in existing controller).
  - Depend on `storage/document.service` for actual file storage and streaming.
- **Permissions:**
  - Use subject `Kpi` or new subject (e.g. `KpiAttachment`) for actions:
    - `view`, `download`, `print`, `copy`, `edit`.
  - No default rights: permissions are assigned explicitly per role through existing permission management.
  - Boss / `kpi_viewer_all` roles remain read-only (view/download/print/copy based on explicit permissions, no upload/edit).
  - Enforcement via `PoliciesGuard` + `@CheckPolicies` to be wired in Phase 03 (authorization phase).

## Related Code Files

### To Modify

- `apps/api/src/modules/kpi/*.ts` (controller, service, DTOs)
- `apps/api/src/modules/authorization/constants/permissions.constants.ts` (if new subject/actions needed)
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`
- Prisma schema file: `apps/api/prisma/schema.prisma` (add `KpiAttachment` model)
- Migration scripts under `apps/api/prisma/migrations/*`

### To Create

- `apps/api/src/modules/kpi/dto/create-kpi-attachment.dto.ts`
- `apps/api/src/modules/kpi/dto/query-kpi-attachments.dto.ts`
- `apps/api/src/modules/kpi/entities/kpi-attachment.entity.ts` (if entity pattern used)

## Implementation Steps

1. **Database Schema**
   1. Add `KpiAttachment` model in Prisma schema with FKs to `KpiRecord`, `Document`, and `User`.
   2. On developer machines, run `npx prisma migrate dev --name kpi_attachments` inside `apps/api` to generate and apply migration; on deployment, use `prisma migrate deploy` to apply existing migrations.
   3. Document schema changes in plan or migration notes.

2. **Prisma Types & Service Plumbing**
   1. Regenerate Prisma client.
   2. Extend existing KPI service or create `KpiAttachmentService` to encapsulate CRUD logic.
   3. Add methods:
      - `createAttachment(kpiRecordId, fileMeta, user)` (calls DocumentService upload, then links).
      - `listAttachments(kpiRecordId, ability)` (permission-filtered).
      - `getAttachment(id)` with ownership/department checks if needed.

3. **Upload Endpoint**
   1. Define DTO for upload request (e.g. `CreateKpiAttachmentDto` with `description`).
   2. Add `POST /kpi/records/:id/attachments` endpoint.
   3. Use Nest file upload decorator (e.g. `@UseInterceptors(FileInterceptor('file'))`).
   4. Validate:
      - File present and MIME type is PDF.
      - File size within configured limit.
      - User has required action (`create` or `edit`) on `Kpi` (boss / `kpi_viewer_all` are read-only, cannot upload/update).
   5. Call DocumentService to store file and create versioned `Document`.
   6. Create `KpiAttachment` row linking `kpiRecord` and `document`.
   7. `folderId` must be resolved from existing storage configuration (e.g. KPI folder for that department) rather than arbitrary user-provided SMB paths.

4. **List Endpoint**
   1. Add `GET /kpi/records/:id/attachments` endpoint.
   2. Use `@CheckPolicies({ action: 'view', subject: 'Kpi' })`.
   3. Return list of attachments with:
      - `attachmentId`, `documentId`, `fileName`, `uploadedBy`, `createdAt`.

5. **Stream & Download Endpoints**
   1. For streaming: `GET /kpi/attachments/:id/stream`.
      - Resolve `KpiAttachment` → `Document`.
      - Enforce `view` permission on `Kpi`/`KpiAttachment`.
      - Delegate to DocumentService streaming method, set headers for inline PDF.
   2. For download: `GET /kpi/attachments/:id/download`.
      - Enforce `download` permission.
      - Delegate to DocumentService download logic (attachment headers).

6. **Permissions Integration**
   1. Update permission constants and seed data if a new subject name (e.g. `KpiAttachment`) is introduced.
   2. Update CASL ability factory so roles (boss, admin_dept, etc.) get appropriate abilities.
   3. Ensure boss role has at least `view` (maybe `download`/`print` depending on business rules) across departments.

7. **Audit Logging**
   1. Hook into existing audit log service to record:
      - Attachment upload.
      - View, download, print, copy, and edit events where feasible.
   2. Include in `AuditLog.details` at least: `kpiRecordId`, `documentId`, `fileName`, `departmentId`, and high-level action context for easier traceability.
   3. Ensure sensitive fields (raw file paths, low-level SMB details, secrets) are never logged.

## Todo List

- [x] Design final `KpiAttachment` schema fields and relationships.
- [x] Implement Prisma model and generate client (migration to be created with `prisma migrate dev` on dev machines).
- [x] Implement KPI attachment service functions.
- [x] Implement upload, list, stream, and download endpoints.
- [ ] Integrate CASL permissions for KPI attachments (Phase 03).
- [x] Add audit logging for attachment actions (basic fields; may be expanded later).

## Success Criteria

- Attachments can be created and listed for a KPI record via API.
- Streaming and download endpoints work and respect permissions.
- Only PDF files are accepted.
- Existing document upload logic remains unaffected (no regressions).

## Risk Assessment

- **Risk:** Permission misconfiguration exposes PDFs to unauthorized users.\n - **Mitigation:** Reuse existing CASL patterns, add tests for forbidden cases.\n- **Risk:** Tight coupling between KPI and storage services.\n - **Mitigation:** Keep attachment logic thin and reusing DocumentService as façade.\n- **Risk:** Migration issues on production data.\n - **Mitigation:** Back up DB, test migration in staging, keep schema additive.

## Security Considerations

- Enforce JWT auth + PoliciesGuard on all new endpoints.
- Limit uploads to PDF MIME type and reasonable file size (reuse global limits).
- Ensure file paths are never exposed; serve by IDs only.
- Log all access for traceability.

## Next Steps

- Implement frontend attachment UI and viewer integration (Phase 02).
- Wire detailed permission matrix and UI for assigning per-action rights (Phase 03).
- Add automated tests for all new endpoints and flows (Phase 04).
