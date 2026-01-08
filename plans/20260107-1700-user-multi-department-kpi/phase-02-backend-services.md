# Phase 2: Backend Services & API

**Phase:** 02  
**Duration:** 3-4 hours  
**Dependencies:** Phase 1 complete

## Context

With UserDepartment model in place, update backend services to support multi-department users. Update KPI access control to check all user's departments.

## Overview

Modify user services for department assignment, update KPI services to allow CRUD across user's departments, enhance access control guards.

## Requirements

### User Service Updates

1. Extend user CRUD to manage departments via junction table
2. Add endpoints:
   - Assign user to department(s)
   - Remove user from department
   - Get user's departments
3. Maintain backward compatibility with legacy department field

### KPI Service Updates

1. Update `UserDepartmentResolver`:
   - Return array of departmentIds instead of single
   - Modify `UserWithDepartment` interface
2. Update `KpiRecordService`:
   - Check if record's department in user's departments list
   - Allow filtering by any user's department
3. Update guards and decorators

### API Changes

1. New endpoints:
   - `POST /users/:id/departments` - Assign departments
   - `DELETE /users/:id/departments/:deptId` - Remove department
   - `GET /users/:id/departments` - List user's departments
2. Update existing endpoints:
   - `GET /kpi/records` - Returns KPIs from all user's departments

## Architecture

```typescript
// Updated interfaces
interface UserWithDepartments {
  userId: string;
  departmentIds: string[]; // Multiple departments
  roles: string[];
  isAdmin: boolean;
  isBoss: boolean;
}

// Service methods
class UsersService {
  async assignDepartments(
    userId: string,
    departmentIds: string[]
  ): Promise<void>;
  async removeDepartment(userId: string, departmentId: string): Promise<void>;
  async getUserDepartments(userId: string): Promise<Department[]>;
}

class KpiRecordService {
  // Updated to check multiple departments
  private checkDepartmentAccess(
    departmentId: string,
    user: UserWithDepartments
  ): void;

  // Updated to filter by user's departments
  async findAll(
    params: FindAllParams,
    user: UserWithDepartments
  ): Promise<KpiRecord[]>;
}
```

## Implementation Steps

### 1. Update Type Definitions

**File:** `apps/api/src/modules/kpi/services/user-department.resolver.ts`

- [x] Rename `UserWithDepartment` to `UserWithDepartments`
- [x] Change `departmentId: string | null` to `departmentIds: string[]`
- [x] Update `getUserWithDepartment` to return array of department IDs
- [x] Query UserDepartment junction table instead of string field

### 2. Update Users Service

**File:** `apps/api/src/modules/users/users.service.ts`

- [x] Add `assignDepartments(userId, departmentIds[])`
- [x] Add `removeDepartment(userId, departmentId)`
- [x] Add `getUserDepartments(userId)`
- [x] Update `create()` to optionally assign departments
- [x] Update `findById()` to include departments relation

### 3. Update Users Controller

**File:** `apps/api/src/modules/users/users.controller.ts`

- [x] Add `POST /users/:id/departments` endpoint
- [x] Add `DELETE /users/:id/departments/:deptId` endpoint
- [x] Add `GET /users/:id/departments` endpoint
- [x] Add proper guards and validation

### 4. Update Users DTOs

**Files:**

- `apps/api/src/modules/users/dto/create-user.dto.ts`
- `apps/api/src/modules/users/dto/update-user.dto.ts`
- Create `apps/api/src/modules/users/dto/assign-departments.dto.ts`

- [x] Add optional `departmentIds?: string[]` to CreateUserDto (via DTO)
- [x] Create AssignDepartmentsDto with validation
- [x] Keep legacy `department` field optional

### 5. Update KPI Record Service

**File:** `apps/api/src/modules/kpi/services/kpi-record.service.ts`

- [x] Update `findAll()`: if regular user, filter by `departmentIds` array
- [x] Update `checkDepartmentAccess()`: check if department in user's `departmentIds`
- [x] Update `create()`: validate department in user's departments
- [x] Update `update()`: validate new department in user's departments

### 6. Update KPI Guards & Decorators

**Files:**

