# Phase 02: Backend API Updates

## Context Links

- Parent: [plan.md](plan.md)
- Depends on: [phase-01-database-schema.md](phase-01-database-schema.md)
- Research: [researcher-01-report.md](research/researcher-01-report.md), [researcher-03-report.md](research/researcher-03-report.md)
- Controller: `apps/api/src/modules/storage/controllers/document.controller.ts`
- Service: `apps/api/src/modules/storage/services/document.service.ts`
- User Resolver: `apps/api/src/modules/kpi/services/user-department.resolver.ts`

## Overview

- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Update API endpoints, DTOs, and services to support ISO metadata fields. Add update endpoint and enhance queries.
- **Implementation status:** Completed (2026-01-30)
- **Review status:** Completed — [phase-02-code-review.md](reports/phase-02-code-review.md)

## Key Insights

- Current API supports basic document CRUD
- Query DTO already has level placeholder
- **Level must be REQUIRED in upload DTO** (non-optional)
- **Department auto-set from uploader's department** (via UserDepartmentResolver)
- **Auto-populate fields:** preparerId = uploader, receiptDate = upload date
- **Department-based access control:** Users see own department, admin/dcc/boss see all
- Need new DTO for ISO metadata update
- Service needs to include user relations in queries
- Filter by level needs to be enabled

## Requirements

### Functional

- **Create DocumentLevel CRUD endpoints** (GET /storage/document-levels)
- **Update upload endpoint** to require levelId (mandatory field, validate exists in DB)
- **Auto-set department** from uploader's department (get from UserDepartmentResolver)
- **Auto-populate fields:** preparerId = uploader, receiptDate = upload date
- **Implement department-based access control:** Filter documents by user's department (unless admin/dcc/boss)
- Update `GET /storage/documents` to include ISO metadata fields and apply department filter
- Update `GET /storage/documents/:id` to include level relation and user relations
- Add `PATCH /storage/documents/:id/iso-metadata` endpoint
- Create `UpdateIsoMetadataDto` for ISO metadata updates
- Enable level filtering in service (filter by levelId)
- Include level and user relations in document queries

### Non-Functional

- Backward compatible (nullable fields)
- Validation for dates and user IDs
- Proper error handling
- Follow existing API patterns

## Architecture

### API Endpoints

#### Get Document Levels

```
GET /storage/document-levels?isActive=true
Response: DocumentLevel[] (filtered by isActive, sorted by sortOrder)
```

#### Upload Document (Updated)

```
POST /storage/documents/upload
Body (multipart/form-data): {
  file: File (required)
  folderId: string (required)
  name?: string
  fileName?: string
  levelId: string (REQUIRED) // NEW: Mandatory field, FK to DocumentLevel
}
Response: Document (with level relation and auto-populated fields)
```

**Auto-populated on upload:**

- `preparerId` = uploader's userId
- `receiptDate` = current date/time
- `reviewerId` = null (to be set later)
- `approverId` = null (to be set later)
- `approvalDate` = null (to be set later)
- Department = uploader's department (via folder or direct assignment)

#### Update ISO Metadata

```
PATCH /storage/documents/:id/iso-metadata
Body: {
  level?: string
  preparerId?: string | null
  reviewerId?: string | null
  approverId?: string | null
  approvalDate?: string | null  // ISO date string
  receiptDate?: string | null   // ISO date string
}
Response: Document (with relations)
```

#### List Documents (Updated with Access Control)

```
GET /storage/documents?status=&departmentId=&level=&page=&limit=
Response: {
  data: Document[] (filtered by user's department unless admin/dcc/boss)
  total: number
  page: number
  limit: number
  totalPages: number
}
```

**Access Control:**

- Regular users: Only see documents from their department(s)
- Admin, DCC, Boss: See all documents from all departments
- Filter applied automatically at service level

### DTO Structure

