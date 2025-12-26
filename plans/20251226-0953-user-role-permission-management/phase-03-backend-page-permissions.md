# Phase 3: Backend - Page Permission System

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P1  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 1, Phase 2
- **Related Docs:** `docs/system-architecture.md`, `docs/code-standards.md`

## Overview

Extend permission system to control access to system pages. Use module-based permissions (e.g., `view:User`, `view:Department`) to control page access.

## Key Insights

- Current permissions only control folders/documents
- Need page-level access control
- Use existing CASL subjects: extend to include module names
- Map pages to modules: Users, Departments, KPI, Maintenance, Permissions

## Requirements

- [x] Define page-to-module mapping
- [x] Add page permission checks to ability factory
- [x] Create seed permissions for pages
- [x] Document permission naming convention

## Architecture

### Page-to-Module Mapping

| Page                     | Module      | Permissions Needed |
| ------------------------ | ----------- | ------------------ |
| `/dashboard/users`       | User        | `view:User`        |
| `/dashboard/departments` | Department  | `view:Department`  |
| `/dashboard/kpi`         | Kpi         | `view:Kpi`         |
| `/dashboard/maintenance` | Maintenance | `view:Maintenance` |
| `/dashboard/permissions` | Permission  | `view:Permission`  |

### Permission Naming

- Format: `{action}:{Resource}`
- Examples: `view:User`, `manage:User`, `view:Department`, `view:Kpi`
- Admin role: `manage:all` (grants all)

### Ability Factory Extension

Extend `CaslAbilityFactory` to load module permissions:

- Load user's role permissions
- Check for `view:{Module}` permissions
- Grant page access based on permissions

## Related Code Files

- `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`
- `apps/api/src/modules/authorization/services/permission.service.ts`
- `apps/api/prisma/seed.ts`

## Implementation Steps

1. Define page-to-module mapping constant
2. Extend CaslAbilityFactory to include module permissions
3. Add seed permissions: `view:User`, `view:Department`, `view:Kpi`, `view:Maintenance`, `view:Permission`
4. Update ability types to include module subjects
5. Test permission checks
6. Document permission structure

## Todo List

- [x] Create page-to-module mapping
- [x] Extend CaslAbilityFactory
- [x] Add seed permissions
- [x] Update ability types
- [x] Test permission evaluation
- [x] Document permission system

## Success Criteria

- [x] Page permissions defined and seeded
- [x] Ability factory evaluates page permissions
- [x] Admin has access to all pages
- [x] Non-admin access controlled by permissions

## Risk Assessment

| Risk                          | Probability | Impact | Mitigation            |
| ----------------------------- | ----------- | ------ | --------------------- |
| Breaking existing permissions | Low         | High   | Extend, don't replace |
| Performance impact            | Low         | Low    | Cache ability rules   |

## Security Considerations

- Default: deny access (explicit permissions required)
- Admin bypass: `manage:all` grants all
- Audit page access attempts

## Next Steps

After completion, proceed to Phase 4: Frontend User Management UI.
