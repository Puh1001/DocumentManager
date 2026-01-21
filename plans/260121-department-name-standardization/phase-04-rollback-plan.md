# Phase 4: Rollback Plan

**Status:** DRAFT  
**Dependencies:** Migration completed, issues detected  

---

## Rollback Overview

### When to Rollback

**CRITICAL** - Immediate rollback required:
- Foreign key constraint violations detected
- Data loss or corruption occurred
- Production system is down or unstable
- KPI records no longer accessible
- More than 10% of API requests failing

**MEDIUM** - Consider rollback:
- Frontend display issues affecting users
- Performance degradation > 50%
- Incorrect department mappings discovered
- Unmatched departments accidentally deactivated

**LOW** - Fix forward instead of rollback:
- Minor display issues in UI
- Translation errors
- Cosmetic formatting problems

---

## Rollback Strategies

### Strategy 1: Database Restore (Fastest)

**Use when:** Critical data corruption, complete system failure  
**Time:** 5-10 minutes  
**Risk:** Lose all changes since migration

```bash
# 1. Stop application
docker-compose down

# 2. Restore from backup
pg_restore -U postgres -d iso_docs -c backup_before_dept_migration_20260121.backup

# 3. Verify restore
psql -U postgres -d iso_docs -c "SELECT COUNT(*) FROM departments;"
psql -U postgres -d iso_docs -c "SELECT code, name FROM departments WHERE code = 'CONG_NGHE';"

# 4. Restart application
docker-compose up -d
```

**Pros:**
- Fastest rollback method
- Guaranteed data integrity
- Restores exact state before migration

**Cons:**
- Lose ALL data changes since migration (KPI updates, new records, etc.)
- Requires application downtime
- Need to re-apply any post-migration changes manually

---

### Strategy 2: SQL Rollback Script (Recommended)

**Use when:** Migration logic errors, incorrect mappings  
**Time:** 2-5 minutes  
**Risk:** Low if backup table exists

#### Rollback SQL Script

```sql
-- =======================
-- DEPARTMENT ROLLBACK SCRIPT
-- =======================

BEGIN;

-- Step 1: Verify backup exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'departments_backup_20260121'
  ) THEN
    RAISE EXCEPTION 'Backup table not found! Cannot rollback.';
  END IF;
END $$;

-- Step 2: Delete DCC if it was created by migration
DELETE FROM departments 
WHERE code = 'DCC' 
AND created_at > '2026-01-21'::date;

-- Step 3: Restore original data from backup
-- Method A: Update existing records
UPDATE departments d
SET 
  code = b.code,
  name = b.name,
  name_en = b.name_en,
  name_vi = b.name_vi,
  name_zh = b.name_zh,
  is_active = b.is_active,
  updated_at = NOW()
FROM departments_backup_20260121 b
WHERE d.id = b.id;

-- Verify rollback count
SELECT 'Rollback verification:' as status;
SELECT 
  COUNT(*) as reverted_count 
FROM departments 
WHERE updated_at > NOW() - INTERVAL '1 minute';

-- Step 4: Verify specific departments restored
SELECT code, name FROM departments WHERE code IN (
  'CONG_NGHE',  -- Should be restored (was V-Tech)
  'HCNS',       -- Should be restored (was HR)
  'KINH_DOANH', -- Should be restored (was SD)
  'CONG_TRINH'  -- Should be restored (was EG)
);

-- COMMIT if verification passes, otherwise ROLLBACK
-- Manual decision required!
-- COMMIT;
-- ROLLBACK;
```

**Execution:**

```bash
# 1. Save script to file
cat > rollback_dept_migration.sql << 'EOF'
[paste script above]
EOF

# 2. Run rollback (review output before committing!)
psql -U postgres -d iso_docs -f rollback_dept_migration.sql

# 3. If verification looks good, manually COMMIT
psql -U postgres -d iso_docs -c "COMMIT;"

# 4. Restart application to clear caches
docker-compose restart api web
```

