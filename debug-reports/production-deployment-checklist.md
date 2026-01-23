# Production Deployment Checklist - Document Optimization & Deletion Tracking

**Date:** 2026-01-22  
**Plan:** `plans/260122-0747-document-optimization-realtime-sync`  
**Status:** 📋 **DEPLOYMENT READY**

---

## Summary

Cần chạy migration và scripts trước khi deploy lên production.

---

## Database Changes Required

### 1. Schema Changes

**New Fields in `documents` table:**
- `uploaded_by` (TEXT, nullable) - User ID who uploaded the document
- `uploaded_at` (TIMESTAMP, nullable) - Upload timestamp  
- `deletion_expires_at` (TIMESTAMP, nullable) - Expiry date for self-deletion (uploadedAt + 72h)

**New Table: `deletion_requests`**
- Full table with all fields for deletion request tracking
- Relations to `documents`, `users` (requester, reviewer)

**New Enum: `RequestStatus`**
- Values: `PENDING`, `APPROVED`, `REJECTED`

### 2. Migration Status

**Current State:**
- ✅ All existing migrations applied
- ❌ **Missing migration for DeletionRequest table and new Document fields**

**Action Required:**
- Create new migration for schema changes
- Run migration on production database

---

## Deployment Steps

### Step 1: Create Migration

**Option A: Migration file đã được tạo sẵn**
- File: `apps/api/prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`
- Migration đã được tạo với các thay đổi cần thiết

**Option B: Tạo migration mới (nếu cần)**
```bash
cd apps/api

# Generate migration from schema changes
npx prisma migrate dev --name add_deletion_tracking_and_requests

# Review generated migration file
# Location: prisma/migrations/YYYYMMDDHHMMSS_add_deletion_tracking_and_requests/migration.sql
```

**Note:** Migration file đã được tạo sẵn tại:
`apps/api/prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`

**Expected Migration SQL:**
```sql
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable (add new columns to documents)
ALTER TABLE "documents" ADD COLUMN "uploaded_by" TEXT;
ALTER TABLE "documents" ADD COLUMN "uploaded_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "documents" ADD COLUMN "deletion_expires_at" TIMESTAMP(3);

-- CreateTable (deletion_requests)
CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL UNIQUE,
    "requested_by" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "replacement_file_id" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deletion_requests_document_id_idx" ON "deletion_requests"("document_id");
CREATE INDEX "deletion_requests_requested_by_idx" ON "deletion_requests"("requested_by");
CREATE INDEX "deletion_requests_status_idx" ON "deletion_requests"("status");
CREATE INDEX "deletion_requests_reviewed_by_idx" ON "deletion_requests"("reviewed_by");
CREATE INDEX "deletion_requests_status_requested_at_idx" ON "deletion_requests"("status", "requested_at");
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by");
CREATE INDEX "documents_deletion_expires_at_idx" ON "documents"("deletion_expires_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" 
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_document_id_fkey" 
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_requested_by_fkey" 
    FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_reviewed_by_fkey" 
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_replacement_file_id_fkey" 
    FOREIGN KEY ("replacement_file_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Step 2: Test Migration on Staging

```bash
# Apply migration to staging database
npx prisma migrate deploy

# Verify migration
npx prisma studio  # Check tables and columns
```

### Step 3: Run Backfill Script

**Purpose:** Populate `uploaded_by`, `uploaded_at`, `deletion_expires_at` for existing documents

**⚠️ IMPORTANT: Migration must be applied FIRST!**

```bash
# Verify migration is applied
npx prisma migrate status

# Run backfill script (will check migration first)
npx ts-node apps/api/scripts/backfill-deletion-tracking.ts

