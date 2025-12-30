# Phase 6: Migration - Update Existing Pages

**Date:** 2025-12-26  
**Status:** ✅ Completed  
**Priority:** P1  
**Estimated Time:** 0.5 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 3, Phase 4, Phase 5
- **Related Docs:** `docs/code-standards.md`

## Overview

Remove hardcoded permission checks from all existing pages. Replace with PageGuard component using metadata.

## Key Insights

- All pages currently have hardcoded `useCanAccess` checks
- Need to remove these and use PageGuard instead
- Ensure backward compatibility during migration
- Test each page after migration

## Requirements

- [x] Remove hardcoded permission checks from users page ✅
- [x] Remove hardcoded permission checks from departments page ✅
- [x] Remove hardcoded permission checks from kpi page ✅
- [x] Remove hardcoded permission checks from maintenance page ✅
- [x] Remove hardcoded permission checks from permissions page ✅
- [x] Verify all pages work correctly ✅

## Architecture

### Before (Hardcode)

```typescript
export default function UsersPage() {
  const canAccess = useCanAccess("view", "User");
  if (!canAccess) return <AccessDenied />;
  // ... page content
}
```

### After (Metadata-Based)

```typescript
export const pageMetadata: PageMetadata = {
  path: "/dashboard/users",
  module: "User",
  action: "view",
};

export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* ... page content */}
    </PageGuard>
  );
}
```

## Related Code Files

- `apps/web/src/app/[locale]/dashboard/users/page.tsx`
- `apps/web/src/app/[locale]/dashboard/departments/page.tsx`
- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`
- `apps/web/src/app/[locale]/dashboard/maintenance/page.tsx`
- `apps/web/src/app/[locale]/dashboard/permissions/page.tsx`

## Implementation Steps

1. Review each page's current permission check
2. Ensure metadata is exported (from Phase 3)
3. Wrap page content with PageGuard
4. Remove hardcoded useCanAccess check
5. Remove AccessDenied import if not needed
6. Test page with different roles
7. Repeat for all pages

## Todo List

- [x] Update users page ✅
- [x] Update departments page ✅
- [x] Update kpi page ✅
- [x] Update maintenance page ✅
- [x] Update permissions page ✅
- [x] Test all pages ✅
- [x] Verify no regressions ✅

## Success Criteria

- ✅ All pages use PageGuard
- ✅ No hardcoded permission checks
- ✅ All pages work correctly
- ✅ Permission checks still work
- ✅ No TypeScript errors

## Risk Assessment

| Risk                       | Probability | Impact | Mitigation                           |
| -------------------------- | ----------- | ------ | ------------------------------------ |
| Breaking permission checks | Low         | High   | Test thoroughly with different roles |
| Missing metadata           | Low         | Medium | TypeScript ensures export            |

## Security Considerations

- Ensure permission checks still work
- Validate metadata before use
- Test with unauthorized users

## Code Review

- [Review Report](./reviews/phase-06-code-review.md) ✅

## Next Steps

- Phase 7: Cleanup - Remove Hardcode
