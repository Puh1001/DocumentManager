# Phase 1: Data Model & Hook Updates

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Update maintenance notice data model to include department and add edit/delete functions to the hook.

## Requirements

1. Add `departmentId` field to `MaintenanceNotice` interface (optional)
2. Add `updateNotice` function to hook
3. Add `deleteNotice` function to hook
4. Update default notices to include departmentId
5. Maintain backward compatibility with existing notices

## Architecture

### Data Model Changes

```typescript
export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  departmentId?: string; // NEW: Optional department ID
  createdAt: string;
}
```

### Hook Functions

```typescript
export function useMaintenanceNotices() {
  // ... existing code ...
  
  const updateNotice = useCallback((id: string, updates: Partial<MaintenanceNotice>) => {
    // Update logic
  }, [notices, persistNotices]);
  
  const deleteNotice = useCallback((id: string) => {
    // Delete logic
  }, [notices, persistNotices]);
  
  return {
    notices,
    addNotice,
    updateNotice, // NEW
    deleteNotice, // NEW
    loading,
    error,
  };
}
```

## Related Files

- `apps/web/src/hooks/use-maintenance-notices.ts` - Main hook file

## Implementation Steps

- [ ] Add `departmentId?: string` to `MaintenanceNotice` interface
- [ ] Update `parseStored` to handle missing departmentId gracefully
- [ ] Add `updateNotice` function
- [ ] Add `deleteNotice` function
- [ ] Update default notices with departmentId
- [ ] Export new functions from hook

## Success Criteria

- Hook exports `updateNotice` and `deleteNotice` functions
- Existing notices without departmentId still work
- Updates and deletes persist to localStorage