# Expected output:
# Starting deletion tracking backfill...
# Found X documents to backfill
# Progress: 100/X documents updated
# Backfill complete: X updated, 0 failed
```

**What it does:**
- Finds documents without `uploaded_by`
- Sets `uploaded_by` from first document version's `created_by`
- Sets `uploaded_at` from first version's `created_at` or document's `created_at`
- Calculates `deletion_expires_at` = `uploaded_at` + 72 hours

**Note:** This script is **idempotent** - safe to run multiple times (only updates documents where `uploaded_by` is null)

### Step 4: Create DCC Role

**Purpose:** Create DCC role and permissions for deletion request management

```bash
# Run DCC role seed script
npx ts-node apps/api/prisma/seeds/create-dcc-role.ts

# Expected output:
# 🌱 Creating DCC role and permissions...
# ✅ Document module ready
# ✅ DeletionRequest module ready
# ✅ Role "dcc" created
#    ✓ Created permission: delete:Document
#    ✓ Created permission: view:DeletionRequest
#    ✓ Created permission: manage:DeletionRequest
#    ✓ Linked: delete:Document → dcc role
#    ✓ Linked: view:DeletionRequest → dcc role
#    ✓ Linked: manage:DeletionRequest → dcc role
# ✅ DCC role setup complete!
```

**What it does:**
- Creates/updates `Document` and `DeletionRequest` modules
- Creates `dcc` role if not exists
- Creates permissions: `delete:Document`, `view:DeletionRequest`, `manage:DeletionRequest`
- Links permissions to DCC role

**Note:** This script is **idempotent** - safe to run multiple times (uses upsert)

### Step 5: Deploy to Production

**Order of Operations (CRITICAL):**

1. **Backup Production Database**
   ```bash
   pg_dump -h <prod-db-host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migration (Zero Downtime)**
   ```bash
   # Migration adds nullable columns - backward compatible
   npx prisma migrate deploy
   
   # Verify migration applied
   npx prisma migrate status
   ```

3. **Run Backfill Script (Background)**
   ```bash
   # ⚠️ MUST run after migration!
   # Script will check migration first and fail gracefully if not applied
   npx ts-node apps/api/scripts/backfill-deletion-tracking.ts
   ```

4. **Run DCC Role Seed**
   ```bash
   npx ts-node apps/api/prisma/seeds/create-dcc-role.ts
   ```

5. **Deploy Backend Code**
   ```bash
   npm run build
   npm run deploy:production
   ```

6. **Deploy Frontend Code**
   ```bash
   cd apps/web
   npm run build
   npm run deploy:production
   ```

---

## Scripts Summary

### 1. `apps/api/scripts/backfill-deletion-tracking.ts`

**Purpose:** Backfill deletion tracking fields for existing documents

**When to run:**
- ✅ After migration (to populate existing documents)
- ✅ Safe to run multiple times (idempotent)

**What it does:**
- Finds documents with `uploaded_by = null`
- Sets `uploaded_by` from first document version
- Sets `uploaded_at` from version or document creation date
- Calculates `deletion_expires_at` = `uploaded_at` + 72 hours

**Impact:**
- Updates existing documents to enable deletion tracking
- Non-blocking (can run in background)

### 2. `apps/api/prisma/seeds/create-dcc-role.ts`

**Purpose:** Create DCC role and permissions

**When to run:**
- ✅ After migration (needs DeletionRequest module)
- ✅ Before assigning DCC role to users
- ✅ Safe to run multiple times (idempotent)

**What it does:**
- Creates `Document` and `DeletionRequest` modules
- Creates `dcc` role
- Creates and links permissions:
  - `delete:Document` - Delete any document
  - `view:DeletionRequest` - View deletion requests
  - `manage:DeletionRequest` - Approve/reject requests

**Impact:**
- Enables DCC functionality
- Required for DCC users to access deletion requests page

---

## Verification Steps

### After Migration

```sql
-- Verify deletion_requests table exists
SELECT COUNT(*) FROM deletion_requests;

-- Verify new columns in documents table
SELECT 
    COUNT(*) as total,
    COUNT(uploaded_by) as with_uploader,
    COUNT(uploaded_at) as with_upload_date,
    COUNT(deletion_expires_at) as with_expiry
FROM documents;

-- Verify indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('documents', 'deletion_requests');
```

