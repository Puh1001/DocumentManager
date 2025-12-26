# Phase 2: Backend - Admin Enforcement

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 1 (Role/Permission CRUD)
- **Related Docs:** `docs/system-architecture.md`, `docs/code-standards.md`

## Overview

Add admin-only guards to Users module endpoints. Currently only `JwtAuthGuard` is applied; need `PoliciesGuard` with `CheckPolicies` for sensitive operations.

## Key Insights

- UsersController has no admin enforcement
- Role assignment endpoints unprotected
- Use existing `CheckPolicies` pattern from authorization module
- Admin role grants `manage: all` via CaslAbilityFactory

## Requirements

- [x] Add admin guards to user create/update/delete
- [x] Add admin guards to role assignment endpoints
- [x] Keep read endpoints accessible (or restrict based on requirements)
- [x] Ensure consistent error messages for unauthorized access

## Architecture

### Protected Endpoints

**UsersController** (`/users`):

- `POST /users` - Create user (admin-only) ✅
- `GET /users` - List users (admin-only or self-view)
- `GET /users/:id` - Get user (admin-only or self-view)
- `PATCH /users/:id` - Update user (admin-only)
- `DELETE /users/:id` - Deactivate user (admin-only)
- `POST /users/:id/roles/:roleId` - Assign role (admin-only) ✅
- `DELETE /users/:id/roles/:roleId` - Remove role (admin-only) ✅

### Guard Pattern

```typescript
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies({ action: "manage", subject: "all" })
```

## Related Code Files

- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/authorization/guards/policies.guard.ts`
- `apps/api/src/modules/authorization/decorators/check-policies.decorator.ts`

## Implementation Steps

1. Import `PoliciesGuard` and `CheckPolicies` in UsersController
2. Add `@UseGuards(PoliciesGuard)` to controller class
3. Add `@CheckPolicies({ action: "manage", subject: "all" })` to sensitive endpoints
4. Decide on read endpoints: admin-only or allow self-view
5. Update error handling for ForbiddenException
6. Test with admin and non-admin users
7. Update API documentation

## Todo List

- [x] Add PoliciesGuard to UsersController
- [x] Add CheckPolicies to create endpoint
- [x] Add CheckPolicies to update endpoint
- [x] Add CheckPolicies to delete endpoint
- [x] Add CheckPolicies to role assignment endpoints
- [x] Configure read endpoint access (admin-only)
- [x] Test authorization
- [x] Update Swagger docs

## Success Criteria

- [x] All sensitive endpoints require admin role
- [x] Non-admin users get 403 Forbidden
- [x] Admin users can access all endpoints
- [x] Error messages are clear

## Risk Assessment

| Risk                      | Probability | Impact | Mitigation                   |
| ------------------------- | ----------- | ------ | ---------------------------- |
| Breaking existing clients | Medium      | High   | Test thoroughly, document    |
| Over-restricting access   | Low         | Medium | Allow self-view for read ops |

## Security Considerations

- Admin role must be properly assigned
- Test edge cases (no roles, invalid roles)
- Ensure audit logs capture authorization failures
- Consider rate limiting on sensitive endpoints

## Next Steps

After completion, proceed to Phase 3: Page Permission System.
