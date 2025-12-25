# Phase 3: Frontend Integration

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Overview

Update frontend hook and components to use real API instead of localStorage.

## Requirements

1. Update useMaintenanceNotices hook to use API
2. Add API methods to lib/api.ts
3. Handle loading and error states
4. Update components to work with API
5. Remove localStorage dependency

## Architecture

### API Client Updates

```typescript
// apps/web/src/lib/api.ts
export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  departmentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const maintenanceApi = {
  getAll: () => api.get<MaintenanceNotice[]>("/maintenance"),
  getById: (id: string) => api.get<MaintenanceNotice>(`/maintenance/${id}`),
  create: (data: CreateMaintenanceNoticeDto) =>
    api.post<MaintenanceNotice>("/maintenance", data),
  update: (id: string, data: UpdateMaintenanceNoticeDto) =>
    api.patch<MaintenanceNotice>(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};
```

### Hook Updates

- Replace localStorage with API calls
- Keep same interface for components
- Add proper error handling
- Handle loading states

## Related Files

- `apps/web/src/hooks/use-maintenance-notices.ts` - Update hook
- `apps/web/src/lib/api.ts` - Add API methods
- `apps/web/src/app/[locale]/dashboard/maintenance/page.tsx` - Already works

## Implementation Steps

- [x] Add MaintenanceNotice interface to api.ts
- [x] Add maintenanceApi methods
- [x] Update useMaintenanceNotices hook
- [x] Remove localStorage code
- [x] Update error handling
- [x] Update components for async operations
- [x] Fix type imports

## Success Criteria

- Hook uses API instead of localStorage
- All CRUD operations work
- Error handling works
- Loading states work
- Components work without changes
