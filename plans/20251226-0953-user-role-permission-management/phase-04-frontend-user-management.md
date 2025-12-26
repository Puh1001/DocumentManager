# Phase 4: Frontend - User Management UI

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 1-2 days

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 2 (Admin enforcement)
- **Related Docs:** `docs/code-standards.md`, `docs/design-guidelines.md`

## Overview

Build complete user management UI with CRUD operations, role assignment, and admin-only access control.

## Key Insights

- Current page is placeholder only
- Use ShadcnUI components (Card, Dialog, Table, Button)
- Follow departments page pattern for consistency
- Admin-only: check `user?.roles?.includes("admin")`

## Requirements

- [x] User list with pagination/search/filters
- [x] Create user dialog (admin-only)
- [x] Edit user dialog (admin-only)
- [x] Deactivate user (admin-only)
- [x] Role assignment UI (admin-only)
- [x] Show user roles in list
- [x] Loading and error states

## Architecture

### Page Structure

```
/dashboard/users
├── User list (table)
│   ├── Search/filter bar
│   ├── User rows (name, email, department, roles, actions)
│   └── Pagination
├── Create user dialog
├── Edit user dialog
└── Role assignment dialog
```

### Components

- `UserList` - Main table component
- `UserForm` - Create/edit form
- `RoleAssignmentDialog` - Assign/remove roles
- `UserActions` - Action buttons (edit, deactivate, assign roles)

### API Integration

- `GET /users` - List with pagination
- `POST /users` - Create
- `PATCH /users/:id` - Update
- `DELETE /users/:id` - Deactivate
- `POST /users/:id/roles/:roleId` - Assign role
- `DELETE /users/:id/roles/:roleId` - Remove role
- `GET /roles` - List roles for assignment

## Related Code Files

- `apps/web/src/app/[locale]/dashboard/users/page.tsx` (placeholder)
- `apps/web/src/lib/api.ts` (API client)
- `apps/web/src/components/ui/*` (ShadcnUI components)
- `apps/web/src/app/[locale]/dashboard/departments/page.tsx` (reference)

## Implementation Steps

1. Create user list component with table
2. Add search and filter functionality
3. Create user form dialog (create/edit)
4. Add role assignment dialog
5. Implement API calls
6. Add loading/error states
7. Add admin-only checks
8. Add i18n translations
9. Test all operations

## Todo List

- [x] Create UserList component
- [x] Add search/filter UI
- [x] Create UserForm dialog
- [x] Create RoleAssignmentDialog
- [x] Add API integration
- [x] Add admin checks
- [x] Add loading states
- [x] Add error handling
- [x] Add i18n
- [x] Test CRUD operations

## Success Criteria

- [x] Full CRUD operations work
- [x] Role assignment functional
- [x] Admin-only access enforced
- [x] UI matches design system
- [x] All operations tested

## Risk Assessment

| Risk                        | Probability | Impact | Mitigation                     |
| --------------------------- | ----------- | ------ | ------------------------------ |
| UI inconsistency            | Low         | Medium | Follow existing patterns       |
| Performance with many users | Medium      | Medium | Pagination + virtual scrolling |

## Security Considerations

- Hide UI elements for non-admin users
- Validate permissions before API calls
- Show clear error messages for unauthorized actions

## Next Steps

After completion, proceed to Phase 5: Frontend Role Management UI.
