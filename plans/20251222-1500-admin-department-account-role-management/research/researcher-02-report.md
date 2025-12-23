# Researcher 02 - Permissions & Department Model

- **Focus**: permission system (RBAC + ABAC) and department representation for admin vs department-head flows
- **Scope**: `apps/api/src/modules/authorization/*`, architecture docs, PDR

## Findings

- **Permissions & authorization**
  - `AuthorizationModule` exports `CaslAbilityFactory`, `PoliciesGuard`, `PermissionService`.
  - `PoliciesGuard` + `CheckPolicies` decorator implement CASL-based checks (`action`, `subject`), used on `PermissionController`.
  - `PermissionController`:
    - `GET /permissions` → list all permissions (`manage: all` required).
    - `GET /permissions/roles/:id` → get role permissions.
    - `POST /permissions/roles/:id` → replace role permissions.
    - `GET/POST /permissions/folders/:id` → get/set folder permissions (subject USER/ROLE).
    - `GET/POST /permissions/documents/:id` → get/set document permissions (subject USER/ROLE).
  - `PermissionService`:
    - Validates existence of `Role`, `Permission`, `Folder`, `Document`, `User`.
    - Uses `SubjectType` (`USER` or `ROLE`) to determine whether a permission entry references a user or role.
    - For folder/document, deletes existing permission rows then recreates from request payload.
- **RBAC model (from docs)**
  - Roles: `admin`, `manager`, `editor`, `viewer`.
  - Actions: `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`.
  - DB relationships: `User` ↔ `Role` via `UserRole`; `Role` ↔ `Permission` via `RolePermission`.
  - Folder/document permissions: `FolderPermission`, `DocumentPermission` with inheritance and overrides.
- **Department model**
  - `System Architecture` and `PDR` indicate department exists at two levels:
    - As a field on `User` (simple string, used for filtering and statistics).
    - As part of SMB folder structure under shared root (e.g. `\\share\{department}\Tài liệu ISO\...`).
  - No dedicated `Department` table or Nest module mentioned.
  - No existing endpoints for department CRUD.

## Implications for requested flow

- **Flow: create user groups (roles), add users to groups, add permissions to groups**
  - Role-permission management is already partially implemented:
    - `PermissionService.assignPermissionsToRole` handles permissions for a role.
  - User-role membership is in `UsersService.assignRole/removeRole`.
  - Missing elements for the desired admin UX:
    - Clear admin-only endpoints (or separate `roles` controller) for role listing/creation/update/deletion.
    - A cohesive “Role management” API surface + frontend pages where admin:
      - Creates role (group).
      - Adds/removes users to/from role.
      - Assigns/removes permissions for role.
- **Admin vs department-head account management**
  - Admin should:
    - CRUD all departments (once modeled).
    - Manage all accounts (across departments).
    - Manage all roles and permissions.
  - Department head should:
    - Manage users only within their department (`user.department === currentUser.department` enforced by ABAC).
    - Probably limited operations (e.g. activate/deactivate, reset password, update profile fields, assign low-privilege roles).
  - Enforcing this cleanly suggests:
    - A dedicated department-head role (e.g. `department_manager`) with CASL rules including department constraint.
    - Service-level checks in `UsersService` for non-admin callers.
- **Department CRUD**
  - To support proper department CRUD, a **Department entity** is desirable:
    - `Department { id, code, name, description, isActive, createdAt, updatedAt }`.
    - `User.departmentId` or `User.departmentCode` as FK/unique key instead of free text.
  - Need to align DB department with SMB folder naming convention to avoid drift.

## Gaps / Open Questions

- Whether to introduce `Department` table now (schema change + migration) vs keep simple string for this phase.
- Exact responsibilities and limits for department heads:
  - Can they create/delete users or only update/lock/unlock?
  - Can they assign any role or only a subset (e.g. not `admin`)?
- How strict the mapping between department DB entry and SMB folder structure must be (1–1 enforced vs loose).
- UI expectations: separate admin screens for department CRUD, user management, and role/permission flows, or a combined “Access Management” area.
