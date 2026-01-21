# Department Name Standardization - Summary

**Plan Created:** 2026-01-21  
**Status:** READY FOR REVIEW  
**Estimated Effort:** 2 days (including approval)  

---

## Executive Summary

Create comprehensive plan to standardize 45 department records to match official dept.txt (32 departments) with format: `"Code-Vietnamese Name"`.

**Problem**: Database has 45 departments with inconsistent naming (some English, some Vietnamese, mixed format). Official list has 32 departments with different codes.

**Solution**: Update 31 departments, create 1 missing (DCC), review 7 unmatched departments, with full testing and rollback capability.

---

## Key Deliverables

All requested deliverables completed:

### 1. Complete Mapping Table ✅
**File:** `mapping-table.csv` (39 rows)
- 31 departments to UPDATE
- 1 department to CREATE (DCC)
- 7 departments to REVIEW (not in official list)
- Includes current code, new code, names in all languages

### 2. SQL UPDATE Statements ✅
**File:** `phase-02-migration-scripts.md` → SQL Scripts Section
- 31 individual UPDATE statements
- Wrapped in transaction for safety
- Includes verification queries

### 3. List of Departments to Deactivate ✅
**File:** `phase-01-analysis.md` → "Unmatched Departments" Section
- 7 departments NOT in official list
- Script to check references before deactivation
- Recommendation: Keep active until manual review complete

### 4. List of Departments to Create ✅
**File:** `phase-01-analysis.md` → "Missing from DB" Section
- 1 department: DCC (Document Control Center - Kiểm soát văn kiện)
- CREATE statement provided in migration scripts

### 5. TypeScript Migration Script ✅
**File:** `phase-02-migration-scripts.md` → TypeScript Migration Script
- Complete script with error handling
- Backup creation before migration
- Step-by-step execution with logging
- Analysis of unmatched departments

### 6. Testing Strategy ✅
**File:** `phase-03-testing-strategy.md` (3 types of tests)
- **Unit tests**: DepartmentService tests
- **Integration tests**: API, KPI-Department, Folder-Department relations
- **E2E tests**: Frontend display, dropdowns, i18n
- Performance testing, manual testing checklist
- Test execution plan (local → staging → production)

### 7. Rollback Plan ✅
**File:** `phase-04-rollback-plan.md` (3 rollback strategies)
- **Strategy 1**: Full database restore (fastest)
- **Strategy 2**: SQL rollback script (recommended)
- **Strategy 3**: TypeScript rollback script
- Verification queries, communication plan, decision matrix

---

## Critical Insights

### Major Code Changes (Breaking)
- 31 departments will have **NEW CODES** (e.g., `CONG_NGHE` → `V-Tech`)
- **Impact**: Folder paths may use these codes → potential breaking change
- **Mitigation**: Since FK uses UUID `id` (not code), relations won't break
  - BUT folder sync logic may need updates

### 7 Departments Need Decision
| Code | Name | Status |
|------|------|--------|
| PTVL | Phát triển vật liệu | NOT in official list |
| PHONG_MAU | Phòng mẫu | NOT in official list |
| SAN_XUAT | Sản xuất | NOT in official list |
| DET_NGANG_S | Dệt ngang - S | Sub-department? |
| CN_HUNG_YEN_DET_NGANG | Chi nhánh Hưng Yên - Dệt ngang | Branch office |
| CN_NGHE_AN_2_DET_NGANG | Chi nhánh Nghệ An 2 - Dệt ngang | Branch office |
| CN_HUNG_YEN_DET_DAI | Chi nhánh Hưng Yên - Dệt đai | Branch office |
| MG | MG | Unknown |

**Recommendation**: Keep active, flag for manual review by stakeholders.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Code change breaks folder paths | HIGH | Test folder sync after migration |
| FK constraint violations | HIGH | Use transactions, test on staging |
| KPI data becomes inaccessible | CRITICAL | Full backup + rollback script ready |
| User confusion from name changes | MEDIUM | Communication plan, user training |

---

## New Department Name Format

