# KPI Department-Based Access Control

**Date:** 2026-01-06  
**Status:** ✅ Completed  
**Priority:** High

---

## Overview

Implement department-based access control for KPI management. Users with roles other than admin and boss can only view, create, edit, and delete KPIs belonging to their own department.

## Requirements

1. **Access Control Rules:**
   - Admin: Full access to all KPIs (no restrictions)
   - Boss: Full access to all KPIs (no restrictions)
   - Other roles: Only access KPIs of their own department

2. **Operations to Restrict:**
   - List KPI records (filter by user's department)
   - View KPI record (check department match)
   - Create KPI record (restrict to user's department)
   - Update KPI record (check department match)
   - Delete KPI record (check department match)
   - Create/Update/Delete KPI metrics (check parent record's department)

3. **Department Mapping:**
   - User.department (String) must be mapped to Department model
   - Map by Department.code or Department.name
   - Handle cases where user has no department or department doesn't exist

## Architecture Decision

**Approach:** Service-level authorization with department filtering

- Add authorization logic in KPI services
- Filter queries based on user's department
- Validate department ownership before mutations
- Return 403 Forbidden for unauthorized access

**Rationale:**

- Keeps authorization logic centralized in services
- Easy to test and maintain
- Consistent with existing patterns
- No need for complex CASL rules for this use case

## Implementation Phases

| Phase | Name                    | Status       | Files                                                                        |
| ----- | ----------------------- | ------------ | ---------------------------------------------------------------------------- |
| 1     | User-Department Mapping | ✅ Completed | [phase-01-user-department-mapping.md](./phase-01-user-department-mapping.md) |
| 2     | Backend Authorization   | ✅ Completed | [phase-02-backend-authorization.md](./phase-02-backend-authorization.md)     |
| 3     | Frontend Filtering      | ✅ Completed | [phase-03-frontend-filtering.md](./phase-03-frontend-filtering.md)           |
| 4     | Testing & Validation    | ✅ Completed | [phase-04-testing-validation.md](./phase-04-testing-validation.md)           |

## Key Components

1. **User Department Resolver:**
   - Map User.department (string) to Department.id
   - Handle edge cases (null, not found, multiple matches)

2. **KPI Service Authorization:**
   - Add department filtering to findAll()
   - Add department validation to create/update/delete
   - Add helper methods for role checking

3. **Controller Updates:**
   - Extract user from request
   - Pass user info to services
   - Handle authorization errors

4. **Frontend Updates:**
   - Filter department dropdown based on user role
   - Hide unauthorized actions
   - Show appropriate error messages

## Success Criteria

- [ ] Admin can access all KPIs
- [ ] Boss can access all KPIs
- [ ] Regular users can only access their department's KPIs
- [ ] Unauthorized access returns 403 Forbidden
- [ ] Frontend properly filters and restricts UI
- [ ] All tests pass
- [ ] Edge cases handled (no department, invalid department)

---

**Next:** See phase-01-user-department-mapping.md
