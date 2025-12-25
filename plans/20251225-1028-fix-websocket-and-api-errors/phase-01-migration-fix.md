# Phase 1: Fix Migration System

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** CRITICAL

---

## Overview

Restore missing migration.sql file or baseline existing migration to unblock all future migrations. This is critical as it blocks the maintenance_notices table migration.

## Current State

- Migration directory exists: `apps/api/prisma/migrations/20251222112711_init/`
- Migration file exists but only contains: `-- Migration already applied`
- Prisma error: `P3015 - Could not find the migration file`

## Requirements

1. Verify database state (what tables exist)
2. Create proper migration.sql file OR baseline migration
3. Verify migration system works
4. Apply maintenance_notices migration

## Implementation Steps

### Step 1: Check Database State

```bash
cd apps/api

# Check existing tables
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

**Decision Point:**

- If tables exist → Use Option A (baseline migration)
- If no tables → Use Option B (create init migration)

### Step 2A: Baseline Migration (If Tables Exist)

```bash
cd apps/api

# 1. Generate SQL from current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20251222112711_init/migration.sql

# 2. Mark as applied (since tables already exist)
npx prisma migrate resolve --applied 20251222112711_init

# 3. Verify
npx prisma migrate status
```

### Step 2B: Create Init Migration (If No Tables)

```bash
cd apps/api

# 1. Delete placeholder migration.sql
rm prisma/migrations/20251222112711_init/migration.sql

# 2. Create proper init migration
npx prisma migrate dev --name init --create-only

# 3. Review generated SQL
cat prisma/migrations/20251222112711_init/migration.sql

# 4. Apply migration
npx prisma migrate dev
```

### Step 3: Verify Migration System

```bash
cd apps/api

# Check migration status
npx prisma migrate status

# Should show: "Database schema is up to date"
```

### Step 4: Apply Maintenance Notices Migration

```bash
cd apps/api

# Create and apply maintenance_notices migration
npx prisma migrate dev --name add_maintenance_notices

# Verify table exists
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_name = 'maintenance_notices';"
```

## Related Files

- `apps/api/prisma/migrations/20251222112711_init/migration.sql` - To fix
- `apps/api/prisma/schema.prisma` - Schema reference
- `apps/api/prisma/migrations/migration_lock.toml` - Lock file

## Success Criteria

- ✅ Migration file contains valid SQL
- ✅ `prisma migrate status` shows "up to date"
- ✅ Can create new migrations without errors
- ✅ `maintenance_notices` table exists in database
- ✅ API no longer crashes on maintenance endpoints

## Rollback Plan

If migration fails:

1. Check database backup exists
2. Restore from backup if needed
3. Use `prisma migrate resolve --rolled-back <migration>` if needed
