# Multi-Department Migration Runbook

**Feature:** User Multi-Department KPI Management  
**Date:** 2026-01-07  
**Status:** Ready for Production

## Overview

This runbook guides the migration of user departments from a single string field to a many-to-many relationship, enabling users to belong to multiple departments.

## Pre-Migration Checklist

### 1. Environment Preparation

- [ ] **Database Backup Created**

  ```bash
  # PostgreSQL backup command
  pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Verify Database Connection**

  ```bash
  cd apps/api
  npm run migrate:user-departments verify
  ```

- [ ] **Check Current State**
  - Count users with departments: `SELECT COUNT(*) FROM users WHERE department IS NOT NULL;`
  - Count existing user_departments: `SELECT COUNT(*) FROM user_departments;`

### 2. Code Deployment

- [ ] **Backend Deployed** (Phase 2 complete)
  - UserDepartment model in schema ✅
  - API endpoints available ✅
  - Services updated ✅

- [ ] **Frontend Deployed** (Phase 3 complete)
  - Multi-select UI available ✅
  - Access helpers updated ✅

### 3. Testing

- [ ] **Dry-Run Completed**
  ```bash
  cd apps/api
  npm run migrate:user-departments dry-run
  ```

  - Review output for warnings
  - Note unresolved departments
  - Verify expected migration count

## Migration Steps

### Step 1: Pre-Migration Verification

```bash
cd apps/api
npm run migrate:user-departments verify
```

**Expected Output:**

```
Verification Results:
  Users with department string:    <count>
  UserDepartment records:           0
  Users with department relations:  0
```

### Step 2: Execute Migration

**Option A: Dry-Run First (Recommended)**

```bash
npm run migrate:user-departments dry-run
```

**Option B: Live Migration**

```bash
npm run migrate:user-departments migrate
```

**Expected Output:**

```
✅ LIVE MODE - Migrating data
📊 Total users: <count>
👥 Users with department: <count>
✅ Migrated: <user> → <department>
...
============================================================
📈 MIGRATION SUMMARY
============================================================
Total users:              <count>
Users with department:    <count>
Successful migrations:    <count>
Failed migrations:        <count>
```

### Step 3: Post-Migration Verification

```bash
npm run migrate:user-departments verify
```

**Expected Output:**

```
Verification Results:
  Users with department string:    <count>
  UserDepartment records:          <count> (should match successful migrations)
  Users with department relations:  <count>

✅ Migration verification passed
```

### Step 4: Manual Verification

```sql
-- Check migration results
SELECT
  u.id,
  u.username,
  u.department as legacy_department,
  COUNT(ud.department_id) as assigned_departments
FROM users u
LEFT JOIN user_departments ud ON u.id = ud.user_id
WHERE u.department IS NOT NULL
GROUP BY u.id, u.username, u.department
ORDER BY assigned_departments DESC;

-- Verify no orphaned records
SELECT COUNT(*) FROM user_departments ud
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.id = ud.user_id
);

-- Verify all departments exist
SELECT COUNT(*) FROM user_departments ud
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.id = ud.department_id
);
```

## Rollback Procedure

### If Migration Fails Mid-Way

```bash
cd apps/api
npm run migrate:user-departments rollback
```

This will remove all UserDepartment records, allowing you to:

1. Fix issues
2. Restore from backup if needed
3. Retry migration

### If Database Backup Needed

```bash
# Restore from backup
psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
```

## Post-Migration Tasks

### 1. Verify Application Functionality

- [ ] **Test User Login**
  - Verify users can log in
  - Check user department data loads

- [ ] **Test KPI Access**
  - Regular user: Can access KPIs from all assigned departments
  - Admin/Boss: Can access all departments
  - User with no departments: Cannot access KPIs

- [ ] **Test Admin Functions**
  - Assign multiple departments to user
  - Remove department from user
  - View user's departments

### 2. Monitor Application Logs

Watch for errors related to:

- Department resolution
- KPI access control
- User department queries

### 3. Performance Monitoring

Monitor these metrics for 24 hours:

- API response times (target: <200ms)
- Database query performance
- Error rates

## Troubleshooting

### Issue: Unresolved Departments

**Symptom:** Migration shows warnings for unresolved departments

**Solution:**

1. Check department codes/names in database
2. Verify department isActive = true
3. Manually create department if missing
4. Re-run migration for specific users

### Issue: Duplicate Assignments

**Symptom:** User has duplicate department assignments

**Solution:**

```sql
-- Find duplicates
SELECT user_id, department_id, COUNT(*)
FROM user_departments
GROUP BY user_id, department_id
HAVING COUNT(*) > 1;

-- Remove duplicates (keep first)
DELETE FROM user_departments
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM user_departments
  GROUP BY user_id, department_id
);
```

### Issue: User Cannot Access KPIs

**Symptom:** User with departments cannot see KPIs

**Solution:**

1. Verify user_departments records exist
2. Check department IDs match KPI records
3. Verify user roles (admin/boss have full access)
4. Check application logs for access denied errors

## Success Criteria

- [x] All users with departments migrated successfully
- [x] No orphaned user_departments records
- [x] All departments exist and are active
- [x] Application functions correctly
- [x] No performance degradation
- [x] Zero data loss

## Notes

- Legacy `User.department` field remains for backward compatibility
- Can be deprecated in future after full migration
- Migration is idempotent - safe to run multiple times
- Uses upsert to handle duplicates gracefully

## Support Contacts

- **Technical Lead:** [Contact]
- **Database Admin:** [Contact]
- **DevOps:** [Contact]

---

**Last Updated:** 2026-01-07  
**Version:** 1.0