---

### Strategy 3: TypeScript Rollback Script

**Use when:** Need programmatic rollback with logging  
**Time:** 3-5 minutes  
**Risk:** Low

**File:** `apps/api/prisma/rollback-department-names.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollback() {
  console.log('🔄 Starting department rollback...');

  try {
    // Step 1: Verify backup exists
    console.log('\n📦 Step 1: Verifying backup...');
    const backupExists = await prisma.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'departments_backup_20260121'
      );
    `);

    if (!backupExists[0].exists) {
      throw new Error('❌ Backup table not found! Cannot rollback.');
    }
    console.log('✅ Backup table found');

    // Step 2: Get backup data
    console.log('\n📊 Step 2: Loading backup data...');
    const backupData = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM departments_backup_20260121;
    `);
    console.log(`✅ Loaded ${backupData.length} records from backup`);

    // Step 3: Restore each department
    console.log('\n🔧 Step 3: Restoring departments...');
    let restoredCount = 0;
    let errorCount = 0;

    for (const backup of backupData) {
      try {
        await prisma.department.update({
          where: { id: backup.id },
          data: {
            code: backup.code,
            name: backup.name,
            nameEn: backup.name_en,
            nameVi: backup.name_vi,
            nameZh: backup.name_zh,
            isActive: backup.is_active,
            updatedAt: new Date(),
          },
        });
        restoredCount++;
        console.log(`  ✅ Restored: ${backup.code}`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to restore ${backup.code}:`, error);
      }
    }

    console.log(`\n✅ Restored ${restoredCount} departments`);
    if (errorCount > 0) {
      console.warn(`⚠️  ${errorCount} errors occurred`);
    }

    // Step 4: Delete DCC if created by migration
    console.log('\n🗑️  Step 4: Removing DCC if created by migration...');
    const dccDeleted = await prisma.department.deleteMany({
      where: {
        code: 'DCC',
        createdAt: {
          gte: new Date('2026-01-21'),
        },
      },
    });
    if (dccDeleted.count > 0) {
      console.log('✅ Removed DCC department');
    } else {
      console.log('ℹ️  DCC not found or existed before migration');
    }

    // Step 5: Verification
    console.log('\n✅ Step 5: Verification...');
    const restoredDepts = await prisma.department.findMany({
      where: {
        code: {
          in: ['CONG_NGHE', 'HCNS', 'KINH_DOANH', 'CONG_TRINH'],
        },
      },
      select: { code: true, name: true },
    });

    console.log('Sample restored departments:');
    restoredDepts.forEach(dept => {
      console.log(`  ${dept.code}: ${dept.name}`);
    });

    console.log('\n🎉 Rollback completed successfully!');
    console.log('\n⚠️  Remember to restart the application to clear caches.');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    throw error;
  }
}

