# Debug Report: Missing `user_departments` Table in Production

**Date:** 2026-01-07  
**Severity:** Critical (Production Error)  
**Status:** Root Cause Identified, Fix Ready

## Problem Summary

Production logs show repeated Prisma errors:
```
The table `public.user_departments` does not exist in the current database.
prisma:error Invalid `prisma.user.findUnique()` invocation
```

The application is failing because:
- Prisma schema defines `UserDepartment` model mapping to `user_departments` table
- Production database does NOT have this table
- Prisma Client is trying to query this table when accessing user relations

## Root Cause Analysis

### Investigation Steps

1. **Schema Analysis**
   - ✅ `UserDepartment` model exists in `apps/api/prisma/schema.prisma` (lines 293-305)
   - ✅ Model correctly maps to `user_departments` table
   - ✅ Relations defined correctly (User ↔ UserDepartment ↔ Department)

2. **Migration Analysis**
   - ❌ Initial migration (`20251222112711_init`) does NOT create `user_departments` table
   - ❌ No subsequent migration creates this table
   - ⚠️ Migration `20260107083554_add_user_departments_junction_table` was registered but **migration.sql file was missing**

3. **Migration Status Check**
   ```bash
   npx prisma migrate status
   # Result: Migration 20260107083554_add_user_departments_junction_table not applied
   ```

### Root Cause

**The migration file was never created or was deleted after the migration was registered in Prisma's migration history.**

This created a state where:
- Prisma migration system knows a migration should exist
- But the actual SQL file to create the table is missing
- Production database never received the migration
- Code expects the table to exist

### Evidence

1. **Missing Migration File**
   - Directory exists: `apps/api/prisma/migrations/20260107083554_add_user_departments_junction_table/`
   - But `migration.sql` was missing (now created)

2. **Schema vs Database Mismatch**
   - Schema defines: `model UserDepartment { ... @@map("user_departments") }`
   - Production DB: Table `user_departments` does not exist
   - Prisma Client: Generated with `userDepartment` model expecting table

3. **Error Pattern**
   - All errors reference `prisma.user.findUnique()` or `prisma.session.findUnique()`
   - These queries fail because Prisma tries to resolve the `departments` relation
   - Relation requires `user_departments` junction table

## Fix Plan

### Immediate Fix (Production)

1. **Deploy Migration to Production**
   ```bash
   # On production server
   cd /var/www/DocumentManager/apps/api
   npx prisma migrate deploy
   ```

   This will:
   - Create the `user_departments` table
   - Add indexes (`user_id`, `department_id`)
   - Add foreign key constraints
   - Register migration as applied

2. **Verify Migration**
   ```bash
   # Check table exists
   psql -h <host> -U <user> -d <database> -c "\d user_departments"
   
   # Or via Prisma
   npx prisma migrate status
   ```

3. **Optional: Run Data Migration**
   If users have legacy `department` string values that need to be migrated:
   ```bash
   npm run migrate:user-departments migrate
   ```

### Prevention

1. **Migration File Verification**
   - Add pre-commit hook to verify migration files exist
   - Add CI check: `npx prisma migrate status` should show no pending migrations before deploy

2. **Deployment Checklist**
   - Always run `npx prisma migrate deploy` in production after code deployment
   - Verify migration status before starting application
   - Check application logs for Prisma errors after deployment

3. **Schema Sync Validation**
   - Add health check endpoint that verifies critical tables exist
   - Alert if schema mismatch detected

## Migration SQL

The migration file has been created at:
`apps/api/prisma/migrations/20260107083554_add_user_departments_junction_table/migration.sql`

**Contents:**
```sql
-- CreateTable
CREATE TABLE "user_departments" (
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("user_id","department_id")
);

-- CreateIndex
CREATE INDEX "user_departments_user_id_idx" ON "user_departments"("user_id");
CREATE INDEX "user_departments_department_id_idx" ON "user_departments"("department_id");

-- AddForeignKey
ALTER TABLE "user_departments" 
  ADD CONSTRAINT "user_departments_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_departments" 
  ADD CONSTRAINT "user_departments_department_id_fkey" 
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Deployment Steps

### Step 1: Backup Database (CRITICAL)
```bash
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Deploy Migration
```bash
# Option A: Via Docker (if using docker-compose)
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Option B: Direct (if running on server)
cd apps/api
npx prisma migrate deploy
```

### Step 3: Verify
```bash
# Check migration status
npx prisma migrate status

# Should show: "Database schema is up to date"
```

### Step 4: Restart Application
```bash
# Restart API service to reload Prisma Client
docker-compose -f docker-compose.prod.yml restart api
# OR
pm2 restart api
```

### Step 5: Monitor Logs
```bash
# Watch for errors
docker-compose -f docker-compose.prod.yml logs -f api
# OR
tail -f /var/log/api.log
```

## Expected Outcome

After migration:
- ✅ `user_departments` table exists in production database
- ✅ Prisma queries succeed
- ✅ No more "table does not exist" errors
- ✅ User authentication and session management work normally
- ✅ User-department relations can be queried

## Rollback Plan

If migration fails:

1. **Restore Database Backup**
   ```bash
   psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Mark Migration as Rolled Back** (if needed)
   ```bash
   # Manually remove migration record from _prisma_migrations table
   psql -h <host> -U <user> -d <database> -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260107083554_add_user_departments_junction_table';"
   ```

## Related Files

- Schema: `apps/api/prisma/schema.prisma` (lines 293-305)
- Migration: `apps/api/prisma/migrations/20260107083554_add_user_departments_junction_table/migration.sql`
- Data Migration Script: `apps/api/prisma/migrations/migrate-user-departments.ts`
- Deployment Scripts: `scripts/deploy.sh`, `scripts/deploy-simple.sh`

## Notes

- The migration is **non-destructive** - it only adds a new table
- Existing functionality will continue to work (legacy `User.department` field still exists)
- Data migration (populating junction table from legacy strings) is optional and can be run separately
