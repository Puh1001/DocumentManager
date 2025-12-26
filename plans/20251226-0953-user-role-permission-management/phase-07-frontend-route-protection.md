# Phase 7: Frontend - Route Protection

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P1  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 3 (Page Permissions), Phase 4-6 (Management UIs)
- **Related Docs:** `docs/code-standards.md`, `docs/system-architecture.md`

## Overview

Implement route-level permission checks to control page access. Hide navigation items and redirect unauthorized users.

## Key Insights

- Currently all pages accessible if authenticated
- Need permission-based access control
- Use `useAbility()` hook for permission checks
- Filter sidebar navigation based on permissions

## Requirements

- [x] Create `useCanAccess()` hook
- [x] Add permission checks to page components
- [x] Filter sidebar navigation
- [x] Redirect unauthorized users
- [x] Show access denied message

## Architecture

### Permission Hook

```typescript
function useCanAccess(action: string, subject: string): boolean;
```

### Page Protection Pattern

```typescript
const canAccess = useCanAccess('view', 'User');
if (!canAccess) {
  return <AccessDenied />;
}
```

### Navigation Filtering

Filter sidebar items based on permissions:

- `/dashboard/users` → requires `view:User`
- `/dashboard/departments` → requires `view:Department`
- `/dashboard/kpi` → requires `view:Kpi`
- etc.

## Related Code Files

- `apps/web/src/hooks/use-ability.ts`
- `apps/web/src/components/layout/sidebar.tsx`
- `apps/web/src/app/[locale]/dashboard/*/page.tsx` (all pages)
- `apps/web/src/lib/types/ability.types.ts`

## Implementation Steps

1. Create `useCanAccess` hook
2. Add permission checks to each page
3. Create `AccessDenied` component
4. Filter sidebar navigation
5. Add redirect logic
6. Test with different user roles
7. Update documentation

## Todo List

- [x] Create useCanAccess hook
- [x] Add checks to users page
- [x] Add checks to departments page
- [x] Add checks to kpi page
- [x] Add checks to maintenance page
- [x] Add checks to permissions page
- [x] Filter sidebar navigation
- [x] Create AccessDenied component
- [x] Test access control
- [x] Update docs

## Success Criteria

- [x] Pages protected by permissions
- [x] Navigation filtered correctly
- [x] Unauthorized users redirected
- [x] Clear access denied messages
- [x] Admin has access to all pages

## Risk Assessment

| Risk                     | Probability | Impact | Mitigation                     |
| ------------------------ | ----------- | ------ | ------------------------------ |
| Breaking existing access | Medium      | High   | Test thoroughly, default allow |
| Performance impact       | Low         | Low    | Cache permission checks        |

## Security Considerations

- Client-side checks are UX only; backend enforces
- Don't expose sensitive data in error messages
- Log access attempts for audit

## Next Steps

After completion, all phases complete. Proceed to testing and documentation.
