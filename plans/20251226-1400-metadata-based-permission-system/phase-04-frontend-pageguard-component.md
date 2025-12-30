# Phase 4: Frontend - PageGuard Component

**Date:** 2025-12-26  
**Status:** ✅ Completed  
**Priority:** P1  
**Estimated Time:** 0.5 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 3
- **Related Docs:** `docs/code-standards.md`

## Overview

Create PageGuard component that automatically checks permissions from page metadata. Eliminates need for hardcoded permission checks in each page.

## Key Insights

- PageGuard wraps page content
- Auto-generates permission name from metadata
- Uses useCanAccess hook for permission check
- Shows AccessDenied if no permission

## Requirements

- [x] Create PageGuard component ✅
- [x] Auto-generate permission name from metadata ✅
- [x] Integrate with useCanAccess hook ✅
- [x] Handle loading state ✅
- [x] Show AccessDenied component ✅

## Architecture

### PageGuard Component

```typescript
// apps/web/src/components/page-guard.tsx
export function PageGuard({
  metadata,
  children
}: {
  metadata: PageMetadata;
  children: ReactNode;
}) {
  // Auto-generate permission name
  const action = metadata.action || "view";
  const permissionName = `${action}:${metadata.module}`;

  // Check permission
  const canAccess = useCanAccess(action, metadata.module);

  if (!canAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
```

### Usage Pattern

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content - no permission check needed */}
    </PageGuard>
  );
}
```

## Related Code Files

- `apps/web/src/components/page-guard.tsx` (new)
- `apps/web/src/app/[locale]/dashboard/*/page.tsx` (update all pages)

## Implementation Steps

1. Create PageGuard component
2. Implement auto-generation logic
3. Integrate with useCanAccess
4. Add loading state handling
5. Update users page to use PageGuard
6. Update departments page to use PageGuard
7. Update kpi page to use PageGuard
8. Update maintenance page to use PageGuard
9. Update permissions page to use PageGuard
10. Test permission checks

## Todo List

- [x] Create PageGuard component ✅
- [x] Implement permission auto-generation ✅
- [x] Add loading state ✅
- [x] Update users page ✅
- [x] Update departments page ✅
- [x] Update kpi page ✅
- [x] Update maintenance page ✅
- [x] Update permissions page ✅
- [x] Test with different roles ✅

## Success Criteria

- ✅ PageGuard component created
- ✅ Permission auto-generated from metadata
- ✅ All pages use PageGuard
- ✅ Permission checks work correctly
- ✅ AccessDenied shown when no permission

## Risk Assessment

| Risk                   | Probability | Impact | Mitigation                   |
| ---------------------- | ----------- | ------ | ---------------------------- |
| Permission check fails | Low         | High   | Validate metadata before use |
| Loading state issues   | Low         | Low    | Handle loading properly      |

## Security Considerations

- Validate module exists in DB
- Ensure permission name format correct
- Handle edge cases (no metadata, invalid module)

## Code Review

- [Review Report](./reviews/phase-04-code-review.md) ✅

## Next Steps

- Phase 5: Frontend - Auto-Discovery & Dynamic Sidebar
