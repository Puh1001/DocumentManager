# Multi-Department User KPI Management

**Created:** 2026-01-07 17:00  
**Status:** Planning  
**Priority:** High

## Overview

Enable users to be assigned to multiple departments and manage KPIs across all their departments.

## Current State

- Users have single `department` (String?) field
- `user_departments` junction table exists in DB (migration created)
- UserDepartment model NOT in Prisma schema
- KPI access: regular users limited to single department
- Frontend: shows single department selector

## Objectives

1. Implement many-to-many User-Department relationship
2. Allow users with multiple departments to CRUD KPIs for all departments
3. Maintain backward compatibility during migration
4. Update Admin UI for multi-department assignment
5. Update KPI UI to support multi-department access

## Technical Scope

**Backend:**

- Schema: Add UserDepartment model
- Migration: Migrate existing `department` string to junction table
- Services: Update user/KPI services for multi-department logic
- Guards: Update KPI access control

**Frontend:**

- Admin: Multi-select department assignment
- KPI Page: Show all accessible departments
- Access helpers: Support multiple departments

## Success Criteria

- [ ] Users can be assigned to multiple departments
- [ ] Regular users can CRUD KPIs for all their departments
- [ ] Admin/Boss maintain full access
- [ ] Legacy data migrated successfully
- [ ] No breaking changes for single-department users
- [ ] All tests pass

## Phases

1. **Phase 1:** Database Schema & Migration (Phase-01)
2. **Phase 2:** Backend Services & API (Phase-02)
3. **Phase 3:** Frontend Updates (Phase-03)
4. **Phase 4:** Testing & Migration (Phase-04)

## Estimated Timeline

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 2-3 hours
- Phase 4: 2-3 hours
- **Total:** 9-13 hours

## Risks

| Risk                              | Impact | Mitigation                                 |
| --------------------------------- | ------ | ------------------------------------------ |
| Data loss during migration        | High   | Create backup script, reversible migration |
| Breaking existing KPI access      | High   | Keep legacy field, gradual deprecation     |
| Performance with many departments | Medium | Index optimization, caching                |
| Frontend complexity               | Low    | Clear UX patterns, progressive enhancement |

## Dependencies

- Existing `user_departments` table
- KPI module architecture
- User management permissions

## Notes

- Legacy `User.department` field kept for backward compatibility
- Eventually deprecate after full migration
- Admin/Boss roles maintain full access
