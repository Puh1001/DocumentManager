# Scout Report: Request Document Deletion Workflow

**Repo**: D:/documentsManager | **Date**: Apr 25, 2026  
**Search Scope**: Tests (E2E/Unit/Integration), Docs, Config, Schema/Migrations, OpenAPI/Postman

---

## FINDINGS SUMMARY

| Category | File Count | Status |
|----------|-----------|--------|
| **Schema & Enums** | 2 | ✅ Found |
| **Backend Tests** | 2 | ✅ Found |
| **Frontend Components** | 8 | ✅ Found |
| **Documentation** | 1 | ✅ Found |
| **OpenAPI/Postman** | 0 | ⚠️ Missing |
| **Migrations** | 0 | ⚠️ Missing |

---

## DETAILED FILE LIST

### 🔵 SCHEMA & DATABASE

**1. `apps/api/prisma/schema.prisma` (Lines 276-311)**
- **Why**: DeletionRequest model + RequestStatus enum
- **Key Symbols**:
  - `enum RequestStatus { PENDING, APPROVED, REJECTED }`
  - `model DeletionRequest { id, documentId, requestedBy, reason, status, reviewedBy, replacementFileId, ... }`
  - Relations: `requester (User)`, `document (Document)`, `reviewer (User)`, `replacementFile (Document)`
  - Indexes: `documentId, requestedBy, status, (status, requestedAt)`

---

### 🔴 BACKEND TESTS

**2. `apps/api/src/modules/storage/deletion-workflow.integration.spec.ts`**
- **Why**: E2E integration test for entire deletion request lifecycle
- **Key Test Scenarios**:
  - 72-hour self-deletion window validation
  - Deletion request submission after expiry
  - DCC approval workflow
  - Request rejection workflow
  - Status tracking (PENDING → APPROVED/REJECTED)
- **Setup**: Test user, DCC user, test department, document creation
- **Unresolved**: Full test file >100 lines, need complete review

**3. `apps/api/src/modules/storage/services/document-deletion.service.spec.ts` (Lines 1-558)**
- **Why**: Unit tests for DocumentDeletionService core logic
- **Key Test Cases**:
  - `checkDeletionStatus()`: 72h window, expiry detection, DCC override
  - `submitDeletionRequest()`: Create request, reject if <72h, detect duplicates
  - `reviewRequest()`: Approve (move file), reject (save comment), DCC role check
  - `selfDelete()`: Direct deletion within 72h
  - `listPendingRequests()`: Query PENDING status
- **Key Mocks**: PrismaService, DocumentService, FolderService, SmbService, UsersService
- **Key Assertions**:
  - `status.canDelete` (bool)
  - `status.isExpired` (bool)
  - `status.remainingHours` (number)
  - `status.requiresDCCApproval` (bool)
  - `status.hasActiveRequest` (bool)

---

### 🟢 FRONTEND COMPONENTS

**4. `apps/web/src/components/documents/deletion-request-dialog.tsx` (Lines 1-282)**
- **Why**: User-facing dialog to submit deletion requests
- **Key Features**:
  - Reason textarea (min 10 chars validation)
  - Optional replacement file upload
  - Submit form to `POST /storage/documents/{documentId}/deletion-requests`
  - Request body: `{ reason, replacementFileId? }`

**5. `apps/web/src/components/documents/deletion-status-badge.tsx`**
- **Why**: Status indicator badge on document cards
- **Key Statuses**: Can Delete, Requires DCC Approval, Pending DCC Review, Rejected, No Permission

**6. `apps/web/src/components/documents/deletion-actions.tsx`**
- **Why**: Action buttons for deletion workflows
- **Key**: Self-delete (within 72h) vs Request Deletion (after 72h)

**7. `apps/web/src/components/documents/deletion-error-boundary.tsx`**
- **Why**: Error handling wrapper for deletion operations

**8. `apps/web/src/components/boss/kpi-attachment-deletion-badge.tsx`**
- **Why**: KPI attachment deletion status badge (similar deletion flow)

**9. `apps/web/src/components/boss/kpi-attachment-deletion-request-dialog.tsx`**
- **Why**: KPI attachment deletion request dialog (mirrors document deletion)

**10. `apps/web/src/components/documents/document-list.tsx`**
- **Why**: Integration point showing deletion actions/badges on list

**11. `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`**
- **Why**: DCC dashboard page listing pending deletion requests

---

### 🟡 BACKEND CONTROLLERS/DTOs

**12. `apps/api/src/modules/storage/controllers/deletion-request.controller.ts` (Lines 1-77)**
- **Why**: HTTP endpoints for deletion requests
- **Endpoints**:
  - `GET /storage/deletion-requests` - List pending (DCC/Admin only)
  - `GET /storage/deletion-requests/my-requests` - Current user's requests
  - `GET /storage/deletion-requests/:id` - Get request details
  - `POST /storage/deletion-requests/:id/review` - DCC review (approve/reject)
