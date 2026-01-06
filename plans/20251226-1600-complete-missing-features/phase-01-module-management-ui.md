# Phase 1: Module Management UI

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P0 - Critical  
**Estimated Time:** 2-3 hours

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 2 of Metadata-Based Permission System (Backend API exists)
- **Related Docs:** `docs/code-standards.md`, `docs/system-architecture.md`

## Overview

Create frontend UI for module management. Backend API already exists (`GET /modules`, `POST /modules`, `PATCH /modules/:id`, `DELETE /modules/:id`). Need frontend page with CRUD operations.

## Key Insights

- Backend API fully implemented
- ModuleService auto-generates permissions on create
- Need frontend API client and UI page
- Should show permissions for each module

## Requirements

- [x] Add `moduleApi` to `apps/web/src/lib/api.ts` ✅
- [x] Create `/dashboard/modules` page ✅
- [x] Implement CRUD operations (Create, Read, Update, Delete) ✅
- [x] Show permissions for each module ✅
- [x] Add page metadata and register page ✅
- [x] Update `page-registry-init.ts` with modules page import ✅

## Architecture

### Module API Client

```typescript
// apps/web/src/lib/api.ts
export interface Module {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModuleDto {
  name: string;
  displayName: string;
  description?: string;
}

export interface UpdateModuleDto {
  name?: string;
  displayName?: string;
  description?: string | null;
  isActive?: boolean;
}

export const moduleApi = {
  getAll: () => api.get<Module[]>("/modules"),
  getById: (id: string) => api.get<Module>(`/modules/${id}`),
  create: (data: CreateModuleDto) => api.post<Module>("/modules", data),
  update: (id: string, data: UpdateModuleDto) =>
    api.patch<Module>(`/modules/${id}`, data),
  delete: (id: string) => api.delete(`/modules/${id}`),
};
```

### Modules Page Structure

```typescript
// apps/web/src/app/[locale]/dashboard/modules/page.tsx
export const pageMetadata: PageMetadata = {
  path: "/dashboard/modules",
  name: "Module Management",
  module: "Module",
  action: "view",
  icon: "Package",
  order: 10,
  requiresAuth: true,
};

// Features:
// - List all modules
// - Create new module (auto-generates permissions)
// - Update module
// - Delete module (soft delete)
// - View permissions for each module
```

## Related Code Files

- `apps/web/src/lib/api.ts` (update)
- `apps/web/src/app/[locale]/dashboard/modules/page.tsx` (new)
- `apps/web/src/lib/page-registry-init.ts` (update)

## Implementation Steps

1. Add Module types and API client to `api.ts`
2. Create modules page component
3. Implement list view with table/cards
4. Implement create dialog
5. Implement edit dialog
6. Implement delete confirmation
7. Add permissions display for each module
8. Add page metadata and register page
9. Update `page-registry-init.ts`
10. Test CRUD operations
11. Test permission auto-generation

## Todo List

- [x] Add Module types to `api.ts` ✅
- [x] Add `moduleApi` to `api.ts` ✅
- [x] Create modules page component ✅
- [x] Implement list view ✅
- [x] Implement create functionality ✅
- [x] Implement update functionality ✅
- [x] Implement delete functionality ✅
- [x] Add permissions display ✅
- [x] Add page metadata ✅
- [x] Register page ✅
- [x] Update `page-registry-init.ts` ✅
- [x] Test all operations ✅

## Success Criteria

- ✅ Admin can view all modules via UI
- ✅ Admin can create new module via UI
- ✅ Admin can update module via UI
- ✅ Admin can delete module via UI (soft delete)
- ✅ Permissions auto-generate when creating module
- ✅ Permissions displayed for each module
- ✅ Modules page appears in sidebar
- ✅ Page protected with PageGuard

## Risk Assessment

| Risk                    | Probability | Impact | Mitigation                    |
| ----------------------- | ----------- | ------ | ----------------------------- |
| API errors not handled  | Low         | Medium | Add error handling & messages |
| Permission display slow | Low         | Low    | Load permissions on demand    |

## Security Considerations

- Page requires `manage:all` permission (admin-only)
- Backend API already protected
- Use PageGuard component

## Next Steps

- Phase 2: Seed File Auto-Generation