### After Backfill

```sql
-- Check backfill progress
SELECT 
    COUNT(*) as total_documents,
    COUNT(uploaded_by) as with_uploader,
    COUNT(CASE WHEN uploaded_by IS NULL THEN 1 END) as missing_uploader
FROM documents
WHERE status = 'ACTIVE';
```

### After DCC Role Seed

```sql
-- Verify DCC role exists
SELECT * FROM roles WHERE name = 'dcc';

-- Verify permissions linked
SELECT 
    r.name as role_name,
    p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'dcc';
```

---

## Rollback Plan

### If Migration Fails

```bash
# Restore from backup
psql -h <prod-db-host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
```

### If Backfill Fails

- Backfill script is non-destructive
- Can re-run after fixing issues
- Only updates documents where `uploaded_by IS NULL`

### If DCC Role Seed Fails

- Seed script is idempotent
- Can re-run after fixing issues
- Uses upsert operations

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Review migration SQL
- [ ] Test migration on staging
- [ ] Backup production database
- [ ] Verify rollback plan
- [ ] Schedule maintenance window (if needed)

### Deployment

- [ ] Run database migration (`prisma migrate deploy`)
- [ ] Verify migration success
- [ ] Run backfill script (`backfill-deletion-tracking.ts`)
- [ ] Verify backfill progress
- [ ] Run DCC role seed (`create-dcc-role.ts`)
- [ ] Verify DCC role and permissions
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Verify health checks

### Post-Deployment

- [ ] Test deletion workflow
- [ ] Test DCC review page
- [ ] Verify real-time sync
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify WebSocket connections

---

## Important Notes

1. **Migration is backward compatible:**
   - New columns are nullable
   - Existing code continues to work
   - No breaking changes

2. **Backfill can run in background:**
   - Non-blocking operation
   - Safe to run during business hours
   - Can take time for large document sets

3. **DCC role seed is required:**
   - Without DCC role, deletion requests cannot be reviewed
   - Must run before assigning DCC role to users

4. **Order matters:**
   - Migration → Backfill → DCC Seed → Deploy Code
   - Don't skip steps

---

## Quick Answer

**Có, cần chạy migration và 2 scripts:**

1. ✅ **Migration:** Tạo migration cho DeletionRequest table và các field mới
2. ✅ **Backfill Script:** `apps/api/scripts/backfill-deletion-tracking.ts` - Backfill data cho documents cũ
3. ✅ **DCC Role Seed:** `apps/api/prisma/seeds/create-dcc-role.ts` - Tạo DCC role và permissions

---

## Status

✅ **READY FOR PRODUCTION**

**Required Actions:**
1. ✅ Migration file đã được tạo: `prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql`
2. ⚠️ **Cần chạy migration trên production:** `npx prisma migrate deploy`
3. ⚠️ **Cần chạy backfill script:** `npx ts-node apps/api/scripts/backfill-deletion-tracking.ts`
4. ⚠️ **Cần chạy DCC role seed:** `npx ts-node apps/api/prisma/seeds/create-dcc-role.ts`
5. ⚠️ **Deploy code:** Backend và frontend

**Estimated Time:**
- Migration: 1-2 minutes
- Backfill: 5-30 minutes (depends on document count)
- DCC Seed: < 1 minute
- Code Deploy: 5-10 minutes

**Total: ~15-45 minutes**

---

## Production Deployment Commands

```bash
# 1. Backup database (CRITICAL!)
pg_dump -h <prod-db-host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
cd apps/api
npx prisma migrate deploy

# 3. Run backfill (can run in background)
npx ts-node scripts/backfill-deletion-tracking.ts

# 4. Run DCC role seed
npx ts-node prisma/seeds/create-dcc-role.ts

# 5. Deploy backend
npm run build
npm run deploy:production

# 6. Deploy frontend
cd ../web
npm run build
npm run deploy:production
```
