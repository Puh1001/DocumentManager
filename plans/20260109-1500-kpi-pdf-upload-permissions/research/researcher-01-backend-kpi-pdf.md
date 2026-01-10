# Researcher 01 - Backend KPI PDF Upload & Permissions

## Scope
- KPI-related backend modules (NestJS)
- Existing document storage/upload flows
- Permission model for actions: view, download, print, copy

## Findings

### 1. KPI Backend Module
- Module path likely: `apps/api/src/modules/kpi`
- Needs extension to link KPI records to uploaded signed PDF files
- Reuse existing storage/document services instead of new storage mechanism

### 2. Existing Document Upload & Storage
- Upload API: `/api/storage/documents/upload` (DocumentService + SMB storage)
- Versioning already implemented; PDF signature files can be treated as normal documents with metadata flag (e.g., `isSignedKpiAttachment`).
- Data flow:
  - Receive multipart file
  - Check `create`/`edit` permissions on `Document` or `Kpi` subject
  - Save to SMB under department/KPI folder, persist metadata in PostgreSQL

### 3. Permissions Model
- Current actions: `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`.
- Requirements map well:
  - **View** → permission `view` on KPI attachment resource
  - **Download** → `download`
  - **Print** → `print`
  - **Copy** (content) → logical permission, enforced at viewer level but still recorded as separate permission.
- CASL Ability Factory already supports fine-grained actions; need to ensure new subject/action combos added to Permission table + ability rules.

### 4. KPI Attachment Data Model Options
- Option A: Reuse `Document` + relation table `KpiAttachment` linking `kpiRecordId` ↔ `documentId`.
- Option B: Add columns on `KpiRecord` (e.g. `signedPdfDocumentId`).
- Option C: Dedicated `KpiSignedFile` model storing metadata + FK to `Document`.

**Preferred:** Option A (supports multiple files per KPI record, matches UI screenshot with 3 PDFs).

### 5. API Endpoints Needed
- `POST /kpi/records/:id/attachments` → upload & attach PDFs
  - Accepts multipart, `kpiRecordId`, optional description.
  - Internally calls DocumentService.uploadKpiAttachment(...).
- `GET /kpi/records/:id/attachments` → list attachments with permission-filtered actions.
- `GET /kpi/attachments/:id/stream` → stream PDF to viewer (view permission).
- `GET /kpi/attachments/:id/download` → download endpoint (download permission).

### 6. Security & Audit
- Enforce PoliciesGuard with `CheckPolicies` for each action.
- Separate audit log entries for view/download/print.
- Ensure only PDF MIME type allowed for this feature.

## Open Questions
- Max number of signed PDFs per KPI record?
- Storage folder convention for KPI PDFs (reuse existing KPI folder vs new `Signed` subfolder)?
- Are print/download events required to be logged distinctly for compliance?

