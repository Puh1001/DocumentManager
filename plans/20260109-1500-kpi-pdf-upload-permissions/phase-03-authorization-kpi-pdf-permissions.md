# Phase 03 - Authorization & Permission Management for KPI PDFs

## Context Links

- Parent plan: `./plan.md`
- Dependencies: Phase 01 (Backend API), Phase 02 (Frontend UI)
- Research:
  - `./research/researcher-01-backend-kpi-pdf.md`
  - `./research/researcher-02-frontend-boss-kpi-ui.md`
- Docs:
  - `../../docs/codebase-summary.md`
  - `../../docs/system-architecture.md`
  - `../../docs/code-standards.md`
- Related files:
  - `apps/api/src/modules/authorization/constants/permissions.constants.ts`
  - `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`
  - `apps/api/src/modules/authorization/controllers/permission.controller.ts`
  - `apps/web/src/lib/types/ability.types.ts`

## Overview

- **Date:** 2026-01-09
- **Priority:** High
- **Implementation Status:** ✅ Completed
- **Review Status:** Not reviewed
- **Description:** Wire KPI attachment actions (view/download/print/copy/edit) into CASL authorization system, ensure no default permissions, and enable permission management UI for assigning these rights per role.

## Key Insights

- Existing CASL system supports actions: `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`.
- Need to add `copy` action if not exists, or map to existing action.
- Subject can be `Kpi` (reuse) or new `KpiAttachment` (more granular).
- No default permissions: all rights must be explicitly assigned via permission management UI.
- Permission management UI already exists for roles/folders/documents; extend to support KPI attachments.

## Requirements

### Functional

- Add `copy` action to permission system (if not exists).
- Ensure `Kpi` or `KpiAttachment` subject exists in permission constants.
- Update CASL ability factory to evaluate KPI attachment permissions.
- Ensure no default permissions granted (boss role, admin_dept, etc. must be explicitly configured).
- Extend permission management UI to allow assigning KPI attachment permissions per role.
- Support granular permissions: users can have multiple actions (view + download + print, etc.).

### Non-Functional

- Maintain backward compatibility with existing permission system.
- Permission checks must be performant (no N+1 queries).
- Audit logging for permission changes (who assigned what to which role).

## Architecture

- **Backend Permission Model:**
  - Subject: `Kpi` (preferred) or `KpiAttachment` (if more granular control needed).
  - Actions: `view`, `download`, `print`, `copy`, `edit` (upload/delete handled via `create`/`delete`).
  - Storage: Existing `Permission` table with `action` + `subject` columns.
  - Assignment: Via `RolePermission` junction table (many-to-many).

- **CASL Ability Factory:**
  - Extend `CaslAbilityFactory.createForUser()` to include KPI attachment abilities.
  - Load user's roles → fetch role permissions → build CASL rules for `Kpi` subject.
  - Support department-level filtering if needed (boss sees all departments).

- **Permission Management UI:**
  - Extend existing permission management page to include KPI attachment section.
  - Show matrix: Roles × Actions (view/download/print/copy/edit).
  - Allow toggling permissions per role via checkboxes.
  - Save changes via `POST /permissions/roles/:id` endpoint.

## Related Code Files

### To Modify

