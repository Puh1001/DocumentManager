# Phase 1: Database Schema - Module Table

**Date:** 2025-12-26  
**Status:** 🟢 Completed  
**Priority:** P1  
**Estimated Time:** 0.5 day

---

## Context

- **Parent Plan:** [plan.md](./plan.md)
- **Dependencies:** None
- **Related Docs:** `docs/system-architecture.md`, `docs/code-standards.md`

## Overview

Create Module table in database to store module definitions. This enables dynamic module validation and permission auto-generation.

## Key Insights

- Current module list hardcoded in `CaslAbilityFactory`
- Need database table to store module definitions
- Module table enables dynamic validation
- Supports module management UI

## Requirements

- [x] Create `Module` model in Prisma schema
- [x] Add migration script
- [x] Seed initial modules (User, Department, Kpi, Maintenance, Permission)
- [x] Update Prisma client

## Architecture

### Module Schema

```prisma
model Module {
  id          String   @id @default(uuid())
  name        String   @unique // "User", "Department", etc.
  displayName String   // "User Management"
  description String?
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("modules")
}
```

### Initial Modules

- User
- Department
- Kpi
- Maintenance
- Permission

## Related Code Files

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- `apps/api/prisma/seed.ts`

## Implementation Steps

1. Add `Module` model to Prisma schema
2. Generate migration: `npx prisma migrate dev --name add_module_table`
3. Update seed script to create initial modules
4. Run seed: `npm run db:seed`
5. Verify modules created in database

## Todo List

- [x] Add Module model to schema.prisma
- [x] Generate and run migration
- [x] Update seed.ts with initial modules
- [x] Test seed script
- [x] Verify database schema

## Success Criteria

- ✅ Module table exists in database
- ✅ Initial modules seeded successfully
- ✅ Prisma client updated
- ✅ No migration errors

## Risk Assessment

| Risk                | Probability | Impact | Mitigation                 |
| ------------------- | ----------- | ------ | -------------------------- |
| Migration conflicts | Low         | Medium | Review existing migrations |
| Seed data conflicts | Low         | Low    | Use upsert in seed script  |

## Security Considerations

- Module names must be unique
- Validate module names before creation
- Only admin can create/modify modules (future phase)

## Next Steps

- Phase 2: Backend - Module Service & Dynamic Validation