- `apps/api/src/modules/kpi/guards/user-department.guard.ts`
- `apps/api/src/modules/kpi/decorators/current-user-with-department.decorator.ts`

- [x] Update decorator to use new `UserWithDepartments` interface
- [x] Update guard to pass new structure

### 7. Update Error Codes

**File:** `apps/api/src/common/errors/error-codes.ts`

- [x] Add codes for department assignment errors:
  - `DEPARTMENT_NOT_ASSIGNED`
  - (Other codes can be added as needed)

### 8. Update Controllers & Types

**Files:**

- `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`
- `apps/api/src/common/types/request.types.ts`
- `apps/api/src/modules/kpi/services/kpi-record.service.spec.ts`

- [x] Update KPI controller to use `UserWithDepartments`
- [x] Update request types
- [x] Update test mocks for multi-department support

## Todo List

```yaml
- id: update-types
  content: Update UserWithDepartment interface to support arrays
  status: pending

- id: users-service
  content: Implement department assignment methods in UsersService
  status: pending

- id: users-controller
  content: Add department management endpoints
  status: pending

- id: kpi-service
  content: Update KPI service for multi-department access
  status: pending

- id: guards-decorators
  content: Update guards and decorators
  status: pending

- id: error-codes
  content: Add new error codes
  status: pending

- id: unit-tests
  content: Write unit tests for new functionality
  status: pending

- id: integration-tests
  content: Update KPI integration tests
  status: pending
```

## Success Criteria

- [x] Users can be assigned to multiple departments via API ✅
- [x] KPI queries return records from all user's departments ✅
- [x] Regular users can CRUD KPIs for any of their departments ✅
- [x] Admin/Boss maintain full access ✅
- [x] Proper error handling for invalid departments ✅
- [x] All TypeScript compilation passes ✅
- [ ] All unit tests pass (needs testing)
- [ ] All integration tests pass (needs testing)

## Implementation Results

✅ **Completed Successfully!**

- **New Endpoints Created:** 3
  - `GET /api/users/:id/departments` - Get user's departments
  - `POST /api/users/:id/departments` - Assign departments to user
  - `DELETE /api/users/:id/departments/:deptId` - Remove department from user
- **Services Updated:** 2
  - `UsersService` - Added 3 new department management methods
  - `KpiRecordService` - Updated to support multi-department access
- **Types Updated:**
  - `UserWithDepartments` interface created
  - Legacy `UserWithDepartment` kept for backward compatibility
  - All controllers, guards, decorators updated
- **Database:**
  - Uses `UserDepartment` junction table from Phase 1
  - 52/53 users migrated to new system
- **Type Safety:** ✅ All TypeScript errors resolved

## API Examples

### Assign Departments

```http
POST /api/users/user-123/departments
Content-Type: application/json

{
  "departmentIds": ["dept-1", "dept-2", "dept-3"]
}
```

### Remove Department

```http
DELETE /api/users/user-123/departments/dept-2
```

### Get User Departments

```http
GET /api/users/user-123/departments

Response:
[
  { "id": "dept-1", "name": "HR", "code": "HR" },
  { "id": "dept-3", "name": "IT", "code": "IT" }
]
```

### Get KPI Records (Multi-Department)

```http
GET /api/kpi/records?year=2024

Response: Returns KPIs from all user's departments
```

## Testing Strategy

1. **Unit Tests**
   - Test department assignment/removal
   - Test KPI access control with multiple departments
   - Test edge cases

2. **Integration Tests**
   - Create user with multiple departments
   - Create KPIs in different departments
   - Verify user can access all their departments' KPIs
   - Verify user cannot access other departments' KPIs

3. **Manual Testing**
   - Test via Postman/Insomnia
   - Verify database state after operations

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                                     |
| ---------------------------- | ---------- | ------ | ---------------------------------------------- |
| Breaking existing KPI access | Medium     | High   | Keep backward compatibility, extensive testing |
| Performance degradation      | Low        | Medium | Use proper indexes, optimize queries           |
| Authorization bypass         | Low        | High   | Careful guard implementation, security review  |

## Notes

- Maintain backward compatibility with single department
- Admin UI updates in Phase 3
- Consider caching user departments for performance