**Before:**
```
code: "CONG_TRINH"
name: "Công trình"
nameEn: "Engineering Department"
nameVi: "Công trình"
```

**After:**
```
code: "EG"
name: "EG-Công trình"
nameEn: "Engineering Dept."
nameVi: "Công trình"
```

---

## Execution Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Stakeholder Review | 4-8 hours | Review mapping, approve unmatched depts |
| Testing (Local) | 2-4 hours | Run all tests, fix issues |
| Testing (Staging) | 2-4 hours | Real data testing |
| Approval | 1 day | Get sign-off from IT, HR, Boss |
| Production Migration | 1 hour | During maintenance window |
| Post-migration Validation | 2 hours | Verify data integrity |

**Total:** ~2 days (including approval time)

---

## Next Steps (Priority Order)

1. **Review mapping table** (`mapping-table.csv`) - validate accuracy
2. **Decide on 7 unmatched departments** - keep, deactivate, or merge?
3. **Clarify English name for V-Tech** - currently empty in dept.txt
4. **Query actual database** - confirm 45 rows (seed.ts shows 39)
5. **Test migration on staging** - run all scripts and tests
6. **Get stakeholder approval** - IT Manager, HR, Boss
7. **Schedule maintenance window** - low-traffic period
8. **Execute migration** - with DBA on standby
9. **Monitor for 24-48 hours** - keep rollback option ready

---

## Approval Checklist

Before proceeding to production:

- [ ] All 7 unmatched departments reviewed and decision made
- [ ] Mapping table validated by HR/department managers
- [ ] Migration tested on staging successfully
- [ ] All tests passing (unit, integration, e2e)
- [ ] Rollback script tested and ready
- [ ] Backup procedure verified
- [ ] Maintenance window scheduled
- [ ] Users notified in advance
- [ ] DBA/DevOps on standby

---

## Files Structure

```
260121-department-name-standardization/
├── plan.md                          # Overview and decisions
├── phase-01-analysis.md             # Current state + mapping analysis
├── phase-02-migration-scripts.md    # SQL + TypeScript migration
├── phase-03-testing-strategy.md     # Comprehensive testing plan
├── phase-04-rollback-plan.md        # Rollback procedures
├── mapping-table.csv                # CSV mapping (importable)
└── summary.md                       # This file
```

---

## Unresolved Questions

1. **User said 45 rows in DB, but seed.ts shows 39** - Need to query actual database
2. **English name for V-Tech** - Empty in dept.txt, need clarification
3. **Are branch office departments (CN_*) still needed?** - Stakeholder decision
4. **Is GIAI_DOAN_SAU_NHUOM_SOI same as YDF?** - Description differs slightly
5. **Folder paths use codes?** - Need to verify impact on folder sync

**Action:** Run database query and discuss with stakeholders before migration.

---

## Success Criteria

- ✅ 31 departments updated with new format `Code-Vietnamese`
- ✅ 1 department created (DCC)
- ✅ 7 unmatched departments reviewed and decision documented
- ✅ No foreign key constraint violations
- ✅ No data loss
- ✅ All tests passing
- ✅ API returns new department names
- ✅ Frontend displays correctly in all languages (EN, VI, ZH)
- ✅ Rollback capability maintained for 48 hours

---

## Contacts for Questions

- **Technical Issues**: Backend Lead / DBA
- **Department List Accuracy**: HR Manager
- **Business Impact**: IT Manager / Boss
- **Migration Execution**: DevOps Team

---

## Conclusion

Comprehensive implementation plan ready with:
- Complete mapping (31 updates, 1 create, 7 review)
- SQL and TypeScript migration scripts
- Full testing strategy (unit, integration, e2e)
- 3 rollback options with verification
- Risk assessment and mitigation

**Recommendation:** Proceed with conservative approach:
1. Update 31 matched departments
2. Create DCC
3. Keep 7 unmatched departments active (flag for review)
4. Test extensively on staging
5. Execute during maintenance window with rollback ready

**Next Action:** Stakeholder review and approval on unmatched departments.
