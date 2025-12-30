# Phase 5: Frontend - Auto-Discovery & Dynamic Sidebar

**Date:** 2025-12-26  
**Status:** ✅ Completed  
**Priority:** P1  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 3, Phase 4
- **Related Docs:** `docs/code-standards.md`

## Overview

Update sidebar to auto-discover pages from metadata registry and render navigation items dynamically. Eliminate hardcoded navigation array.

## Key Insights

- Sidebar should load pages from registry
- Filter pages based on permissions
- Sort by order property
- Handle special pages (dashboard, documents, settings)

## Requirements

- [x] Create usePages hook to load metadata ✅
- [x] Update sidebar to use dynamic pages ✅
- [x] Filter pages based on permissions ✅
- [x] Handle special pages (always visible) ✅
- [x] Sort pages by order ✅
- [x] Add loading state ✅

## Architecture

### usePages Hook

```typescript
// apps/web/src/hooks/use-pages.ts
export function usePages(): {
  pages: PageMetadata[];
  loading: boolean;
} {
  const [pages, setPages] = useState<PageMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allPages = getAllPages();
    setPages(allPages);
    setLoading(false);
  }, []);

  return { pages, loading };
}
```

### Dynamic Sidebar

```typescript
// apps/web/src/components/layout/sidebar.tsx
export function Sidebar() {
  const { pages, loading } = usePages();
  const t = useTranslations("common");

  // Special pages (always visible)
  const specialPages = [
    {
      path: "/dashboard",
      name: t("navigation.dashboard"),
      icon: LayoutDashboard,
    },
    {
      path: "/dashboard/documents",
      name: t("navigation.documents"),
      icon: FileText,
    },
    {
      path: "/dashboard/settings",
      name: t("navigation.settings"),
      icon: Settings,
    },
  ];

  // Filter pages by permission
  const filteredPages = pages
    .filter((page) => {
      const canAccess = useCanAccess(page.action || "view", page.module);
      return canAccess;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const allNavigation = [...specialPages, ...filteredPages];

  // Render navigation
}
```

## Related Code Files

- `apps/web/src/hooks/use-pages.ts` (new)
- `apps/web/src/components/layout/sidebar.tsx` (update)

## Implementation Steps

1. Create usePages hook
2. Update sidebar to load pages from registry
3. Implement permission filtering
4. Handle special pages
5. Sort pages by order
6. Update icon rendering (dynamic from metadata)
7. Test with different user roles
8. Add loading state

## Todo List

- [x] Create usePages hook ✅
- [x] Update sidebar component ✅
- [x] Implement permission filtering ✅
- [x] Handle special pages ✅
- [x] Sort by order ✅
- [x] Dynamic icon rendering ✅
- [x] Test with different roles ✅
- [x] Add loading state ✅

## Success Criteria

- ✅ Sidebar loads pages from registry
- ✅ Pages filtered by permissions
- ✅ Navigation items render correctly
- ✅ Special pages always visible
- ✅ Pages sorted by order
- ✅ Loading state handled

## Risk Assessment

| Risk                 | Probability | Impact | Mitigation                |
| -------------------- | ----------- | ------ | ------------------------- |
| Missing pages        | Low         | Medium | Validate registry on load |
| Icon rendering fails | Low         | Low    | Fallback to default icon  |

## Security Considerations

- Only show pages user has permission to access
- Validate page paths before rendering

## Code Review

- [Review Report](./reviews/phase-05-code-review.md) ✅

## Next Steps

- Phase 6: Migration - Update Existing Pages
