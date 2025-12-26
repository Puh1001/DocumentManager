# Researcher 02 - Permission System & Page Access Control

**Focus**: Permission structure, page-level access control, system pages management

## Permission System Architecture

### Current Permissions

**Actions** (from `ability.types.ts`):

- `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`

**Subjects** (from `ability.types.ts`):

- `Document`, `Folder`, `User`, `"all"`

**Permission Model** (`schema.prisma`):

- `Permission`: `id`, `name` (unique), `description`
- Used in: `RolePermission`, `FolderPermission`, `DocumentPermission`

### Permission Scope

**Current**:

- Folder-level permissions (with inheritance)
- Document-level permissions (override folder)
- Role-based permissions (via `RolePermission`)

**Missing**:

- **Page-level permissions**: No system to control access to dashboard pages
- **Module-level permissions**: No granular control over departments/KPI/maintenance modules

## Page Access Control

**Current State**:

- All dashboard pages accessible if authenticated (no permission checks)
- Sidebar shows all navigation items regardless of permissions
- No route-level permission guards in frontend

**Pages in System**:

- `/dashboard` - Home
- `/dashboard/documents` - Document browser
- `/dashboard/departments` - Department management
- `/dashboard/kpi` - KPI tracking
- `/dashboard/maintenance` - Maintenance notices
- `/dashboard/users` - User management (placeholder)
- `/dashboard/permissions` - Permission management (basic)
- `/dashboard/settings` - Settings

## Requirements Analysis

**User Requirements**:

1. Permissions control folders/documents (✅ exists)
2. Permissions control system pages (❌ missing)
3. Admin-only CRUD for users/roles/permissions (⚠️ partial)
4. Admin-only role/permission assignment (⚠️ partial)

**Needed Permissions for Pages**:

- `view:Page` or `access:Page` for each page
- Or use existing actions: `view:Department`, `view:Kpi`, `view:Maintenance`, etc.

## Implementation Approach

**Option 1: Extend Subjects**

- Add `Page` subject type
- Create page permissions: `view:Page:users`, `view:Page:departments`, etc.
- Use CASL to check page access

**Option 2: Use Module Permissions**

- Map pages to modules: `Department`, `Kpi`, `Maintenance`, `User`, `Permission`
- Use `view:Department` to control `/dashboard/departments` access
- Simpler, aligns with existing structure

**Recommendation**: Option 2 (use module subjects)

## Database Considerations

**No Schema Changes Needed**:

- Existing `Permission` model supports any permission name
- Can add new permissions via seed/migration: `view:User`, `manage:User`, `view:Role`, `manage:Role`, etc.

**Permission Naming Convention**:

- Resource-level: `{action}:{Resource}` (e.g., `view:User`, `manage:Role`)
- Page-level: Use resource permissions to control page access

## Frontend Route Protection

**Current**: No route guards
**Needed**:

- Check permissions before rendering pages
- Hide navigation items user can't access
- Redirect unauthorized users

**Implementation**:

- Create `useCanAccess()` hook based on `useAbility()`
- Add route-level checks in page components
- Filter sidebar navigation based on permissions