- **Authorization**: DCC role check in controller (defense in depth)

**13. `apps/api/src/modules/storage/dto/submit-deletion-request.dto.ts` (Lines 1-21)**
- **Why**: DTO for deletion request submission
- **Fields**:
  - `reason: string` (min 10 chars, required)
  - `replacementFileId?: string` (UUID, optional)

---

### 📄 DOCUMENTATION

**14. `docs/deletion-requests-guide.md` (Lines 1-313)**
- **Why**: Complete user guide for deletion requests workflow
- **Sections**:
  - 72-hour rule explanation
  - How to submit request (steps 1-4)
  - Status badges & meanings (Can Delete, Requires DCC Approval, Pending DCC Review, Rejected, No Permission)
  - DCC review process (approval/rejection steps)
  - Common scenarios & FAQ
  - Replacement file feature
- **Key Processes**:
  - Users within 72h: Self-delete directly
  - Users after 72h: Submit request → DCC approval
  - DCC: Can delete anytime, can approve/reject requests
  - Files moved to `[Department]/Deleted files` folder (not permanently deleted)

---

### 🟠 MISSING COMPONENTS (⚠️ Unresolved)

**OpenAPI/Postman Collection**: Not found
- **Issue**: No OpenAPI spec file or Postman collection detected
- **Likely Locations**: Check `apps/api/openapi/`, `docs/api/`, `.postman/`
- **Action**: May need to generate OpenAPI from NestJS Swagger decorators

**Prisma Migrations**: Not found
- **Issue**: No migrations directory located
- **Likely Path**: `apps/api/prisma/migrations/`
- **Action**: Migration may be embedded in schema (check Prisma setup)

**Frontend Tests (E2E/Integration)**: Not found
- **Issue**: No test files for deletion workflow components
- **Likely**: Need Playwright/Vitest tests for deletion dialogs and DCC dashboard

---

## KEY SYMBOLS & STRINGS

### Database
```
enum RequestStatus { PENDING, APPROVED, REJECTED }
model DeletionRequest
  - uniqueConstraint: documentId (1 request per document)
  - indexes: (documentId), (requestedBy), (status), (status, requestedAt)
```

### Service Methods
```
checkDeletionStatus(docId, userId) → { canDelete, isExpired, remainingHours, requiresDCCApproval, hasActiveRequest }
submitDeletionRequest(docId, userId, reason, replacementFileId?)
reviewRequest(requestId, reviewerId, approve, comment?)
selfDelete(docId, userId)
listPendingRequests()
```

### API Routes
```
POST   /storage/documents/{docId}/deletion-requests (submit)
GET    /storage/deletion-requests (list pending)
GET    /storage/deletion-requests/my-requests (user's requests)
GET    /storage/deletion-requests/{id} (details)
POST   /storage/deletion-requests/{id}/review (DCC review)
```

### Status Badges (Frontend)
```
"Can Delete" (ACTIVE, <72h)
"Requires DCC Approval" (ACTIVE, >72h, no request)
"Pending DCC Review" (request.status = PENDING)
"Rejected" (request.status = REJECTED)
"No Permission" (not uploader, not in dept)
```

---

## UNRESOLVED QUESTIONS

1. **Where is the OpenAPI/Swagger spec?**
   - Controller has `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` decorators
   - Swagger docs likely at `http://localhost:3000/api/docs` in dev
   - Need to check if spec is exported to JSON

2. **Prisma migrations history?**
   - Is there a migration file for DeletionRequest model creation?
   - Location may be `apps/api/prisma/migrations/*/migration.sql`

3. **E2E tests for frontend deletion workflow?**
   - Are deletion dialogs and DCC dashboard tested with Playwright?
   - Tests may be in `apps/web/e2e/` or similar

4. **Replacement file deletion on rejection?**
   - Documentation mentions "If rejected, the new file will be deleted"
   - Need to confirm if this is implemented in `reviewRequest()` service

5. **WebSocket notifications for DCC approval?**
   - Does system notify users when request is approved/rejected?
   - Check for `FolderSyncGateway.broadcastSyncEvent()` in deletion service

6. **Department "Deleted files" folder creation?**
   - Service creates folder if missing: `IT/Deleted files`
   - Is "IT" the department code or hardcoded?
   - Check department structure

---

## NEXT STEPS

✅ **Priority 1: Review Core Files**
1. Read complete `deletion-workflow.integration.spec.ts` (currently truncated)
2. Check service implementation: `document-deletion.service.ts` (implementation, not just tests)
3. Review controller authorization logic

⚠️ **Priority 2: Find Missing Files**
1. Search for OpenAPI spec generation config
2. Locate Prisma migrations
3. Find or create E2E tests

🔍 **Priority 3: Verify Features**
1. Confirm replacement file deletion on rejection
2. Verify department "Deleted files" folder logic
3. Check WebSocket notification implementation