```typescript
// Upload Document DTO (Updated)
export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  folderId: string;

  @IsString()
  @IsNotEmpty() // NEW: REQUIRED
  @IsUUID() // Validate UUID format
  levelId: string; // Mandatory on upload, FK to DocumentLevel

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

// UpdateIsoMetadataDto
export class UpdateIsoMetadataDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsUUID()
  preparerId?: string | null;

  @IsOptional()
  @IsUUID()
  reviewerId?: string | null;

  @IsOptional()
  @IsUUID()
  approverId?: string | null;

  @IsOptional()
  @IsDateString()
  approvalDate?: string | null;

  @IsOptional()
  @IsDateString()
  receiptDate?: string | null;
}
```

### Service Updates

```typescript
// DocumentService
async upload(
  folderId: string,
  file: Express.Multer.File,
  userId: string,
  levelId: string, // NEW: Required parameter, FK to DocumentLevel
  name?: string,
  fileName?: string
): Promise<Document> {
  // Validate levelId exists in DocumentLevel table
  // Validate level is active (isActive = true)
  // Get user's department from UserDepartmentResolver
  // Auto-set preparerId = userId
  // Auto-set receiptDate = now()
  // Ensure folder belongs to user's department (or allow admin/dcc/boss)
  // Create document with levelId and auto-populated fields
}

async findAll(
  filters?: FindAllDocumentsFilters,
  userId?: string,
  userRoles?: string[]
): Promise<PaginatedDocuments> {
  // Check if user is admin/dcc/boss
  // If not, get user's department IDs
  // Apply department filter automatically
  // Include preparer, reviewer, approver relations
  // Enable level filtering
  // Return filtered data
}

async updateIsoMetadata(
  id: string,
  dto: UpdateIsoMetadataDto,
  userId: string
): Promise<Document> {
  // Validate user IDs exist
  // Update document
  // Return with relations
}
```

## Related Code Files

### Files to Modify

- `apps/api/src/modules/storage/controllers/document.controller.ts` - Add update endpoint, add levels endpoint
- `apps/api/src/modules/storage/services/document.service.ts` - Update queries and add update method
- `apps/api/src/modules/storage/dto/query-documents.dto.ts` - Enable level filter

### Files to Create

- `apps/api/src/modules/storage/services/document-level.service.ts` - DocumentLevel CRUD service
- `apps/api/src/modules/storage/controllers/document-level.controller.ts` - DocumentLevel API endpoints
- `apps/api/src/modules/storage/dto/update-iso-metadata.dto.ts` - ISO metadata update DTO

## Implementation Steps

1. **Create DocumentLevel Service & Controller**
   - Create DocumentLevelService with findAll() method
   - Filter by isActive, sort by sortOrder
   - Create DocumentLevelController with GET /storage/document-levels endpoint
   - Support i18n (return nameEn, nameVi, nameZh based on locale)

2. **Update Upload DTO**
   - Add `levelId` field as required (non-optional, UUID)
   - Update validation decorators (@IsUUID)
   - Update API documentation

3. **Update DocumentService.upload()**
   - Inject `UserDepartmentResolver` service
   - Validate `levelId` exists in DocumentLevel table
   - Validate level is active (isActive = true)
   - Get uploader's department IDs
   - Require `levelId` parameter (non-optional)
   - Auto-set `preparerId` = userId
   - Auto-set `receiptDate` = current date/time
   - Validate folder belongs to user's department (unless admin/dcc/boss)
   - Create document with levelId and auto-populated fields

4. **Update DocumentService.findAll()**
   - Add `userId` and `userRoles` parameters
   - Check if user is admin/dcc/boss (roles: ["admin", "dcc", "boss"])
   - If not admin/dcc/boss, get user's department IDs from UserDepartmentResolver
   - Apply department filter: `folder.departmentId IN userDepartmentIds`
   - Include level relation (DocumentLevel) in query
   - Include preparer, reviewer, approver relations in query
   - Enable level filtering (filter by levelId)
   - Return filtered documents with level data

5. **Update DocumentController**
   - Add `GET /storage/document-levels` endpoint (delegate to DocumentLevelController)
   - Update upload endpoint to require levelId in body
   - Pass userId and userRoles to findAll()
   - Use `@CurrentUserWithDepartment()` decorator if available
   - Add `PATCH /storage/documents/:id/iso-metadata` endpoint
   - Use `@CheckPolicies` decorator for authorization
   - Handle validation errors

