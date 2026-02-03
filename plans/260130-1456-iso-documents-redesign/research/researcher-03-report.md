# Researcher 03: Upload Requirements & Department-Based Access Control

## Scope
Analyze upload requirements: mandatory level selection, automatic department assignment, department-based document visibility, and automatic field population.

## New Requirements

### Upload Requirements
1. **Level is MANDATORY** when uploading documents
2. **Responsible Department** automatically set to uploader's department
3. **Other fields** (preparer, reviewer, approver, approval date, receipt date) automatically filled by system

### Access Control Requirements
1. **Regular users**: Can only see documents from their own department
2. **Admin, DCC, Boss**: Can see all documents from all departments
3. **Department filtering**: Applied automatically based on user role

## Current State Analysis

### User Department System
**Location:** `apps/api/src/modules/kpi/services/user-department.resolver.ts`

**User Department Access:**
- Users have multiple departments via `UserDepartment` junction table
- `getUserWithDepartments()` returns user's department IDs
- Fallback to legacy `department` field if no junction entries

**Role System:**
- **admin**: Full access (`manage:all`)
- **boss**: Read-only access (`view:all`, `download:all`, `print:all`)
- **dcc**: Document Control Center role (can approve deletion requests)
- **manager, editor, viewer**: Regular roles with department-based access

### Upload Flow
**Location:** `apps/api/src/modules/storage/services/document.service.ts`

**Current Upload:**
- Requires `folderId`
- Sets `uploadedBy` and `uploadedAt`
- No level requirement
- No automatic department assignment
- No automatic field population

### Document Query
**Location:** `apps/api/src/modules/storage/services/document.service.ts`

**Current Filtering:**
- `findAll()` supports `departmentId` filter
- No automatic department filtering based on user role
- Admin/boss/dcc can see all, but filtering is manual

## Gaps Analysis

### Upload Gaps
1. **Level not required**: Currently optional/nullable
2. **Department not auto-set**: Must manually select folder with department
3. **No auto-population**: Preparer/reviewer/approver/dates not set automatically

### Access Control Gaps
1. **No automatic filtering**: Users can see all documents if they know the API
2. **Department filtering manual**: Not enforced at service level
3. **Role-based visibility**: Not implemented in document queries

## Recommendations

### Upload Changes
1. **Make level required** in upload DTO
2. **Auto-set department** from uploader's department (first department if multiple)
3. **Auto-populate fields**:
   - `preparerId` = uploader's userId
   - `reviewerId` = null (to be set later)
   - `approverId` = null (to be set later)
   - `approvalDate` = null (to be set later)
   - `receiptDate` = current date (auto-set on upload)

### Access Control Changes
1. **Service-level filtering**:
   - Check user roles (admin/dcc/boss)
   - If not admin/dcc/boss, filter by user's department IDs
   - Apply filter automatically in `findAll()` method

2. **Folder selection**:
   - When uploading, ensure folder belongs to user's department
   - Or auto-create folder in user's department if needed

3. **Query enhancement**:
   - Add `userDepartmentIds` parameter to `findAll()`
   - Filter documents where `folder.departmentId IN userDepartmentIds`
   - Skip filter for admin/dcc/boss roles

## Implementation Strategy

### Phase 1: Upload Requirements
- Update upload DTO to require level
- Get uploader's department from `UserDepartmentResolver`
- Auto-set department on document (via folder or direct field)
- Auto-populate preparer, receipt date

### Phase 2: Access Control
- Update `findAll()` to check user roles
- Apply department filter automatically
- Update controller to pass user info to service
- Test with different user roles

## Related Files
- `apps/api/src/modules/storage/services/document.service.ts` - Upload and query logic
- `apps/api/src/modules/storage/controllers/document.controller.ts` - Upload endpoint
- `apps/api/src/modules/kpi/services/user-department.resolver.ts` - User department resolver
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` - Role checking

## Unresolved Questions
1. What should happen if user has multiple departments? Use first one?
2. Should receiptDate be set to upload date or a separate field?
3. Should preparer always be the uploader, or can it be different?
4. How to handle folder selection if user can only upload to their department?
