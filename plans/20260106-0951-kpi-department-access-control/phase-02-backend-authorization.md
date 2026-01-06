# Phase 2: Backend Authorization

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Context

KPI endpoints currently only have JWT authentication. Need to add department-based authorization to all KPI operations (records and metrics).

## Overview

Add authorization logic to KPI services and controllers. Filter queries and validate department ownership for all CRUD operations.

## Requirements

1. **Authorization Rules:**
   - Admin/Boss: No restrictions (bypass all checks)
   - Other users: Only access KPIs of their department

2. **Operations to Secure:**
   - `GET /kpi/records` - Filter by user's department
   - `GET /kpi/records/:id` - Check department match
   - `POST /kpi/records` - Validate departmentId matches user's department
   - `PATCH /kpi/records/:id` - Check existing record's department, validate new departmentId
   - `DELETE /kpi/records/:id` - Check department match
   - `POST /kpi/metrics` - Check parent record's department
   - `PATCH /kpi/metrics/:id` - Check parent record's department
   - `DELETE /kpi/metrics/:id` - Check parent record's department

3. **Error Handling:**
   - Return 403 Forbidden for unauthorized access
   - Return 404 Not Found if record doesn't exist (don't leak existence)

## Architecture

### Service Layer Updates

**KpiRecordService:**

- Add `findAll(user: UserWithDepartment, params)`: Filter by department
- Add `findOne(id, user)`: Check department match
- Add `create(dto, user)`: Validate departmentId
- Add `update(id, dto, user)`: Check existing + validate new
- Add `remove(id, user)`: Check department match

**KpiMetricService:**

- Add `create(dto, user)`: Check parent record's department
- Add `update(id, dto, user)`: Check parent record's department
- Add `remove(id, user)`: Check parent record's department

### Controller Layer Updates

**KpiRecordController:**

- Extract user from `req.user`
- Resolve user's department using UserDepartmentResolver
- Pass user info to service methods

**KpiMetricController:**

- Extract user from `req.user`
- Resolve user's department
- Pass user info to service methods

## Implementation Steps

1. **Update KpiRecordService**
   - Inject UserDepartmentResolver
   - Update `findAll()` to filter by departmentId if not admin/boss
   - Update `findOne()` to check department match
   - Update `create()` to validate departmentId matches user's department
   - Update `update()` to check existing record + validate new departmentId
   - Update `remove()` to check department match
   - Add helper `checkDepartmentAccess(record, user)`

2. **Update KpiMetricService**
   - Inject UserDepartmentResolver and KpiRecordService
   - Update `create()` to load parent record and check department
   - Update `update()` to load parent record and check department
   - Update `remove()` to load parent record and check department

3. **Update Controllers**
   - Extract user from `req.user` (JWT payload)
   - Resolve user's department using UserDepartmentResolver
   - Pass user info to service methods
   - Handle 403 errors appropriately

4. **Add Error Codes**
   - `KPI_ACCESS_DENIED`: User cannot access this KPI
   - `KPI_DEPARTMENT_MISMATCH`: Department doesn't match user's department

5. **Update Tests**
   - Test admin/boss full access
   - Test regular user department filtering
   - Test unauthorized access returns 403
   - Test edge cases (no department, invalid department)

## Todo List

- [ ] Update KpiRecordService with authorization logic
- [ ] Update KpiMetricService with authorization logic
- [ ] Update KpiRecordController to extract user and pass to service
- [ ] Update KpiMetricController to extract user and pass to service
- [ ] Add error codes for authorization failures
- [ ] Update integration tests
- [ ] Test all scenarios manually

## Success Criteria

- [ ] Admin can access all KPIs
- [ ] Boss can access all KPIs
- [ ] Regular users only see their department's KPIs
- [ ] Unauthorized operations return 403
- [ ] All existing tests pass
- [ ] New authorization tests pass

## Risk Assessment

- **Medium Risk:** Need to ensure backward compatibility
- **Potential Issue:** Breaking existing API contracts (mitigated by admin/boss bypass)
- **Testing:** Comprehensive test coverage required

---

**Next:** See phase-03-frontend-filtering.md
