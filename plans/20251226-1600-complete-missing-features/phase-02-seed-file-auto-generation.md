# Phase 2: Seed File Auto-Generation

**Date:** 2025-12-26  
**Status:** 🔴 Pending  
**Priority:** P1 - High  
**Estimated Time:** 30 minutes

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** Phase 1 of Metadata-Based Permission System (Module table exists)
- **Related Docs:** `apps/api/prisma/seed.ts`

## Overview

Update seed file to auto-generate all standard permissions (view, create, edit, delete, manage) for each module. Currently only creates "view" permissions manually.

## Key Insights

- Current seed file manually creates only "view" permissions
- ModuleService already has auto-generation logic
- Need to replicate logic in seed file
- Should be consistent with ModuleService behavior

## Requirements

- [x] Update seed file to auto-generate permissions ✅
- [x] Use same STANDARD_ACTIONS as ModuleService ✅
- [x] Generate permissions for all modules in seed ✅
- [x] Maintain idempotency (upsert) ✅

## Architecture

### Current State

```typescript
// seed.ts - Only creates "view" permissions
const permissions = [
  { name: "view:User", description: "View user management page" },
  { name: "view:Department", description: "..." },
  // Missing: create, edit, delete, manage
];
```

### Expected State

```typescript
// seed.ts - Auto-generate all permissions
const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];

// After creating modules
for (const module of modules) {
  for (const action of STANDARD_ACTIONS) {
    await prisma.permission.upsert({
      where: { name: `${action}:${module.name}` },
      update: {},
      create: {
        name: `${action}:${module.name}`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name} module`,
      },
    });
  }
}
```

## Related Code Files

- `apps/api/prisma/seed.ts` (update)

## Implementation Steps

1. Define STANDARD_ACTIONS constant
2. After module creation, loop through modules
3. For each module, loop through STANDARD_ACTIONS
4. Upsert permission with format `${action}:${module.name}`
5. Generate description from action and module name
6. Test seed file execution
7. Verify all permissions created

## Todo List

- [x] Add STANDARD_ACTIONS constant ✅
- [x] Add auto-generation loop after module creation ✅
- [x] Update permission creation logic ✅
- [x] Test seed file ✅
- [x] Verify permissions created correctly ✅

## Success Criteria

- ✅ Seed file auto-generates all 5 permissions per module
- ✅ Permissions format: `${action}:${module.name}`
- ✅ Descriptions auto-generated
- ✅ Idempotent (can run multiple times)
- ✅ Consistent with ModuleService logic

## Risk Assessment

| Risk                  | Probability | Impact | Mitigation                  |
| --------------------- | ----------- | ------ | --------------------------- |
| Duplicate permissions | Low         | Low    | Use upsert (idempotent)     |
| Missing permissions   | Low         | Medium | Verify after seed execution |

## Security Considerations

- Permissions created with correct format
- No security impact (data seeding only)

## Next Steps

- Phase 3: Migration Script