6. **Create UpdateIsoMetadataDto**
   - Add validation decorators
   - Support nullable values (for clearing fields)
   - Validate UUIDs and dates

7. **Update DocumentService.updateIsoMetadata()**
   - Validate user IDs exist before updating
   - Handle date string conversion
   - Include user relations in response

8. **Update Service Queries**
   - Include preparer, reviewer, approver in `findById`
   - Include relations in `findAll` response
   - Add level filtering logic

## Todo List

- [ ] Create DocumentLevelService
- [ ] Create DocumentLevelController
- [ ] Add GET /storage/document-levels endpoint
- [ ] Update upload DTO to require levelId field (UUID)
- [ ] Inject UserDepartmentResolver into DocumentService
- [ ] Update upload() to validate levelId exists and is active
- [ ] Update upload() to require levelId and auto-populate fields
- [ ] Update upload() to get user's department and validate folder
- [ ] Update findAll() to accept userId and userRoles
- [ ] Implement department-based filtering in findAll()
- [ ] Check admin/dcc/boss roles for bypassing filter
- [ ] Update controller to pass user info to findAll()
- [ ] Create `UpdateIsoMetadataDto` with validation
- [ ] Add `updateIsoMetadata` method to DocumentService
- [ ] Validate user IDs exist before updating
- [ ] Handle date string conversion
- [ ] Update `findAll` to include level relation (DocumentLevel)
- [ ] Update `findAll` to include user relations
- [ ] Enable level filtering in service
- [ ] Add update endpoint to controller
- [ ] Add authorization check (CheckPolicies)
- [ ] Test upload with level requirement
- [ ] Test department-based access control
- [ ] Test admin/dcc/boss see all documents
- [ ] Test regular users see only their department
- [ ] Update API documentation (Swagger)

## Success Criteria

- DocumentLevel API endpoint returns available levels
- LevelId is required when uploading documents (validation error if missing or invalid)
- LevelId is validated against DocumentLevel table (must exist and be active)
- Responsible Department automatically set to uploader's department
- Preparer automatically set to uploader on upload
- Receipt Date automatically set to upload date
- Regular users can only see documents from their department(s)
- Admin, DCC, Boss can see all documents from all departments
- Department filtering applied automatically at service level
- Update endpoint accepts ISO metadata fields
- User relations are included in document queries
- Level filtering works correctly
- Validation errors are handled properly
- Authorization is enforced
- API documentation is updated

## Risk Assessment

### Risks

- **Level required:** Breaking change for existing uploads - must update frontend first
- **DocumentLevel table:** Must be created and seeded before Document levelId FK
- **Level validation:** Need to validate levelId exists and is active
- **Department filtering:** Users might not see documents they expect - need clear error messages
- **Multiple departments:** User with multiple departments - use first one or allow all?
- **Invalid user IDs:** Validate before updating
- **Date format issues:** Use ISO date strings, validate format
- **Performance impact:** Include relations only when needed
- **Folder validation:** Users might try to upload to wrong department folder

### Mitigations

- Update frontend to require level before backend deployment
- Use UserDepartmentResolver to get all user departments (allow all if multiple)
- Add clear error messages for department access denied
- Validate levelId exists in DocumentLevel table before upload
- Validate level is active (isActive = true) before upload
- Validate all user IDs exist before updating
- Use class-validator for date format validation
- Use Prisma select/include to optimize queries
- Add error handling for invalid data
- Validate folder belongs to user's department on upload

## Security Considerations

- Authorization check via `@CheckPolicies` decorator
- Department-based access control prevents unauthorized document access
- Validate user IDs to prevent invalid references
- Validate folder belongs to user's department (unless admin/dcc/boss)
- Level field required prevents incomplete document metadata
- Audit log for ISO metadata updates (optional)
- Input validation prevents injection attacks
- Role-based filtering ensures proper data isolation

## Next Steps

- Proceed to Phase 03: Frontend Display Enhancement
- Update frontend to display new fields
- Format dates and user names properly
