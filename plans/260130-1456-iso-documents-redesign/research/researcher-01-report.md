# Researcher 01: Database Schema & API Requirements

## Scope
Analyze current Document schema and identify gaps for ISO document metadata fields: Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date.

## Current State

### Document Model (Prisma Schema)
**Location:** `apps/api/prisma/schema.prisma`

**Existing Fields:**
- Basic: id, name, fileName, fileType, fileSize, filePath, folderId, status
- Metadata: mimeType, checksum, fileCreatedAt, fileModifiedAt
- Deletion: uploadedBy, uploadedAt, deletionExpiresAt
- Timestamps: createdAt, updatedAt

**Missing ISO Metadata Fields:**
- `level` (string/enum) - Document level classification
- `preparerId` (string, FK to User) - User who prepared document
- `reviewerId` (string, FK to User) - User who reviewed document
- `approverId` (string, FK to User) - User who approved document
- `approvalDate` (DateTime?) - Date when document was approved
- `receiptDate` (DateTime?) - Date when document was received

### Related Models
- **User**: Already exists with id, username, fullName, email
- **Department**: Already exists, linked via Folder.departmentId
- **Folder**: Has departmentId relation

## API Current State

### Document Controller
**Location:** `apps/api/src/modules/storage/controllers/document.controller.ts`

**Endpoints:**
- `GET /storage/documents` - List with filters (status, departmentId, level placeholder)
- `GET /storage/documents/:id` - Get single document
- `POST /storage/documents/upload` - Upload new document
- `PATCH /storage/documents/:id/rename` - Rename document

**Query DTO:**
- `QueryDocumentsDto` already has `level?: string` (placeholder)

### Document Service
**Location:** `apps/api/src/modules/storage/services/document.service.ts`

**Current Filters:**
- Status (ACTIVE/ARCHIVED/DELETED)
- DepartmentId (via folder relation)
- Level (commented out, placeholder)

## Gaps Analysis

### Schema Gaps
1. **Level Field**: Not in schema, needs enum or string
2. **Workflow Fields**: Preparer, Reviewer, Approver not tracked
3. **Date Fields**: Approval Date, Receipt Date not tracked
4. **Relations**: Need User relations for preparer/reviewer/approver

### API Gaps
1. **Filtering**: Level filter exists but not functional (no schema field)
2. **Updating**: No endpoints to update ISO metadata fields
3. **DTOs**: No DTOs for updating ISO metadata

### Frontend Gaps
1. **Display**: Columns show placeholders ("—") for missing fields
2. **Editing**: No UI to edit preparer/reviewer/approver/dates
3. **Filters**: Level filter exists but not functional

## Recommendations

### Option A: Minimal Schema Extension
Add fields directly to Document model:
```prisma
level          String?   // ISO document level
preparerId     String?   @map("preparer_id")
reviewerId     String?   @map("reviewer_id")
approverId     String?   @map("approver_id")
approvalDate   DateTime? @map("approval_date")
receiptDate    DateTime? @map("receipt_date")

preparer   User? @relation("DocumentPreparer", fields: [preparerId], references: [id])
reviewer   User? @relation("DocumentReviewer", fields: [reviewerId], references: [id])
approver   User? @relation("DocumentApprover", fields: [approverId], references: [id])
```

**Pros:** Simple, direct, easy to query
**Cons:** Requires migration, adds nullable fields

### Option B: JSON Metadata Field
Add single JSON field:
```prisma
isoMetadata Json? @map("iso_metadata")
```

**Pros:** Flexible, no migration complexity
**Cons:** Harder to query/filter, less type-safe

### Recommendation: Option A
- Type-safe queries
- Easy filtering by level, preparer, reviewer, approver
- Better performance (indexed fields)
- Aligns with existing patterns (User relations)

## Migration Strategy
1. Add nullable fields to Document model
2. Create migration script
3. Update Prisma client
4. Update API DTOs and services
5. Update frontend components

## Related Files
- `apps/api/prisma/schema.prisma` - Schema definition
- `apps/api/src/modules/storage/dto/query-documents.dto.ts` - Query DTO
- `apps/api/src/modules/storage/services/document.service.ts` - Service logic
- `apps/api/src/modules/storage/controllers/document.controller.ts` - API endpoints
