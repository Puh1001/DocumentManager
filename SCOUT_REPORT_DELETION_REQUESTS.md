# Request Document Deletion - Scout Report

## Backend Files (Document Deletion Feature)

### Endpoints & Routes
- **Controller**: `apps/api/src/modules/storage/controllers/deletion-request.controller.ts`
  - `GET /storage/deletion-requests` → listPendingRequests (DCC only)
  - `GET /storage/deletion-requests/my-requests` → getUserRequests
  - `GET /storage/deletion-requests/:id` → getRequestById
  - `POST /storage/deletion-requests/:id/review` → reviewRequest (DCC approve/reject)

- **Controller**: `apps/api/src/modules/storage/controllers/document.controller.ts`
  - `GET /storage/documents/:id/deletion-status` → checkDeletionStatus
  - `GET /storage/documents/:id/deletion-request` → getDeletionRequest (for user)
  - `POST /storage/documents/:id/deletion-requests` → submitDeletionRequest
  - `DELETE /storage/documents/:id` → selfDelete (72h window or DCC)

### Service & Business Logic
- **Service**: `apps/api/src/modules/storage/services/document-deletion.service.ts`
  - `checkDeletionStatus()` → Check if user can delete, window expired (72h), or need DCC approval
  - `selfDelete()` → Delete within 72h window
  - `submitDeletionRequest()` → Submit request to DCC (after 72h)
  - `reviewRequest()` → DCC approve/reject with optional comment
  - `listPendingRequests()` → List all pending requests for DCC dashboard
  - `getRequestById()`, `getUserRequests()`, `getRequestByDocumentId()`
  - `replaceDocumentWithReplacement()` → If approval has replacement file, replace old doc
  - `executeDelete()` → Move file to Delete_files folder, update DB, create audit log
  - Private: `findOrCreateDeleteFolder()`, `findDepartmentIdForFolder()`

### Data Models & Schema
- **Prisma Schema**: `apps/api/prisma/schema.prisma`
  - **DeletionRequest model** (lines ~249+):
    - `id`, `documentId` (unique), `status` (PENDING|APPROVED|REJECTED)
    - `reason`, `replacementFileId` (optional)
    - `requestedBy`, `requestedAt`
    - `reviewedBy`, `reviewedAt`, `reviewerComment`
    - Relations: document, requester, replacementFile, reviewer

  - **Document model** (lines ~198+):
    - `deletionExpiresAt` → uploadedAt + 72 hours
    - `uploadedBy`, `uploadedAt`
    - Relation: deletionRequests

- **Migration**: `apps/api/prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`
  - Table: `deletion_requests` (id, document_id, status, reason, replacement_file_id, requested_by, requested_at, reviewed_by, reviewed_at, reviewer_comment)
  - Indexes: documentId (unique), requestedBy, status, reviewedBy, (status, requestedAt)
  - ForeignKeys: documentId → documents.id, requestedBy → users.id, reviewedBy → users.id, replacementFileId → documents.id

### DTOs
- **SubmitDeletionRequestDto**: `apps/api/src/modules/storage/dto/submit-deletion-request.dto.ts`
  - `reason` (string, min 10 chars)
  - `replacementFileId` (optional UUID)

- **ReviewDeletionRequestDto**: `apps/api/src/modules/storage/dto/review-deletion-request.dto.ts`
  - `approve` (boolean)
  - `comment` (optional string)

### Events & Broadcasting
- **Gateway**: `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts`
  - WebSocket namespace: `/storage`
  - Broadcasts events via `broadcastSyncEvent()`
    - `deletion_request_rejected` (when DCC rejects)
    - `document_updated` with `replacementDocumentId` (when approved with replacement)

### Module Registration
- **StorageModule**: `apps/api/src/modules/storage/storage.module.ts`
  - Controllers: FolderController, DocumentController, DeletionRequestController, StatsController
  - Services: DocumentDeletionService (Injectable)
  - Gateway: FolderSyncGateway
  - Handlers: DocumentSyncHandler, FolderSyncHandler, SyncDeletionHandler

### Permissions & Access Control
- **Access Control**: DeletionRequestController
  - DCC role check: Only users with role "dcc" or "admin" can:
    - List pending requests
    - Review/approve/reject requests
  - User can:
    - View own deletion requests (`/my-requests`)
    - Submit deletion request (after 72h or if not uploader)
    - Get specific request details (if requester or DCC)

- **Role**: "dcc" role (created in seed)
  - Seed file: `apps/api/prisma/seeds/create-dcc-role.ts`

### Key Symbols/Strings
- **Model/Table**: `DeletionRequest`, `deletion_requests`
- **Status enum**: PENDING, APPROVED, REJECTED
- **Window**: 72 hours (DocumentDeletionService.DELETION_WINDOW_HOURS = 72)
- **Folder**: `Delete_files` (where deleted/replaced files moved)
- **Routes**: `/storage/deletion-requests`, `/storage/documents/:id/deletion-*`
- **Event types**: `deletion_request_rejected`, `document_updated`, `deletion_request_*`
- **Permission**: Role "dcc" checks `role.name === "dcc"`

---

## Key Integration Points
1. **Submission**: User can't delete → submit request via POST `/storage/documents/:id/deletion-requests`
2. **Review**: DCC views pending requests at `/storage/deletion-requests` → POST review endpoint
3. **Approval**: Executes delete/replacement → broadcasts socket event to update frontend
4. **Audit**: Every deletion creates audit log (action: DELETE or REPLACE)
5. **Cleanup**: Rejection deletes replacement file if it exists

---

## Questions Remaining
- None identified for core backend deletion request feature
- (Frontend components exist but not in scope of this scout)
