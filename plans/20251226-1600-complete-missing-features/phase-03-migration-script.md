# Phase 3: Migration Script for Existing Databases

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P1 - High  
**Estimated Time:** 1 hour

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 2 (Seed file logic)
- **Related Docs:** `apps/api/prisma/seed.ts`

## Overview

Create one-time migration script to generate missing permissions for existing databases. Existing modules only have "view" permissions, need to add create, edit, delete, manage.

## Key Insights

- Existing modules: User, Department, Kpi, Maintenance, Permission
- Only have `view:{Module}` permissions
- Missing: `create`, `edit`, `delete`, `manage` permissions
- One-time script, not part of regular migrations

## Requirements

- [x] Create migration script ✅
- [x] Load all active modules from database ✅
- [x] Generate missing permissions ✅
- [x] Use same logic as seed file ✅
- [x] Add verification/logging ✅
- [x] Make script idempotent ✅

## Architecture

### Script Structure

```typescript
// scripts/migrate-module-permissions.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];

async function migrateModulePermissions() {
  // 1. Load all active modules
  // 2. For each module, check existing permissions
  // 3. Generate missing permissions
  // 4. Log results
  // 5. Verify
}
```

### Logic

```typescript
const modules = await prisma.module.findMany({
  where: { isActive: true },
});

for (const module of modules) {
  for (const action of STANDARD_ACTIONS) {
    const permissionName = `${action}:${module.name}`;

    // Check if exists
    const existing = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!existing) {
      // Create missing permission
      await prisma.permission.create({
        data: {
          name: permissionName,
          description: `${action} ${module.name} module`,
        },
      });
    }
  }
}
```

## Related Code Files

- `apps/api/prisma/migrate-module-permissions.ts` (new)

## Implementation Steps

1. Create script file
2. Import PrismaClient
3. Define STANDARD_ACTIONS
4. Load active modules
5. Loop through modules and actions
6. Check if permission exists
7. Create missing permissions
8. Add logging
9. Add verification
10. Test script execution
11. Document usage

## Todo List

- [x] Create script file ✅
- [x] Implement module loading ✅
- [x] Implement permission generation ✅
- [x] Add logging ✅
- [x] Add verification ✅
- [x] Test script ✅
- [x] Document usage ✅

## Success Criteria

- ✅ Script generates missing permissions
- ✅ Only creates missing permissions (idempotent)
- ✅ Logs created permissions
- ✅ Verifies results
- ✅ Can run multiple times safely

## Risk Assessment

| Risk                  | Probability | Impact | Mitigation                  |
| --------------------- | ----------- | ------ | --------------------------- |
| Duplicate permissions | Low         | Low    | Check before create         |
| Script fails mid-run  | Low         | Medium | Use transactions (optional) |

## Security Considerations

- Read-only check, create-only missing
- No deletion or modification
- Safe to run multiple times

## Usage

```bash
cd apps/api
npx tsx prisma/migrate-module-permissions.ts
```

**Note:** Script is located in `apps/api/prisma/` folder following the same pattern as other migration/cleanup scripts.

## Next Steps

- Phase 4: Workflow Documentation