- `apps/api/src/modules/authorization/constants/permissions.constants.ts` - Add `copy` action and `Kpi`/`KpiAttachment` subject
- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts` - Extend to build KPI abilities
- `apps/api/src/modules/authorization/controllers/permission.controller.ts` - Ensure KPI permissions handled
- `apps/api/src/modules/kpi/kpi.controller.ts` - Ensure `@CheckPolicies` uses correct subject
- `apps/web/src/lib/types/ability.types.ts` - Add `copy` action and `Kpi` subject to Typescript types
- Permission management UI components (if exists in `apps/web/src/components/authorization/`)

### To Create

- `apps/api/src/modules/authorization/dto/set-kpi-permissions.dto.ts` (if needed for dedicated endpoint)
- Permission management UI component for KPI attachments (if not reusable from existing)

## Implementation Steps

1. **Add `copy` Action to Permission System**
   1. Check if `copy` action already exists in `permissions.constants.ts`.
   2. If not, add `COPY = 'copy'` to actions enum/constants.
   3. Add migration/seeder to insert `copy` action into `Permission` table (if not exists).
   4. Ensure `copy` action is available for all relevant subjects (Document, Kpi, etc.).

2. **Ensure KPI Subject Exists**
   1. Check if `Kpi` subject exists in `permissions.constants.ts`.
   2. If not, add `KPI = 'Kpi'` to subjects enum/constants.
   3. Add migration/seeder to ensure `Kpi` subject exists in `Module` table (if subject stored there).
   4. Alternatively, use existing `Kpi` subject if already defined.

3. **Update CASL Ability Factory**
   1. Open `casl-ability.factory.ts`.
   2. In `createForUser()` method, add logic to load KPI-related permissions:
      - Query `RolePermission` for user's roles where `Permission.subject === 'Kpi'`.
      - Build CASL rules: `can(action, 'Kpi')` for each granted action.
   3. Ensure department filtering if needed (boss sees all, others see own department).
   4. Test ability factory returns correct permissions for test users.

4. **Update Backend Controllers**
   1. Ensure all KPI attachment endpoints use `@CheckPolicies` decorator:
      - `POST /kpi/records/:id/attachments` → `@CheckPolicies({ action: 'create', subject: 'Kpi' })`
      - `GET /kpi/records/:id/attachments` → `@CheckPolicies({ action: 'view', subject: 'Kpi' })`
      - `GET /kpi/attachments/:id/stream` → `@CheckPolicies({ action: 'view', subject: 'Kpi' })`
      - `GET /kpi/attachments/:id/download` → `@CheckPolicies({ action: 'download', subject: 'Kpi' })`
   2. Add print endpoint if needed: `GET /kpi/attachments/:id/print` → `@CheckPolicies({ action: 'print', subject: 'Kpi' })`.
   3. Ensure copy permission checked at viewer level (frontend) but also logged (backend audit).

5. **Remove Default Permissions**
   1. Review existing role seeders/migrations.
   2. Ensure no default KPI permissions granted to boss, admin_dept, or other roles.
   3. If defaults exist, remove them or document that admins must configure manually.
   4. Update documentation to state: "KPI attachment permissions must be explicitly assigned."

6. **Extend Permission Management API** (if needed)
   1. Check if `POST /permissions/roles/:id` endpoint already supports KPI permissions.
   2. If not, extend DTO to accept KPI permission assignments.
   3. Ensure endpoint validates and saves `RolePermission` records for KPI actions.

7. **Update Frontend Permission Types**
   1. Add `copy` to `Actions` type in `apps/web/src/lib/types/ability.types.ts`.
   2. Ensure `Kpi` exists in `Subjects` type.
   3. Update `useCanAccess` hook to support `copy` action (should work automatically if types updated).

8. **Extend Permission Management UI** (if exists)
   1. Locate permission management page/component.
   2. Add KPI attachment section showing:
      - Table: Roles (rows) × Actions (columns: view/download/print/copy/edit).
      - Checkboxes for each cell.
   3. Load current permissions on mount.
   4. Save changes via API on submit.
   5. Show success/error toast notifications.

9. **Audit Logging for Permission Changes**
   1. Ensure permission assignment changes are logged to `AuditLog` table.
   2. Log: who assigned what permission to which role, timestamp.
   3. Include in existing audit logging flow.

10. **Documentation & Migration Guide**
    1. Document that KPI permissions are opt-in (no defaults).
    2. Provide migration guide for admins to assign permissions to roles.
    3. Update API documentation with new permission requirements.

## Todo List

- [x] Add `copy` action to permission constants and database.
- [x] Ensure `Kpi` subject exists in permission system.
- [x] Update CASL ability factory to include KPI permissions.
- [x] Update backend controllers with `@CheckPolicies` decorators.
- [x] Remove any default KPI permissions from seeders.
- [x] Extend permission management API to support KPI permissions.
- [x] Update frontend Typescript types (`Actions`, `Subjects`).
- [x] Extend permission management UI (if exists) for KPI attachments.
- [x] Add audit logging for permission changes.
- [x] Test permission checks end-to-end (backend + frontend).
- [x] Document permission assignment process.

## Success Criteria

- `copy` action exists in permission system and can be assigned to roles.
- `Kpi` subject exists and is recognized by CASL.
- CASL ability factory correctly evaluates KPI permissions for users.
- No default permissions granted (all must be explicitly assigned).
- Permission management UI allows assigning KPI permissions per role.
- Backend endpoints enforce permissions correctly (403 if no permission).
- Frontend `useCanAccess` hook works with `copy` action and `Kpi` subject.
- Audit logs record permission assignment changes.

## Risk Assessment

- **Risk:** Breaking existing permission checks if subject/action names conflict.
  - **Mitigation:** Use existing `Kpi` subject if available; test all existing permission checks still work.
- **Risk:** Performance degradation if permission checks add database queries.
  - **Mitigation:** Cache permissions in ability factory; use efficient queries (joins, not N+1).
- **Risk:** Admins forget to assign permissions, causing access denied errors.
  - **Mitigation:** Provide clear documentation and migration guide; consider admin UI warnings.

## Security Considerations

- Never grant default permissions; always require explicit assignment.
- Permission checks must happen on backend (frontend checks are UX only).
- Audit all permission changes for compliance.
- Ensure department-level filtering works correctly (boss sees all, others see own dept).

## Next Steps

- Complete Phase 04 (Testing & QA) to validate permission system works correctly.
- Consider adding permission templates/presets for common role configurations (future enhancement).
