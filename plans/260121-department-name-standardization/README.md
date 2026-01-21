# Department Name Standardization Plan

**Created:** 2026-01-21  
**Status:** READY FOR REVIEW  

---

## 📋 Quick Navigation

| Document | Purpose | Start Here? |
|----------|---------|-------------|
| **[summary.md](./summary.md)** | Executive overview, key insights, next steps | ✅ **YES** - Start here |
| [plan.md](./plan.md) | Detailed plan overview, decisions, timeline | 2nd read |
| [phase-01-analysis.md](./phase-01-analysis.md) | Current state analysis, mapping table | For validation |
| [phase-02-migration-scripts.md](./phase-02-migration-scripts.md) | SQL + TypeScript migration scripts | For implementation |
| [phase-03-testing-strategy.md](./phase-03-testing-strategy.md) | Unit, integration, E2E test plans | For QA team |
| [phase-04-rollback-plan.md](./phase-04-rollback-plan.md) | Rollback procedures and scripts | For emergency |
| [mapping-table.csv](./mapping-table.csv) | CSV mapping (current → new) | For import/validation |

---

## 🎯 What's Inside

### Problem Statement
Database has 45 departments with inconsistent naming. Official list has 32 departments with different code format. Need to standardize to: `"Code-Vietnamese Name"` (e.g., `"EG-Công trình"`).

### Solution Overview
- **UPDATE**: 31 departments (new codes + names)
- **CREATE**: 1 department (DCC)
- **REVIEW**: 7 departments (not in official list)
- **PROTECT**: Full backup + rollback capability

---

## ✅ All Deliverables Completed

1. ✅ **Complete mapping table** → `mapping-table.csv` (39 rows)
2. ✅ **SQL UPDATE statements** → `phase-02-migration-scripts.md`
3. ✅ **List of departments to deactivate** → `phase-01-analysis.md` (7 departments)
4. ✅ **List of departments to create** → `phase-01-analysis.md` (1 department: DCC)
5. ✅ **TypeScript migration script** → `phase-02-migration-scripts.md`
6. ✅ **Testing strategy** → `phase-03-testing-strategy.md` (unit, integration, e2e)
7. ✅ **Rollback plan** → `phase-04-rollback-plan.md` (3 strategies)

---

## 🚨 Critical Insights

### Major Code Changes
31 departments will have **NEW CODES**:
- `CONG_NGHE` → `V-Tech`
- `HCNS` → `HR`
- `KINH_DOANH` → `SD`
- `CONG_TRINH` → `EG`
- ... and 27 more

**Impact**: Folder paths may use these codes → potential breaking change  
**Mitigation**: Relations use UUID (safe), but test folder sync logic

### 7 Departments Need Decision
- `PTVL` - Phát triển vật liệu
- `PHONG_MAU` - Phòng mẫu
- `SAN_XUAT` - Sản xuất
- `DET_NGANG_S` - Dệt ngang - S
- 3 branch office departments (`CN_*`)
- `MG` - Unknown

**Recommendation**: Keep active, flag for stakeholder review

---

## 🏃 Quick Start

### For Stakeholders (Review & Approval)
1. Read `summary.md` (5 min)
2. Review `mapping-table.csv` - validate accuracy
3. Decide on 7 unmatched departments
4. Approve migration

### For Developers (Implementation)
1. Read `plan.md` (10 min)
2. Test on local: `phase-02-migration-scripts.md`
3. Run tests: `phase-03-testing-strategy.md`
4. Deploy to staging
5. Get approval, execute on production

### For DBA (Emergency Rollback)
1. Go to `phase-04-rollback-plan.md`
2. Choose rollback strategy
3. Execute rollback script
4. Verify with provided queries

---

## ⚠️ Before Running Migration

### Pre-flight Checklist
- [ ] All 7 unmatched departments reviewed
- [ ] Mapping table validated by HR
- [ ] Tested on staging successfully
- [ ] All tests passing
- [ ] Rollback script tested
- [ ] Backup verified
- [ ] Maintenance window scheduled
- [ ] Users notified

### Estimated Timeline
- Review & approval: 1 day
- Testing (local + staging): 4-8 hours
- Production migration: 1 hour
- Post-migration validation: 2 hours

**Total: ~2 days**

---

## 📊 Migration Stats

| Metric | Count |
|--------|-------|
| Total departments in DB | 45 (to verify) |
| Official departments | 32 |
| Departments to UPDATE | 31 |
| Departments to CREATE | 1 (DCC) |
| Departments to REVIEW | 7 |
| Code changes | 31 |
| Name format changes | All 45 |

---

## 🔗 Related Files

- Official department list: `apps/api/dept.txt`
- Database schema: `apps/api/prisma/schema.prisma`
- Department service: `apps/api/src/modules/department/services/department.service.ts`
- Seed data: `apps/api/prisma/seed.ts`

---

## 🆘 Emergency Contacts

During migration/rollback:
- **DBA**: [Name] - [Phone]
- **Backend Lead**: [Name] - [Phone]
- **DevOps**: [Name] - [Phone]
- **IT Manager**: [Name] - [Phone]

---

## 📝 Unresolved Questions

1. User said 45 rows in DB, but seed.ts shows 39 - query actual database
2. English name for V-Tech is empty in dept.txt - need clarification
3. Are branch office departments (CN_*) still needed? - stakeholder decision
4. Do folder paths use department codes? - verify impact

**Action**: Resolve before production migration

---

## ✨ Success Criteria

- ✅ 31 departments updated with format `Code-Vietnamese`
- ✅ 1 department created (DCC)
- ✅ No foreign key violations
- ✅ No data loss
- ✅ All tests passing
- ✅ API returns new names
- ✅ Frontend displays correctly (EN, VI, ZH)
- ✅ Rollback ready for 48 hours

---

## 📖 How to Use This Plan

### Step 1: Understanding (30 min)
1. Read `summary.md` for overview
2. Review `mapping-table.csv` to understand changes
3. Check `phase-01-analysis.md` for detailed mapping

### Step 2: Validation (1-2 hours)
1. Validate mapping accuracy with stakeholders
2. Decide on 7 unmatched departments
3. Query actual database to confirm 45 rows
4. Clarify any unresolved questions

### Step 3: Testing (4-8 hours)
1. Follow `phase-03-testing-strategy.md`
2. Run unit tests locally
3. Deploy to staging
4. Run integration and E2E tests
5. Fix any issues

### Step 4: Execution (1-2 hours)
1. Follow `phase-02-migration-scripts.md`
2. Create backup
3. Run migration script
4. Verify with provided queries
5. Monitor for issues

### Step 5: Monitoring (24-48 hours)
1. Keep rollback option ready
2. Monitor error logs
3. Track user feedback
4. Be ready to rollback if needed

---

## 🎓 Lessons for Future Migrations

1. **Always test on staging with production data clone**
2. **Prepare rollback scripts BEFORE migration**
3. **Use transactions for atomicity**
4. **Backup is non-negotiable**
5. **Monitor for 24-48 hours post-migration**
6. **Keep stakeholders informed**
7. **Document everything**

---

## 📞 Support

For questions or issues:
1. Check `summary.md` for common questions
2. Review relevant phase document
3. Contact technical lead
4. Escalate to IT Manager if critical

---

**Remember**: Conservative approach recommended. Test thoroughly, backup everything, keep rollback ready. Better safe than sorry! 🛡️