rollback()
  .catch((e) => {
    console.error('❌ Rollback script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Execution:**

```bash
# 1. Run rollback script
cd apps/api
npx ts-node prisma/rollback-department-names.ts

# 2. Verify rollback
psql -U postgres -d iso_docs -c "SELECT code, name FROM departments WHERE code IN ('CONG_NGHE', 'HCNS');"

# 3. Restart application
docker-compose restart api web

# 4. Test API
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/departments | jq '.[] | select(.code=="CONG_NGHE")'
```

---

## Post-Rollback Verification

### Checklist

- [ ] All departments restored to original codes
- [ ] Department count matches backup count
- [ ] KPI records still linked correctly
- [ ] Folders still linked correctly
- [ ] Maintenance notices still linked correctly
- [ ] User-department mappings still intact
- [ ] API returns old department names
- [ ] Frontend displays old department names
- [ ] No foreign key constraint violations
- [ ] Application is stable and responsive

### Verification Queries

```sql
-- 1. Check department count
SELECT 
  (SELECT COUNT(*) FROM departments) as current_count,
  (SELECT COUNT(*) FROM departments_backup_20260121) as backup_count;

-- 2. Verify specific departments restored
SELECT code, name, name_vi 
FROM departments 
WHERE code IN ('CONG_NGHE', 'HCNS', 'KINH_DOANH', 'CONG_TRINH')
ORDER BY code;

-- Expected:
-- CONG_NGHE | Công nghệ | Công nghệ
-- CONG_TRINH | Công trình | Công trình
-- HCNS | HCNS | HCNS
-- KINH_DOANH | Kinh doanh | Kinh doanh

-- 3. Check foreign key integrity
SELECT 
  'KPI Records' as relation,
  COUNT(*) as count,
  COUNT(DISTINCT department_id) as unique_depts
FROM kpi_records
UNION ALL
SELECT 
  'Folders',
  COUNT(*),
  COUNT(DISTINCT department_id)
FROM folders
WHERE department_id IS NOT NULL
UNION ALL
SELECT 
  'Maintenance Notices',
  COUNT(*),
  COUNT(DISTINCT department_id)
FROM maintenance_notices
WHERE department_id IS NOT NULL;

-- 4. Check for orphaned records (should be 0)
SELECT 'Orphaned KPI Records' as issue, COUNT(*) as count
FROM kpi_records k
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = k.department_id)
UNION ALL
SELECT 'Orphaned Folders', COUNT(*)
FROM folders f
WHERE f.department_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = f.department_id);
```

---

## Partial Rollback

### Scenario: Roll back only specific departments

If migration worked for most departments but a few have issues:

```sql
BEGIN;

-- Rollback only specific departments
UPDATE departments d
SET 
  code = b.code,
  name = b.name,
  name_en = b.name_en,
  name_vi = b.name_vi,
  name_zh = b.name_zh,
  updated_at = NOW()
FROM departments_backup_20260121 b
WHERE d.id = b.id
AND b.code IN (
  'CONG_NGHE',  -- Issues with V-Tech
  'QC_DAI'      -- Issues with QC(E)
);

-- Verify
SELECT code, name FROM departments WHERE code IN ('CONG_NGHE', 'QC_DAI');

COMMIT;
```

---

## Reactivate Deactivated Departments

If migration accidentally deactivated departments:

```sql
-- Find deactivated departments
SELECT code, name, is_active 
FROM departments 
WHERE is_active = false
AND code NOT IN (SELECT code FROM departments_backup_20260121 WHERE is_active = false);

-- Reactivate them
UPDATE departments
SET is_active = true, updated_at = NOW()
WHERE is_active = false
AND id IN (
  SELECT d.id FROM departments d
  JOIN departments_backup_20260121 b ON d.id = b.id
  WHERE b.is_active = true AND d.is_active = false
);
```

---

## Communication Plan

### During Rollback

**To Users:**
```
🚨 MAINTENANCE ALERT 🚨

We are experiencing issues with the recent department name update. 
The system is being restored to the previous state.

Expected downtime: 5-10 minutes
Status: In progress
Updates: [status page URL]
```

**To Stakeholders:**
```
Subject: Department Migration Rollback - [Timestamp]

We detected [issue description] after the department name migration.
To ensure data integrity, we are rolling back to the pre-migration state.

Impact:
- Application downtime: 5-10 minutes
- All department names will revert to previous format
- No data loss expected

Current status: Rollback in progress
ETA: [time]
```

### After Rollback

**To Users:**
```
✅ SYSTEM RESTORED

The system has been restored to normal operation.
Department names are back to the previous format.

Thank you for your patience.
```

**To Stakeholders:**
```
Subject: Department Migration Rollback Complete

The rollback has been completed successfully.

Summary:
- Rollback completed at: [timestamp]
- All departments restored to original state
- No data loss detected
- System is stable

Next steps:
1. Investigate root cause
2. Fix issues
3. Reschedule migration
```

---

## Root Cause Analysis (Post-Rollback)

### Investigation Steps

1. **Review logs**
```bash
# Check API logs for errors
docker logs documentsmanager-api-1 --since 1h | grep -i error

# Check database logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

2. **Identify failed operations**
```sql
-- Check recent department updates
SELECT * FROM departments 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Check audit logs (if exists)
SELECT * FROM audit_logs 
WHERE resource_type = 'Department' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

3. **Analyze test results**
- Review failed test cases
- Check error messages
- Identify patterns

4. **Document findings**
- What went wrong?
- Why did it happen?
- How to prevent in future?

---

## Prevention for Future Migrations

### Pre-migration Checklist
- [ ] Test on staging with production data clone
- [ ] Run all unit/integration/e2e tests
- [ ] Get stakeholder approval
- [ ] Schedule during low-traffic period
- [ ] Notify users in advance
- [ ] Prepare rollback scripts BEFORE migration
- [ ] Have DBA on standby

### During Migration
- [ ] Monitor application metrics (response time, error rate)
- [ ] Watch database connection pool
- [ ] Check API logs in real-time
- [ ] Verify each step before proceeding
- [ ] Keep backup easily accessible

### Post-migration
- [ ] Run smoke tests immediately
- [ ] Monitor for 24 hours
- [ ] Keep rollback option ready for 48 hours
- [ ] Gather user feedback
- [ ] Document lessons learned

---

## Rollback Decision Matrix

| Issue | Severity | Rollback? | Action |
|-------|----------|-----------|--------|
| Foreign key violations | CRITICAL | **YES** - Immediate | Full database restore |
| Data loss detected | CRITICAL | **YES** - Immediate | Full database restore |
| Production down | CRITICAL | **YES** - Immediate | Full database restore |
| KPI inaccessible | HIGH | **YES** - Within 1 hour | SQL rollback script |
| API errors > 10% | HIGH | **YES** - Within 1 hour | SQL rollback script |
| Frontend display issues | MEDIUM | **MAYBE** - Evaluate impact | Fix forward if minor |
| Performance degradation | MEDIUM | **MAYBE** - Monitor | Fix forward if < 50% |
| Translation errors | LOW | **NO** | Fix forward |
| Cosmetic issues | LOW | **NO** | Fix forward |

---

## Contacts

**Emergency Contacts** (during migration/rollback):
- **DBA**: [Name] - [Phone]
- **Backend Lead**: [Name] - [Phone]
- **DevOps**: [Name] - [Phone]
- **IT Manager**: [Name] - [Phone]

**Escalation Path**:
1. DBA/Backend Lead → Fix within 30 min
2. IT Manager → Decision on rollback
3. CTO → Approve full restore if needed

---

## Appendix: Quick Rollback Commands

```bash
# OPTION 1: Full database restore (fastest)
docker-compose down
pg_restore -U postgres -d iso_docs -c backup_before_dept_migration_20260121.backup
docker-compose up -d

# OPTION 2: SQL rollback script
psql -U postgres -d iso_docs -f rollback_dept_migration.sql

# OPTION 3: TypeScript rollback script
cd apps/api && npx ts-node prisma/rollback-department-names.ts

# Verify rollback
psql -U postgres -d iso_docs -c "SELECT code, name FROM departments WHERE code IN ('CONG_NGHE', 'HCNS');"

# Restart application
docker-compose restart

# Clear Redis cache (if applicable)
docker-compose exec redis redis-cli FLUSHALL
```

---

## Success Criteria (Post-Rollback)

- ✅ All departments restored to original codes and names
- ✅ No foreign key constraint violations
- ✅ No orphaned records
- ✅ API returning correct data
- ✅ Frontend displaying correctly
- ✅ KPI records accessible
- ✅ Folders accessible
- ✅ Application stable for 24+ hours
- ✅ No increase in error logs
- ✅ User complaints resolved
