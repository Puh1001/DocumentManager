# Phase 1: Backend - Role & Permission CRUD

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 1-2 days

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** None (builds on existing authorization module)
- **Related Docs:** `docs/system-architecture.md`, `docs/code-standards.md`

## Overview

Add CRUD endpoints for Role and Permission management. Currently only permission assignment exists; need full create/update/delete operations.

## Key Insights

- Role model exists but no CRUD endpoints
- Permission model exists but only list endpoint (`GET /permissions`)
- Need admin-only guards on all operations
- Use existing `CheckPolicies` decorator pattern

## Requirements

- [x] Create Role CRUD endpoints (admin-only)
- [x] Create Permission CRUD endpoints (admin-only)
- [x] Validate role/permission names are unique
- [x] Prevent deletion of roles/permissions in use
- [x] Audit log all changes

## Architecture

### New Endpoints

**Roles** (`/roles`):

- `GET /roles` - List all roles (admin-only)
- `GET /roles/:id` - Get role with permissions
- `POST /roles` - Create role (admin-only)
- `PATCH /roles/:id` - Update role (admin-only)
- `DELETE /roles/:id` - Delete role if not in use (admin-only)

**Permissions** (`/permissions`):

- `GET /permissions` - List all (exists, keep)
- `GET /permissions/:id` - Get permission details
- `POST /permissions` - Create permission (admin-only)
- `PATCH /permissions/:id` - Update permission (admin-only)
- `DELETE /permissions/:id` - Delete if not in use (admin-only)

### Service Layer

**RoleService**:

- `create(dto)` - Validate unique name
- `findAll()` - List with permission counts
- `findById(id)` - Get with permissions
- `update(id, dto)` - Update name/description
- `delete(id)` - Check if in use, soft delete or hard delete

**PermissionService** (extend existing):

- `create(dto)` - Validate unique name
- `findById(id)` - Get details
- `update(id, dto)` - Update name/description
- `delete(id)` - Check usage, prevent if in use

## Related Code Files

- `apps/api/src/modules/authorization/controllers/permission.controller.ts`
- `apps/api/src/modules/authorization/services/permission.service.ts`
- `apps/api/src/modules/authorization/authorization.module.ts`
- `apps/api/prisma/schema.prisma` (Role, Permission models)

## Implementation Steps

1. Create `RoleController` with CRUD endpoints
2. Create `RoleService` with business logic
3. Add DTOs: `CreateRoleDto`, `UpdateRoleDto`, `QueryRolesDto`
4. Extend `PermissionController` with create/update/delete
5. Extend `PermissionService` with CRUD methods
6. Add DTOs: `CreatePermissionDto`, `UpdatePermissionDto`
7. Add admin guards: `@CheckPolicies({ action: "manage", subject: "all" })`
8. Add validation: unique names, prevent deletion if in use
9. Add audit logging for all changes
10. Update `AuthorizationModule` to export new services

## Todo List

- [x] Create RoleController
- [x] Create RoleService
- [x] Create Role DTOs
- [x] Extend PermissionController
- [x] Extend PermissionService
- [x] Create Permission DTOs
- [x] Add admin guards
- [x] Add validation logic
- [x] Add audit logging
- [x] Write unit tests
- [x] Update API documentation

## Success Criteria

- [x] All CRUD endpoints functional
- [x] Admin-only access enforced
- [x] Validation prevents invalid operations
- [x] Audit logs created for changes
- [x] Tests pass (51 tests passing)

## Risk Assessment

| Risk                      | Probability | Impact | Mitigation                     |
| ------------------------- | ----------- | ------ | ------------------------------ |
| Breaking existing APIs    | Low         | High   | Extend, don't replace          |
| Permission name conflicts | Medium      | Medium | Unique constraint + validation |
| Orphaned role/permission  | Low         | Low    | Check usage before delete      |

## Security Considerations

- All endpoints require admin role (`manage: all`)
- Validate input to prevent injection
- Audit all changes for compliance
- Prevent deletion of system roles (admin, boss, etc.)

## Next Steps

After completion, proceed to Phase 2: Admin Enforcement for Users module.
