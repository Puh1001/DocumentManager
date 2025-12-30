# Researcher 01 - Current Page Structure & Permission System

**Focus:** Current page component structure, permission checks, sidebar navigation

## Current Page Structure

### Page Components

**Location:** `apps/web/src/app/[locale]/dashboard/*/page.tsx`

**Pattern:**

```typescript
"use client";
import { useCanAccess } from "@/hooks/use-can-access";
import { AccessDenied } from "@/components/access-denied";

export default function Page() {
  // ... hooks
  const canAccess = useCanAccess("view", "Module"); // Hardcode
  if (!canAccess) return <AccessDenied />;
  // ... page content
}
```

**Pages:**

- `/dashboard/users` - User management
- `/dashboard/departments` - Department management
- `/dashboard/kpi` - KPI tracking
- `/dashboard/maintenance` - Maintenance notices
- `/dashboard/permissions` - Permission management

### Permission Checks

**Current Implementation:**

- Each page hardcodes `useCanAccess("view", "Module")`
- Early return with `<AccessDenied />` if no access
- Must be called after all hooks (React rules)

**Hook:** `apps/web/src/hooks/use-can-access.ts`

- Wraps `useAbility()` hook
- Returns `false` during loading
- Uses CASL ability check

## Sidebar Navigation

**Location:** `apps/web/src/components/layout/sidebar.tsx`

**Current Structure:**

- Hardcoded navigation array
- Each item has `show` property based on permission check
- Permission checks: `useCanAccess("view", "Module")` for each item

**Issues:**

- Must add new item for each page
- Must add permission check for each item
- No auto-discovery mechanism

## Backend Permission System

**Location:** `apps/api/src/modules/authorization/`

**Current Flow:**

1. Permissions stored in DB (`Permission` table)
2. Assigned to roles via `RolePermission` table
3. Loaded by `CaslAbilityFactory.loadModulePermissions()`
4. Parsed from format: `{action}:{Module}` (e.g., "view:User")

**Hardcode Issues:**

- Module list hardcoded in validation: `["User", "Department", "Kpi", ...]`
- Page-to-module mapping hardcoded in `page-module-mapping.ts`

## Key Findings

1. **Page Components:** All follow same pattern with hardcoded permission checks
2. **Sidebar:** Hardcoded navigation items with individual permission checks
3. **Backend:** Module validation hardcoded in ability factory
4. **No Metadata System:** No page metadata or auto-discovery mechanism

## Requirements for Metadata-Based

1. Page metadata export in each page component
2. Auto-discovery mechanism to collect metadata
3. PageGuard component to handle permission checks
4. Dynamic sidebar from metadata
5. Module validation from DB instead of hardcode
