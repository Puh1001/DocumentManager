# Phase 2 Improvements: Code Review Suggestions

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** Medium

---

## Context

Implementing suggestions from Phase 2 code review to optimize performance, reduce duplication, improve security, and enhance testing.

## Overview

Implement 5 suggestions:
1. UserDepartmentGuard for performance optimization
2. CurrentUserWithDepartment decorator to reduce duplication
3. Audit logging for authorization failures
4. More specific error codes
5. Integration tests for authorization scenarios

## Implementation Steps

### 1. Create UserDepartmentGuard
- Create guard that resolves user department once per request
- Attach to request object
- Update AuthenticatedRequest type

### 2. Create CurrentUserWithDepartment Decorator
- Custom parameter decorator
- Extract user from request.userWithDepartment

### 3. Update Error Codes
- Add ACCESS_DENIED_NO_DEPARTMENT
- Add ACCESS_DENIED_DIFFERENT_DEPARTMENT
- Update services to use specific codes

### 4. Add Audit Logging
- Inject Logger in services
- Log authorization failures in checkDepartmentAccess and checkParentRecordAccess

### 5. Update Controllers
- Use UserDepartmentGuard
- Use CurrentUserWithDepartment decorator
- Remove manual user resolution

### 6. Add Integration Tests
- Test cross-department access (403)
- Test department filtering in findAll
- Test unauthorized create/update/delete

### 7. Update Unit Tests
- Update mocks for new guard/decorator
- Test new error codes

---

## Success Criteria

- [ ] UserDepartmentGuard reduces DB queries
- [ ] Controllers use decorator (no duplication)
- [ ] Specific error codes used
- [ ] Authorization failures logged
- [ ] Integration tests cover authorization scenarios
- [ ] All tests pass

