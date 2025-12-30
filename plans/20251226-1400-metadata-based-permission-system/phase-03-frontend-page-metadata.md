# Phase 3: Frontend - Page Metadata System

**Date:** 2025-12-26  
**Status:** ✅ Completed  
**Priority:** P1  
**Estimated Time:** 1 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 2
- **Related Docs:** `docs/code-standards.md`

## Overview

Define PageMetadata type and create page registry system to collect metadata from all pages. Enable auto-discovery mechanism.

## Key Insights

- Pages need metadata export for auto-discovery
- Metadata should be minimal (module + optional action)
- Type-safe metadata enables validation
- Registry collects all page metadata at build/runtime

## Requirements

- [x] Define `PageMetadata` type ✅
- [x] Create page registry system ✅
- [x] Create utility to collect metadata ✅
- [x] Add metadata to existing pages ✅
- [x] Validate metadata structure ✅

## Architecture

### PageMetadata Type

```typescript
export interface PageMetadata {
  path: string; // "/dashboard/users"
  name: string; // "User Management"
  module: string; // "User" - Reference to Module.name
  action?: string; // "view" - Optional, default = "view"
  icon?: string; // "Users" - Lucide icon name
  order?: number; // 5 - Navigation order
  requiresAuth?: boolean; // true - Default true
}
```

### Page Registry

```typescript
// apps/web/src/lib/page-registry.ts
export const registeredPages: PageMetadata[] = [];

export function registerPage(metadata: PageMetadata): void {
  registeredPages.push(metadata);
}

export function getAllPages(): PageMetadata[] {
  return registeredPages.sort((a, b) => (a.order || 0) - (b.order || 0));
}
```

### Page Metadata Export

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
export const pageMetadata: PageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User",
  action: "view",
  icon: "Users",
  order: 5,
};
```

## Related Code Files

- `apps/web/src/lib/types/page-metadata.ts` (new)
- `apps/web/src/lib/page-registry.ts` (new)
- `apps/web/src/app/[locale]/dashboard/*/page.tsx` (update all pages)

## Implementation Steps

1. Create PageMetadata type definition
2. Create page registry utility
3. Add metadata export to users page
4. Add metadata export to departments page
5. Add metadata export to kpi page
6. Add metadata export to maintenance page
7. Add metadata export to permissions page
8. Test metadata collection

## Todo List

- [x] Create PageMetadata type ✅
- [x] Create page registry ✅
- [x] Add metadata to users page ✅
- [x] Add metadata to departments page ✅
- [x] Add metadata to kpi page ✅
- [x] Add metadata to maintenance page ✅
- [x] Add metadata to permissions page ✅
- [x] Test registry collection ✅

## Success Criteria

- ✅ PageMetadata type defined
- ✅ Page registry collects all metadata
- ✅ All pages have metadata export
- ✅ Metadata structure validated

## Risk Assessment

| Risk             | Probability | Impact | Mitigation                |
| ---------------- | ----------- | ------ | ------------------------- |
| Missing metadata | Low         | Medium | TypeScript ensures export |
| Invalid metadata | Low         | Low    | Type validation           |

## Security Considerations

- Validate module names against DB
- Ensure metadata path matches actual route

## Next Steps

- Phase 4: Frontend - PageGuard Component
