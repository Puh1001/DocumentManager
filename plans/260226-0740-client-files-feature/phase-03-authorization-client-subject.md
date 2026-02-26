# Phase 03: Authorization – Client Subject & Permissions

## Context
- Parent: [plan.md](plan.md)
- Depends on: Phase 01 (Module "Client")
- Docs: [code-standards.md](../../docs/code-standards.md), [research/researcher-02-permissions-and-ui.md](research/researcher-02-permissions-and-ui.md)

## Overview
- **Date:** 2026-02-26  
- **Priority:** High  
- **Status:** Done  
- **Description:** Add "Client" as CASL subject and Module; assign view/create/delete to admin and DCC; boss gets view (and download/print if desired).

## Key Insights
- CASL ability factory already handles admin (manage all) and boss (view/download/print all). Boss will automatically have view on Client once Client is a valid subject.
- Module permissions: load from DB (RolePermission + Permission + Module). Need Permission records for view, create, delete on Module "Client", and assign to admin and dcc roles.
- Frontend: add "Client" to Subjects and subject-validation so useCanAccess('view','Client') works.

## Requirements
- Functional: Backend – ability.can('view'|'create'|'delete', 'Client') for admin, dcc; boss can view (and download/print via existing boss rule).
- Functional: Client API routes protected with CheckPolicies({ action, subject: 'Client' }).
- Functional: Frontend – Client in Subjects and isValidSubject('Client').

## Architecture
- Backend: ability.types.ts add Client interface and "Client" to Subjects. CaslAbilityFactory: module permissions already apply by module name; ensure Module "Client" is loaded and role-permission entries exist for view, create, delete.
- Seed: Create permissions (view, create, delete) linked to Module "Client" if not generic; assign to admin and dcc roles (and optionally boss for view – or rely on boss "view all").
- Frontend: ability.types (or shared) add Client and "Client"; subject-validation add "Client".

## Related Code
- Modify: `apps/api/src/modules/authorization/types/ability.types.ts` – add Client, "Client" to Subjects
- Modify: `apps/api/src/modules/authorization/constants/permissions.constants.ts` – add CLIENT if needed
- Modify: `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` – no change if module perms loaded by name; verify "Client" is applied from DB
- Modify: `apps/web/src/lib/types/ability.types.ts` (or equivalent) – add Client to Subjects
- Modify: `apps/web/src/lib/utils/subject-validation.ts` – add "Client"
- Seed: Assign role permissions for Client module (view, create, delete) to admin and dcc

## Implementation Steps
1. Backend ability.types: add `export interface Client { id: string }` and `| Client | "Client"` to Subjects.
2. Seed: Ensure Module "Client" exists (Phase 01). Create or reuse Permission records for view, create, delete. Assign to admin role and dcc role for Client module (page-level permissions are per module; use RolePermission + Module).
3. Verify CaslAbilityFactory applies module permissions for "Client" (existing loadModuleAndKpiPermissions / modulePerms loop uses module name from DB).
4. ClientController: add @UseGuards(JwtAuthGuard, PoliciesGuard), @CheckPolicies({ action: 'view', subject: 'Client' }) on list, @CheckPolicies({ action: 'create', subject: 'Client' }) on upload, @CheckPolicies({ action: 'delete', subject: 'Client' }) on delete.
5. Frontend: add Client to Subjects type and "Client" to VALID_SUBJECT_NAMES in subject-validation.ts.

## Todo
- [x] Backend: Client subject in ability.types
- [x] Seed: Client module permissions for admin and dcc
- [x] ClientController: CheckPolicies for view/create/delete
- [x] Frontend: Client in Subjects and subject-validation

## Success Criteria
- Admin and DCC can call list, upload, delete; Boss can call list (and download if implemented); others get 403.
- Frontend useCanAccess('view','Client') true for admin, dcc, boss.

## Risk Assessment
- Low. Additive; existing module permission flow reused.

## Security Considerations
- No escalation; only assigned roles get create/delete.

## Next Steps
- Phase 04 (Client page) and 05 (sidebar) use permission; Phase 06 (Boss tab) uses boss view.
