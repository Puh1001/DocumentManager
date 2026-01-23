# Production Migration Checklist

**Date:** 2026-01-22  
**Plan:** `plans/260122-0747-document-optimization-realtime-sync/phase-02-database-schema-migration.md`  
**Status:** Ready for Production

---

## Pre-Migration Checklist

### 1. Database Backup ✅
- [ ] **CRITICAL:** Create full database backup before migration
- [ ] Verify backup is restorable
- [ ] Store backup in safe location
- [ ] Document backup location and timestamp

### 2. Environment Verification
- [ ] Verify production DATABASE_URL is correct
- [ ] Test database connection
- [ ] Verify Prisma Client is up to date
- [ ] Check current database schema version

### 3. Migration Files Review
- [ ] Review migration SQL: `apps/api/prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`
- [ ] Verify all IF NOT EXISTS clauses are present
- [ ] Confirm rollback script is ready (see below)

---

## Migration Steps

### Step 0: Verify Current Migration Status

```bash
# From root directory
npx ts-node apps/api/scripts/verify-migration-status.ts

# OR from apps/api directory
cd apps/api
npx ts-node scripts/verify-migration-status.ts
```

**Expected Output:**
- ✅ All columns exist → Migration applied, proceed to Step 2
- ❌ Columns missing → Migration not applied, proceed to Step 1

### Step 1: Run Prisma Migration

**If migration shows "No pending migrations" but columns don't exist:**

**Option A: Force apply migration (Recommended)**
```bash
# Navigate to API directory
cd apps/api

# Apply migration directly using SQL
npx prisma db execute --file prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql
```

**Option B: Use db push (Alternative for production)**
```bash
# This will sync schema to database
npx prisma db push --accept-data-loss
```

**Option C: Mark migration as applied then run SQL manually**
```bash
# Mark migration as applied (if schema already matches)
npx prisma migrate resolve --applied 20260122120000_add_deletion_tracking_and_requests

# Then verify with verification script
npx ts-node apps/api/scripts/verify-migration-status.ts
```

**Expected Output:**
- Migration applied successfully
- New columns added to `documents` table
- New `deletion_requests` table created
- Indexes created
- Foreign keys added

**Verification:**
```bash
# Run verification script
npx ts-node apps/api/scripts/verify-migration-status.ts
```

Or manually check with SQL:
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('uploaded_by', 'uploaded_at', 'deletion_expires_at');

-- Check if deletion_requests table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'deletion_requests';

-- Check if RequestStatus enum exists
SELECT typname 
FROM pg_type 
WHERE typname = 'RequestStatus';
```

### Step 2: Run Backfill Script

```bash
# From root directory
npx ts-node apps/api/scripts/backfill-deletion-tracking.ts

# OR from apps/api directory
cd apps/api
npx ts-node scripts/backfill-deletion-tracking.ts
```

**Expected Output:**
- Documents found and processed
- Progress updates every 100 documents
- Summary with updated/failed counts

**Verification:**
```sql
-- Check backfill results
SELECT 
  COUNT(*) as total_documents,
  COUNT(uploaded_by) as with_uploaded_by,
  COUNT(uploaded_at) as with_uploaded_at,
  COUNT(deletion_expires_at) as with_expiry
FROM documents
WHERE status = 'ACTIVE';
```

### Step 3: Create DCC Role

```bash
# From root directory
npx ts-node apps/api/prisma/seeds/create-dcc-role.ts

# OR from apps/api directory
cd apps/api
npx ts-node prisma/seeds/create-dcc-role.ts
```

**Expected Output:**
- Document module ready
- DeletionRequest module ready
- DCC role created or verified
- Permissions created and linked

**Verification:**
```sql
-- Check DCC role exists
SELECT * FROM roles WHERE name = 'dcc';

-- Check permissions linked to DCC role
SELECT 
  r.name as role_name,
  p.name as permission_name,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'dcc';
