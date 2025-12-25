# Debug Report: Maintenance Notices Table Missing

**Date:** 2025-01-XX  
**Status:** 🔍 Root Cause Identified  
**Priority:** High

---

## Problem Summary

**Error:**

```
Invalid `this.prisma.maintenanceNotice.findMany()` invocation
The table `public.maintenance_notices` does not exist in the current database.
```

**Location:**

- `apps/api/src/modules/maintenance/services/maintenance.service.ts:13:42`

**Impact:**

- Maintenance notices API endpoints fail
- Frontend cannot load maintenance notices
- All CRUD operations for maintenance notices fail

---

## Root Cause Analysis

### ✅ What Exists

1. **Prisma Schema**: `MaintenanceNotice` model defined in `apps/api/prisma/schema.prisma` (lines 337-355)
2. **Prisma Client**: Generated successfully (code compiles without TypeScript errors)
3. **Backend Code**: Service, controller, DTOs all implemented
4. **Frontend Code**: Hooks and UI components implemented

### ❌ What's Missing

1. **Database Migration**: No migration file exists for `maintenance_notices` table
2. **Database Table**: Table `public.maintenance_notices` does not exist in database

### Why This Happened

- Plan `20251224-1403-full-maintenance-backend-frontend` marked Phase 1 as "✅ Completed"
- Schema was added to `schema.prisma`
- Prisma client was generated
- **Migration was never created or applied**

---

## Solution

### Option A: Create & Apply Migration (Recommended for Development)

```bash
cd apps/api
npx prisma migrate dev --name add_maintenance_notices
```

This will:

1. Create migration file in `prisma/migrations/`
2. Apply migration to database
3. Regenerate Prisma client

### Option B: Use db push (Quick Fix, Development Only)

```bash
cd apps/api
npx prisma db push
```

**Warning:** `db push` doesn't create migration files. Use only for development.

### Option C: Manual SQL + Baseline (Production/Staging)

If database already has some data and you want to preserve it:

```bash
cd apps/api

# 1. Create migration file manually
npx prisma migrate dev --create-only --name add_maintenance_notices

# 2. Review the generated SQL in migrations/ folder

# 3. Apply migration
npx prisma migrate dev
```

---

## Verification Steps

After applying migration:

1. **Check database:**

```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'maintenance_notices';
```

2. **Test API endpoint:**

```bash
curl http://localhost:3010/api/maintenance
```

3. **Check Prisma client:**

```bash
cd apps/api
npx prisma studio
# Navigate to MaintenanceNotice table
```

---

## Related Files

- `apps/api/prisma/schema.prisma` - Model definition (✅ exists)
- `apps/api/src/modules/maintenance/` - Service, controller, DTOs (✅ exists)
- `apps/api/prisma/migrations/` - Migration files (❌ missing)

---

## Prevention

**Best Practice:**

- Always run `npx prisma migrate dev` after adding models to schema
- Verify migration files are created in `prisma/migrations/`
- Check database tables exist before marking plan phases as complete

**CI/CD:**

- Add migration check to CI pipeline
- Verify schema matches database state

---

## Next Steps

1. ✅ **Immediate**: Run migration to create table
2. ⏳ **Verify**: Test API endpoints work
3. ⏳ **Update**: Mark migration step in plan as completed
4. ⏳ **Document**: Add migration verification to development workflow
