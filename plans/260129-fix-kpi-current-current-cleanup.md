## Goal

Fix duplicated SMB folder structure `KPI/current/current`:

- Prevent new uploads from writing into `.../current/current`
- Clean up existing data created by older backend versions:
  - Move physical files from `.../current/current/<docId>.pdf` → `.../current/<docId>.pdf`
  - Update DB paths (`documents.filePath`, `document_versions.filePath`)
  - Remove empty `current/current` folders when possible
- Trace where KPI UI provides `folderId` and ensure it cannot point to `.../current/current`

## Context

- KPI attachments upload endpoint: `POST /kpi/records/:id/attachments`
- Backend stores files on SMB via `VersionService.createVersion()`
- Department KPI folder structure is auto-created: `{dept.code}/KPI/current`
- Existing bug/legacy data: files may exist in `{dept.code}/KPI/current/current`

## Plan

### 1) Prevent new bad paths (backend)

- Harden `VersionService`:
  - Normalize folder paths by removing **all** trailing `/current` segments when building `baseFolderPath`.
  - This prevents `.../current/current` from being produced by path concatenation.

- Harden KPI attachment upload:
  - If an incoming `folderId` resolves to a folder path ending with `/current/current`, redirect to the canonical `/current` folder id (by path lookup).
  - Log warnings with `folderId`, resolved `folder.path`, and chosen target folder.

### 2) Trace KPI UI folderId source (frontend)

- Find where `KpiAttachmentUpload` is used in `/dashboard/kpi` or boss KPI list.
- Confirm which folderId is passed:
  - It should be `undefined` (backend auto-create) OR the canonical `{dept.code}/KPI/current` folder id
  - It must never be `{dept.code}/KPI/current/current`

### 3) Cleanup existing data (script)

Create a one-off script runnable in production maintenance window:

- Query DB:
  - Documents where `filePath` contains:
    - `/current/current/`
    - `/current/version/` (legacy wrong version location)
  - Document versions where `filePath` contains the same patterns

- For each affected path:
  - Compute corrected path:
    - `/current/current/` → `/current/`
    - `/current/version/` → `/version/`
  - Move physical file on SMB (prefer rename/move; else copy+delete)
  - Update DB records to corrected paths

- Best-effort remove empty directories:
  - Remove `.../current/current` if empty after moves

### 4) Verification

- Locally:
  - Run typecheck/build for `apps/api` and `apps/web`
  - Run existing API tests for storage/version and KPI attachment if available

- Manual sanity:
  - Upload KPI attachment when folderId is:
    - omitted
    - canonical KPI current id
    - intentionally wrong (inner current/current id) → should still store under canonical `/current`

## Rollback / Safety

- Script is designed to be conservative:
  - If destination file already exists and does not match expected size, skip and log for manual intervention.
  - DB updates are only applied after successful move (or confirmed destination exists).

