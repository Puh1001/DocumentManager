# Researcher 02 - Module Management & Permission Auto-Generation

**Focus:** Module table structure, permission auto-generation, validation

## Current Permission System

### Permission Model

**Database Schema:**
```prisma
model Permission {
  id          String   @id @default(uuid())
  name        String   @unique // "view:User", "manage:Department"
  description String?
}
```

**Permission Naming:**
- Format: `{action}:{Module}`
- Examples: `view:User`, `manage:Department`, `view:Kpi`
- Actions: `view`, `manage`, `create`, `edit`, `delete`

### Module Validation

**Current:** Hardcoded in `CaslAbilityFactory.loadModulePermissions()`
```typescript
if (["User", "Department", "Kpi", "Maintenance", "Permission"].includes(module)) {
  // Valid module
}
```

**Issue:** Must update code for each new module

## Module Table Design

### Proposed Schema

```prisma
model Module {
  id          String   @id @default(uuid())
  name        String   @unique // "User", "Department", etc.
  displayName String   // "User Management"
  description String?
  isActive    Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("modules")
}
```

**Purpose:**
- Store module definitions
- Enable dynamic module validation
- Support module management UI

### Permission Auto-Generation

**Strategy:**
- When creating module, auto-generate standard permissions
- Default actions: `view`, `create`, `edit`, `delete`, `manage`
- Format: `${action}:${module.name}`

**Example:**
- Module: `{ name: "User" }`
- Auto-generate: `view:User`, `create:User`, `edit:User`, `delete:User`, `manage:User`

## Backend Changes Required

### CaslAbilityFactory

**Current:** Hardcoded module list
**Change:** Load modules from DB and validate dynamically

```typescript
// Load active modules from DB
const modules = await this.prisma.module.findMany({
  where: { isActive: true }
});
const moduleNames = modules.map(m => m.name);

// Validate against dynamic modules
if (moduleNames.includes(module)) {
  // Valid module
}
```

### Module Service

**New Service:** `ModuleService`
- CRUD operations for modules
- Auto-generate permissions when creating module
- Validate module exists before use

## Frontend Changes Required

### Page Metadata

**Structure:**
```typescript
export const pageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User", // Reference to Module.name
  action: "view", // Optional, default = "view"
  icon: "Users",
  order: 5,
};
```

**Auto-Generate Permission:**
- From metadata: `module: "User"`, `action: "view"`
- Generate: `view:User`
- Validate: Check if permission exists in DB

### PageGuard Component

**Functionality:**
- Accept page metadata
- Auto-generate permission name
- Check permission using `useCanAccess`
- Show `<AccessDenied />` if no access

## Key Findings

1. **Module Table:** Needed to replace hardcoded module list
2. **Auto-Generation:** Permissions can be auto-generated from module + action
3. **Validation:** Module validation should be dynamic from DB
4. **Metadata:** Page metadata enables auto-discovery and permission checks

