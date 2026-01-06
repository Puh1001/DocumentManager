# Phase 4: Testing & Validation

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Context

Comprehensive testing required to ensure authorization works correctly for all user roles and edge cases.

## Overview

Test all authorization scenarios, edge cases, and integration points. Validate both backend API and frontend UI behavior.

## Requirements

1. **Unit Tests:**
   - UserDepartmentResolver: All mapping scenarios
   - KpiRecordService: Authorization logic
   - KpiMetricService: Authorization logic

2. **Integration Tests:**
   - Admin can access all KPIs
   - Boss can access all KPIs
   - Regular user can only access their department
   - Unauthorized access returns 403
   - All CRUD operations respect authorization

3. **E2E Tests:**
   - Frontend filtering works correctly
   - Error messages display properly
   - UI prevents unauthorized actions

4. **Edge Cases:**
   - User with no department
   - User with invalid department string
   - Department deleted but user still references it
   - Multiple departments with same name/code

## Test Scenarios

### Backend API Tests

**Admin User:**

- [ ] Can list all KPI records (no filtering)
- [ ] Can view any KPI record
- [ ] Can create KPI for any department
- [ ] Can update any KPI record
- [ ] Can delete any KPI record
- [ ] Can manage metrics for any KPI

**Boss User:**

- [ ] Can list all KPI records (no filtering)
- [ ] Can view any KPI record
- [ ] Can create KPI for any department
- [ ] Can update any KPI record
- [ ] Can delete any KPI record
- [ ] Can manage metrics for any KPI

**Regular User (with department):**

- [ ] Can only list KPIs of their department
- [ ] Can view KPI of their department
- [ ] Cannot view KPI of other department (403)
- [ ] Can create KPI for their department
- [ ] Cannot create KPI for other department (403)
- [ ] Can update KPI of their department
- [ ] Cannot update KPI of other department (403)
- [ ] Can delete KPI of their department
- [ ] Cannot delete KPI of other department (403)
- [ ] Can manage metrics for their department's KPIs
- [ ] Cannot manage metrics for other department's KPIs (403)

**User with No Department:**

- [ ] Cannot list any KPIs (empty result or 403)
- [ ] Cannot create KPIs (403)
- [ ] Cannot access any KPI records (403)

### Frontend Tests

**Admin User:**

- [ ] Sees all departments in dropdown
- [ ] Can select any department
- [ ] Can create/edit/delete any KPI

**Boss User:**

- [ ] Sees all departments in dropdown
- [ ] Can select any department
- [ ] Can create/edit/delete any KPI

**Regular User:**

- [ ] Sees only their department (or dropdown hidden)
- [ ] Cannot select other departments
- [ ] Can only create/edit/delete their department's KPIs
- [ ] Sees appropriate error on unauthorized actions

## Implementation Steps

1. **Update Unit Tests**
   - Add tests for UserDepartmentResolver
   - Add authorization tests to KpiRecordService tests
   - Add authorization tests to KpiMetricService tests

2. **Update Integration Tests**
   - Create test users with different roles
   - Create test departments and KPIs
   - Test all CRUD operations for each role
   - Test edge cases

3. **Manual Testing**
   - Test with real users in development
   - Verify all scenarios work as expected
   - Check error messages and UI states

4. **Performance Testing**
   - Ensure department resolution doesn't cause N+1 queries
   - Check query performance with filters

## Todo List

- [x] Write unit tests for UserDepartmentResolver (already comprehensive)
- [x] Update KpiRecordService unit tests (already has authorization tests)
- [x] Update KpiMetricService unit tests (already has authorization tests)
- [x] Write integration tests for all roles
- [x] Test edge cases
- [ ] Manual testing with different users (recommended for production)
- [ ] Performance validation (recommended for production)
- [x] Update test documentation

## Success Criteria

- [x] All unit tests pass
- [x] All integration tests pass (43 tests passing)
- [x] All edge cases handled
- [ ] Performance acceptable (needs production validation)
- [ ] Manual testing confirms correct behavior (recommended)
- [x] Documentation updated

## Risk Assessment

- **Low Risk:** Well-defined test scenarios
- **Potential Issue:** Test data setup complexity
- **Coverage:** Ensure comprehensive coverage of all scenarios

---

**End of Plan**
