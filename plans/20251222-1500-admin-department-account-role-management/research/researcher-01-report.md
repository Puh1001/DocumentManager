# Researcher 01 - Users & Roles Overview

- **Focus**: current user management, roles, and how admin is modeled
- **Scope**: `apps/api/src/modules/users/*`, `apps/api/src/modules/authorization/*`, core docs (`codebase-summary`, `system-architecture`, `project-overview-pdr`)

## Findings

- **Users module**
  - `UsersController` exposes:
    - `POST /users` create user (doc says “admin only” but only `JwtAuthGuard` is applied, no explicit role guard yet).
    - `GET /users` list users with pagination and filters.
    - `GET /users/:id` fetch single user.
    - `PATCH /users/:id` update user.
    - `DELETE /users/:id` deactivate user.
    - `POST/DELETE /users/:id/roles/:roleId` assign/remove roles.
  - `UsersService`:
    - Uses `PrismaService` with `User`, `UserRole` relations.
    - `create` validates unique username/email, hashes password with Argon2, stores `department` as string, returns safe fields.
    - `findAll` supports filters: `search`, `department`, `isActive`, returns roles as flattened list.
    - `findById` returns user plus roles; throws `NotFoundException` if missing.
    - `update` allows changing `email`, `fullName`, `department`, `isActive`, `password`.
    - `assignRole` / `removeRole` manipulate join table `userRole`.
- **Authorization module**
  - `AuthorizationModule` wires `CaslAbilityFactory`, `PoliciesGuard`, and `PermissionService`.
  - `PermissionController`:
    - `GET /permissions` list all `Permission` records (requires `manage: all`).
    - `GET/POST /permissions/roles/:id` read/update permissions for a `Role`.
    - `GET/POST /permissions/folders/:id` manage folder-level permissions.
    - `GET/POST /permissions/documents/:id` manage document-level permissions.
    - Protected by `JwtAuthGuard` + `PoliciesGuard` with `CheckPolicies` decorator.
  - `PermissionService`:
    - Works with `Role`, `Permission`, `RolePermission`, `FolderPermission`, `DocumentPermission`.
    - Supports assigning a new permission set to a role (delete existing, bulk create).
    - ABAC-style checks via `SubjectType` (USER/ROLE) for folder/document permissions.
- **Docs alignment**
  - System architecture + PDR already describe RBAC roles: `admin`, `manager`, `editor`, `viewer`.
  - Database schema section confirms `User`, `Role`, `Permission`, `UserRole`, `RolePermission` etc are present.

## Implications for new features

- **Admin user management**
  - Backend already has full user CRUD + role assignment.
  - Need to **enforce admin-only** on critical endpoints (`create`, `update` certain fields, deactivate, role assignment) via:
    - CASL policies (`manage` on `User` or `all`)
    - Or a simple role guard (e.g. `RequirePermission` / `RequireRole('admin')`) consistent with existing patterns.
- **Department-level account management**
  - `User.department` is a plain field used for filtering; no strict referential integrity.
  - Department managers can be modeled as:
    - A dedicated `Role` (e.g. `department_manager`) plus ABAC rule: they can only manage users where `user.department === currentUser.department`.
  - Need additional service-level checks when non-admin updates a user:
    - Block cross-department operations.
    - Restrict which fields a department manager can modify (e.g. cannot change department or assign high-privilege roles).
- **Role flow**
  - Part of the requested flow (add users to roles, add permissions to roles) is already present:
    - `UsersService.assignRole/removeRole` for user-role membership.
    - `PermissionService.assignPermissionsToRole` for role-permission mapping.
  - Missing pieces are:
    - Role CRUD endpoints (if not already elsewhere).
    - A clear admin-only workflow and UI around role management.

## Gaps / Open Questions

- No explicit **department entity**; department is string on `User` + SMB folder naming convention.
- Not fully clear how initial `admin` is seeded and whether more admins are allowed.
- Behavior for **self-service** vs **admin/department-head actions** on own account is not defined.
- Need agreement on:
  - Whether to introduce a `Department` table now (with code + migration).
  - Concrete role names for department heads (e.g. `dept_head_<code>` vs global `department_manager`).
  - Which fields department heads can CRUD vs read-only.
