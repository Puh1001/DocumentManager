# Phase 1: User-Department Mapping

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Context

User model has `department` field as String (legacy), while Department model uses `id` (UUID) and `code` (unique string). Need to map User.department to Department.id for authorization checks.

## Overview

Create utility service/helper to resolve user's department ID from User.department string field. Handle mapping by Department.code or Department.name with fallback logic.

## Requirements

1. **Mapping Strategy:**
   - Primary: Match User.department to Department.code (case-insensitive)
   - Fallback: Match User.department to Department.name (case-insensitive)
   - Return Department.id if found, null if not found

2. **Edge Cases:**
   - User.department is null/empty → return null
   - Multiple departments match → use first match (log warning)
   - No department matches → return null

3. **Caching:**
   - Cache department mappings to avoid repeated DB queries
   - Invalidate cache on department updates (optional, Phase 2)

## Architecture

### New Service: UserDepartmentResolver

```typescript
@Injectable()
export class UserDepartmentResolver {
  // Resolve user's department ID from department string
  async resolveDepartmentId(
    userDepartment: string | null
  ): Promise<string | null>;

  // Get user with resolved department ID
  async getUserWithDepartment(userId: string): Promise<UserWithDepartment>;
}
```

### Helper Types

```typescript
interface UserWithDepartment {
  userId: string;
  departmentId: string | null;
  roles: string[];
  isAdmin: boolean;
  isBoss: boolean;
}
```

## Implementation Steps

1. **Create UserDepartmentResolver Service**
   - Location: `apps/api/src/modules/kpi/services/user-department.resolver.ts`
   - Method: `resolveDepartmentId(department: string | null): Promise<string | null>`
   - Query: Find department by code or name (case-insensitive)

2. **Add Helper Methods**
   - `getUserWithDepartment(userId: string)`: Load user + roles + department
   - `hasFullAccess(roles: string[]): boolean`: Check if admin/boss

3. **Add Error Handling**
   - Log warnings for ambiguous matches
   - Return null for missing departments (not an error)

4. **Add Unit Tests**
   - Test code matching
   - Test name matching
   - Test null/empty cases
   - Test multiple matches

## Todo List

- [ ] Create `user-department.resolver.ts` service
- [ ] Implement `resolveDepartmentId()` method
- [ ] Implement `getUserWithDepartment()` method
- [ ] Add helper `hasFullAccess()` method
- [ ] Add error handling and logging
- [ ] Write unit tests
- [ ] Update KPI module to import resolver

## Success Criteria

- [ ] Resolver correctly maps department string to Department.id
- [ ] Handles all edge cases gracefully
- [ ] Unit tests cover all scenarios
- [ ] No performance issues (consider caching if needed)

## Risk Assessment

- **Low Risk:** Simple mapping logic, well-defined requirements
- **Potential Issue:** Ambiguous department names (mitigated by code-first matching)
- **Performance:** Consider caching if department lookups become bottleneck

---

**Next:** See phase-02-backend-authorization.md
