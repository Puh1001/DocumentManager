# Scout Report: KPI PDF Upload File Deletion

## Overview

KPI PDF deletion uses a **two-phase** approach: self-delete within 72h, or DCC approval after 72h. Files are **moved** (not unlinked) to a `Delete_files` folder on SMB share.


---

## Key Files

### Backend API Layer

| File | Purpose |
|------|---------|
| `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` | DELETE `/kpi/attachments/:id`, deletion-request endpoints |
| `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts` | DELETE `/kpi/records/:id/months/:month`, DELETE `/kpi/records/:id` |
| `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` | `deleteAttachment()`, `deleteAttachmentsForRecordMonth()`, 72h check delegation |
| `apps/api/src/modules/kpi/services/kpi-record.service.ts` | `clearMonth()`, `remove()` (cascades via Prisma) |
| `apps/api/src/modules/storage/services/document-deletion.service.ts` | **Core**: `executeDelete()`, `selfDelete()`, `reviewRequest()`, `restoreDocument()` — moves files to `Delete_files/` via `smbService.rename()` |
| `apps/api/src/modules/storage/services/smb.service.ts` | `rename()` (used for move), `deleteFile()` (fs.unlink, NOT used by KPI flow) |

### Frontend Layer

| File | Purpose |
|------|---------|
| `apps/web/src/components/boss/kpi-attachment-item.tsx` | Delete button, 72h check before showing delete vs DCC request |
| `apps/web/src/components/boss/kpi-attachment-list.tsx` | List rendering, manages deletion request dialog state |
| `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx` | Dialog for submitting DCC deletion request (reason + optional replacement) |
| `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx` | Countdown/status badge ("Can Delete (Xh Ym left)", "Pending DCC Review", etc.) |
| `apps/web/src/hooks/use-kpi-attachment-deletion-status.ts` | Hook: fetches `GET /kpi/attachments/:id/deletion-status` |
| `apps/web/src/lib/api.ts` (lines ~949-999) | `kpiAttachmentApi` client methods |

### Schema & Config

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` (lines 454-536) | `KpiRecord`, `KpiMetric`, `KpiAttachment` models; `onDelete: Cascade` relations |
| `apps/api/prisma/schema.prisma` (line 291) | `DeletionRequest` model |
| `apps/api/src/common/config/multer.config.ts` | Upload config: diskStorage, 500MB limit |
| `apps/api/src/modules/storage/utils/storage-path.util.ts` | `StoragePathBuilder` — canonical path construction |
| `apps/api/src/modules/storage/services/folder.service.ts` | `ensureDepartmentFolderStructure()` — creates `Delete_files/` folder |

### Tests & Debug Reports

| File | Purpose |
|------|---------|
| `apps/api/src/modules/kpi/services/kpi-attachment.service.spec.ts` | Unit tests |
| `apps/api/src/modules/storage/services/document-deletion.service.spec.ts` | Unit tests |
| `apps/api/src/modules/kpi/kpi.integration.spec.ts` | Integration tests |
| `debug-reports/260122-kpi-attachment-expired-deletion-fix.md` | Historical fix |
| `debug-reports/260123-kpi-new-files-showing-expired.md` | Historical fix |
| `debug-reports/260123-delete-file-eperm-error.md` | EPERM error fix |
| `debug-reports/kpi-attachment-countdown-issues.md` | Countdown fix |

---

## Deletion Flow

```
[Within 72h]  User clicks X → KpiAttachmentItem.handleDelete()
  → GET /kpi/attachments/:id/deletion-status
  → if canDelete: DELETE /kpi/attachments/:id
    → KpiAttachmentService.deleteAttachment()
      → DocumentDeletionService.selfDelete()
        → executeDelete()
          1. Find/create department's Delete_files/ folder
          2. smbService.rename(filePath → Delete_files/filePath)  ← MOVE, not unlink
          3. Update Document: status=DELETED, folderId=deleteFolder
          4. Delete KpiAttachment DB record
          5. If 0 attachments left, revert KpiRecord status → PENDING
          6. Audit log

[After 72h]  Delete button disabled → opens KpiAttachmentDeletionRequestDialog
  → POST /kpi/attachments/:id/deletion-request (reason + optional replacement)
    → Creates DeletionRequest (PENDING) → DCC reviews via reviewRequest()
      → On approve: executeDelete() same as above
      → On rejection: deletes replacement file if provided
```

### Bulk Operations
- `DELETE /kpi/records/:id/months/:month` → calls `deleteAttachment()` for each attachment in that month
- `DELETE /kpi/records/:id` → Prisma cascade deletes KpiAttachments, does NOT explicitly move files to Delete_files

---

## Notable Findings

1. **Files are moved, not deleted** — `smbService.rename()` to `{dept}/Delete_files/`, not `fs.unlink()`
2. **`remove()` (delete entire record) has no file cleanup** — relies on Prisma `onDelete: Cascade` for DB only; physical files on SMB are orphaned
3. **72h window** set at upload time via `deletionExpiresAt = now + 72h` on Document record
4. **DCC role users** can always delete regardless of 72h window
5. **KPI-only PDF uploads** — `kpi-attachment-upload.tsx` validates PDF-only client-side; backend validates via `allowedMimeTypes`

## Unresolved Questions

- Does `remove()` (delete entire KPI record) need explicit file cleanup to move PDFs to Delete_files? Currently only DB cascade fires.
- Is there a background job to purge old files from Delete_files/ folders?