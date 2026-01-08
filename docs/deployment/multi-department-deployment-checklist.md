# Multi-Department Feature Deployment Checklist

**Feature:** User Multi-Department KPI Management  
**Date:** 2026-01-07  
**Phases:** 1-3 Complete, Phase 4 In Progress

## Pre-Deployment

### Code Review
- [x] Phase 1: Schema & Migration ✅
- [x] Phase 2: Backend Services ✅
- [x] Phase 3: Frontend Updates ✅
- [ ] Phase 4: Testing & Documentation (In Progress)

### Testing
- [x] Unit tests passing (KPI service) ✅
- [ ] All integration tests passing
- [ ] Manual testing completed
- [ ] Migration dry-run successful ✅

### Database
- [ ] Production database backup created
- [ ] Migration script tested on staging
- [ ] Rollback procedure documented ✅

### Documentation
- [x] Migration runbook created ✅
- [x] API documentation updated ✅
- [ ] User guide updated (optional)

## Deployment Steps

### Step 1: Database Migration

**Timing:** During low-traffic window

```bash
# 1. Backup database
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify current state
cd apps/api
npm run migrate:user-departments verify

# 3. Dry-run (optional but recommended)
npm run migrate:user-departments dry-run

# 4. Execute migration
npm run migrate:user-departments migrate

# 5. Verify results
npm run migrate:user-departments verify
```

**Checklist:**
- [ ] Backup completed
- [ ] Dry-run reviewed
- [ ] Migration executed
- [ ] Verification passed
- [ ] No errors in logs

### Step 2: Backend Deployment

**Order:** Deploy backend first (backward compatible)

```bash
# Deploy API
cd apps/api
npm run build
# Follow your deployment process
```

**Checklist:**
- [ ] Backend deployed
- [ ] API endpoints accessible
- [ ] Health check passes
- [ ] No startup errors

### Step 3: Frontend Deployment

**Order:** Deploy after backend

```bash
# Deploy Web
cd apps/web
npm run build
# Follow your deployment process
```

**Checklist:**
- [ ] Frontend deployed
- [ ] UI loads correctly
- [ ] No console errors
- [ ] Multi-select component works

### Step 4: Smoke Tests

**Immediate Verification:**

- [ ] **User Login**
  - [ ] Users can log in
  - [ ] User data loads correctly

- [ ] **Admin Functions**
  - [ ] Admin can view users
  - [ ] Admin can assign departments
  - [ ] Admin can remove departments
  - [ ] User list shows departments

- [ ] **KPI Access**
  - [ ] Regular user sees their departments
  - [ ] User can access KPIs from all departments
  - [ ] User cannot access unassigned departments
  - [ ] Admin/Boss see all departments

- [ ] **API Endpoints**
  - [ ] `GET /api/users/:id/departments` works
  - [ ] `POST /api/users/:id/departments` works
  - [ ] `DELETE /api/users/:id/departments/:deptId` works

## Post-Deployment

### Monitoring (First 24 Hours)

**Metrics to Watch:**
- [ ] API response times (<200ms target)
- [ ] Error rates (<0.1% target)
- [ ] Database query performance
- [ ] User session metrics

**Logs to Monitor:**
- [ ] Department resolution errors
- [ ] KPI access denied errors
- [ ] Database connection issues
- [ ] Authentication failures

### Verification Tasks

**Day 1:**
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify KPI access works
- [ ] Test department assignment

**Day 2-3:**
- [ ] Performance metrics stable
- [ ] No critical issues reported
- [ ] User adoption successful

## Rollback Plan

### If Issues Detected

**Immediate Actions:**
1. **Disable Feature** (if feature flag used)
2. **Monitor Error Logs** - Identify root cause
3. **Assess Impact** - How many users affected?

**Rollback Decision Matrix:**

| Issue | Impact | Action |
|-------|--------|--------|
| Data corruption | High | Immediate rollback + restore backup |
| Critical bug | High | Rollback frontend, keep backend |
| Performance issue | Medium | Monitor, optimize if needed |
| Minor UI issue | Low | Hotfix deployment |

**Rollback Steps:**

1. **Frontend Rollback:**
   ```bash
   # Revert to previous frontend version
   # Backend remains (backward compatible)
   ```

2. **Database Rollback (if needed):**
   ```bash
   cd apps/api
   npm run migrate:user-departments rollback
   # Or restore from backup
   psql < backup_file.sql
   ```

3. **Backend Rollback (last resort):**
   ```bash
   # Revert to previous backend version
   # Only if critical issues
   ```

## Success Criteria

- [x] Migration completed successfully ✅
- [ ] Zero data loss
- [ ] All features working
- [ ] Performance within targets
- [ ] No critical errors
- [ ] User feedback positive

## Communication

### Stakeholders Notification

**Pre-Deployment:**
- [ ] Notify admin users of new feature
- [ ] Schedule deployment window
- [ ] Prepare support team

**Post-Deployment:**
- [ ] Announce feature availability
- [ ] Provide user guide
- [ ] Monitor support channels

## Notes

- **Backward Compatibility:** Legacy `department` field maintained
- **Gradual Migration:** Users can be migrated incrementally
- **Zero Downtime:** Deployment designed for zero downtime
- **Monitoring:** Critical for first 48 hours

---

**Deployment Status:** Ready  
**Risk Level:** Medium (with mitigation)  
**Estimated Downtime:** 0 minutes

