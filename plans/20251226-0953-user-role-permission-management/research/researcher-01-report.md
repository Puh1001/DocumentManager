# Researcher 01 - Current System State & Admin Enforcement

**Focus**: Current user/role/permission management implementation, admin role detection, authorization patterns

## Current Implementation

### Backend (NestJS)

**Users Module** (`apps/api/src/modules/users/`):

- `UsersController`: CRUD endpoints exist but **no admin-only enforcement**
  - `POST /users` - Create (doc says "admin only" but only `JwtAuthGuard`)
  - `GET /users` - List with pagination/filters
  - `GET /users/:id` - Get one
  - `PATCH /users/:id` - Update
  - `DELETE /users/:id` - Deactivate
  - `POST/DELETE /users/:id/roles/:roleId` - Role assignment
- `UsersService`: Full CRUD + role assignment logic implemented
- **Missing**: Admin-only guards on sensitive operations

**Authorization Module** (`apps/api/src/modules/authorization/`):

- `PermissionController`: Protected by `CheckPolicies({ action: "manage", subject: "all" })`
- `PermissionService`: Role/folder/document permission management
- `CaslAbilityFactory`: Admin role check via `userRoles.includes("admin")` → grants `manage: all`
- `PoliciesGuard`: Enforces CASL policies via `CheckPolicies` decorator

**Database Schema**:

- `User` ↔ `Role`: Many-to-many via `UserRole`
- `Role` ↔ `Permission`: Many-to-many via `RolePermission`
- Permissions: `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`
- **No dedicated Role CRUD endpoints** (only permission assignment)

### Frontend (Next.js)

**Existing Pages**:

- `/dashboard/users` - Placeholder only (no implementation)
- `/dashboard/permissions` - Basic display, no CRUD UI
- Uses ShadcnUI components (Card, Button, Dialog, etc.)

**Authorization**:

- `useAbility()` hook loads CASL abilities from `/auth/abilities`
- Admin check: `user?.roles?.includes("admin")` (e.g., in departments page)

## Admin Role Detection

**Backend**:

- `CaslAbilityFactory.createForUser()` checks `userRoles.includes("admin")`
- Admin gets `can("manage", "all")` automatically
- No dedicated `@RequireAdmin()` decorator (use `@CheckPolicies({ action: "manage", subject: "all" })`)

**Frontend**:

- User object from auth context includes `roles: string[]`
- Manual checks: `user?.roles?.includes("admin")`

## Missing Features

1. **Role CRUD**: No endpoints to create/update/delete roles
2. **Permission CRUD**: No endpoints to create/update/delete permissions (only list)
3. **User Management UI**: Placeholder page only
4. **Role Management UI**: Not implemented
5. **Permission Management UI**: Basic display only
6. **Admin Enforcement**: Users endpoints not protected

## Recommendations

- Use `@CheckPolicies({ action: "manage", subject: "all" })` for admin-only endpoints
- Create Role CRUD endpoints (admin-only)
- Create Permission CRUD endpoints (admin-only)
- Add admin guards to UsersController sensitive operations
- Build full UI for users/roles/permissions management