```

### Step 4: Regenerate Prisma Client

```bash
# Regenerate Prisma Client with new schema
npx prisma generate
```

**Expected Output:**
- Prisma Client regenerated successfully
- New types available for Document and DeletionRequest

---

## Post-Migration Verification

### 1. Schema Verification
- [ ] All new columns exist in `documents` table
- [ ] `deletion_requests` table exists with correct structure
- [ ] All indexes created successfully
- [ ] All foreign keys created successfully
- [ ] `RequestStatus` enum exists

### 2. Data Verification
- [ ] All active documents have `uploadedAt` populated
- [ ] All active documents have `deletionExpiresAt` calculated (uploadedAt + 72h)
- [ ] Documents with versions have `uploadedBy` from first version
- [ ] Documents without versions have `uploadedBy` as null (acceptable)

### 3. Application Verification
- [ ] Application starts without errors
- [ ] Document upload works and sets new fields
- [ ] Deletion request creation works
- [ ] DCC role users can access deletion requests
- [ ] No TypeScript compilation errors

### 4. Performance Verification
- [ ] Query performance is acceptable
- [ ] Indexes are being used (check with EXPLAIN)
- [ ] No slow queries introduced

---

## Rollback Plan

### If Migration Fails

**Option 1: Rollback SQL Script**

```sql
-- Drop deletion_requests table
DROP TABLE IF EXISTS "deletion_requests" CASCADE;

-- Drop RequestStatus enum
DROP TYPE IF EXISTS "RequestStatus";

-- Drop new indexes
DROP INDEX IF EXISTS "documents_uploaded_by_idx";
DROP INDEX IF EXISTS "documents_deletion_expires_at_idx";
DROP INDEX IF EXISTS "deletion_requests_document_id_idx";
DROP INDEX IF EXISTS "deletion_requests_requested_by_idx";
DROP INDEX IF EXISTS "deletion_requests_status_idx";
DROP INDEX IF EXISTS "deletion_requests_reviewed_by_idx";
DROP INDEX IF EXISTS "deletion_requests_status_requested_at_idx";

-- Drop foreign key constraints
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_uploaded_by_fkey";
ALTER TABLE "deletion_requests" DROP CONSTRAINT IF EXISTS "deletion_requests_document_id_fkey";
ALTER TABLE "deletion_requests" DROP CONSTRAINT IF EXISTS "deletion_requests_requested_by_fkey";
ALTER TABLE "deletion_requests" DROP CONSTRAINT IF EXISTS "deletion_requests_reviewed_by_fkey";
ALTER TABLE "deletion_requests" DROP CONSTRAINT IF EXISTS "deletion_requests_replacement_file_id_fkey";

-- Remove new columns from documents
ALTER TABLE "documents" 
DROP COLUMN IF EXISTS "uploaded_by",
DROP COLUMN IF EXISTS "uploaded_at",
DROP COLUMN IF EXISTS "deletion_expires_at";
```

**Option 2: Restore from Backup**
- Stop application
- Restore database from backup
- Verify restoration successful
- Restart application

---

## Migration Scripts Summary

### Files Required:

1. **Migration SQL:**
   - `apps/api/prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`
   - ✅ Already exists and reviewed

2. **Backfill Script:**
   - `apps/api/scripts/backfill-deletion-tracking.ts`
   - ✅ Created in this checklist

3. **DCC Role Seed:**
   - `apps/api/prisma/seeds/create-dcc-role.ts`
   - ✅ Already exists

### Execution Order:

1. **Backup database** (CRITICAL)
2. Run `npx prisma migrate deploy`
3. Run `npx ts-node apps/api/scripts/backfill-deletion-tracking.ts`
4. Run `npx ts-node apps/api/prisma/seeds/create-dcc-role.ts`
5. Run `npx prisma generate`
6. Restart application
7. Verify all checks pass

---

## Notes

- **Zero Downtime:** Migration uses `IF NOT EXISTS` clauses, safe to run multiple times
- **Backfill Time:** Depends on number of documents (estimated: < 1 minute per 10,000 documents)
- **Rollback Safe:** All new columns are nullable, existing data unaffected
- **Idempotent:** All scripts can be run multiple times safely

---

## Success Criteria

- [ ] Migration completes without errors
- [ ] All documents have deletion tracking fields populated
- [ ] DCC role exists with correct permissions
- [ ] Application functions normally
- [ ] No performance degradation
- [ ] All verification checks pass

---

## Support Contacts

- **Database Admin:** [Contact]
- **DevOps:** [Contact]
- **Backend Team:** [Contact]

---

**Last Updated:** 2026-01-22  
**Status:** Ready for Production Deployment
