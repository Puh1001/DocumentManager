# Department Name Standardization Plan

**Plan ID:** 260121-department-name-standardization  
**Created:** 2026-01-21  
**Status:** DRAFT  

---

## Executive Summary

Standardize 45 existing department records to match official dept.txt (32 departments) with new naming format: `"Code-Vietnamese Name"` (e.g., `"EG-Công trình"`).

### Key Challenges

1. **Code format mismatch**: Official uses codes like `V-Tech`, `QC(E)`, `LTB(F)` vs. DB uses `CONG_NGHE`, `QC_DAI`, `LTB_VAI`
2. **13 extra departments**: DB has 45 rows, official list has 32 (need to identify which to deactivate)
3. **Multi-language fields**: Must update `name`, `nameEn`, `nameVi`, `nameZh` fields
4. **Foreign key dependencies**: Departments referenced by Folders, KpiRecords, MaintenanceNotices, UserDepartment
5. **Code changes**: Official list has **completely different codes** than current DB

### Proposed New Standard Format

```
name: "Code-Vietnamese Name"  // e.g., "EG-Công trình"
nameEn: "English Name"        // From dept.txt column 3
nameVi: "Vietnamese Name"     // From dept.txt column 4
nameZh: "Chinese Translation" // (if available)
code: "Code"                  // From dept.txt column 2
```

### Deliverables

1. ✅ Complete mapping table (Current DB → Official)
2. ✅ SQL UPDATE statements for each department
3. ✅ List of departments to deactivate
4. ✅ List of departments to create
5. ✅ TypeScript migration script
6. ✅ Testing strategy (unit + integration)
7. ✅ Rollback plan

---

## Plan Structure

```
260121-department-name-standardization/
├── plan.md                          # This file - overview
├── phase-01-analysis.md             # Current state analysis + mapping
├── phase-02-migration-scripts.md    # SQL + TypeScript migration
├── phase-03-testing-strategy.md     # Testing plan
├── phase-04-rollback-plan.md        # Rollback procedures
└── mapping-table.csv                # CSV mapping (DB → Official)
```

---

## Critical Decisions Required

### Decision 1: Code Remapping Strategy

**Problem**: Official codes (`V-Tech`, `QC(E)`, `LTB(F)`) differ completely from DB codes (`CONG_NGHE`, `QC_DAI`, `LTB_VAI`).

**Options**:
- **Option A (RECOMMENDED)**: Replace all DB codes with official codes
  - Pros: Matches official document exactly
  - Cons: Breaks existing folder paths, KPI records, user-department mappings
  - **Impact**: HIGH - requires cascading updates to all related records

- **Option B**: Keep DB codes, only update `name` field to include official code
  - Pros: No foreign key impact
  - Cons: Inconsistent - `code` field won't match official, confusing for users
  - **Impact**: LOW - only updates department names

**Recommendation**: Option A with cascading updates and comprehensive rollback plan.

### Decision 2: 13 Extra Departments

DB has 45 records but official list has 32. **Need to identify which 13 to deactivate**.

**Strategy**:
1. Find departments in DB not in official list (by matching Vietnamese names)
2. Check if they have active KPI records, folders, maintenance notices
3. If referenced: Keep active but flag for review
4. If unreferenced: Deactivate (`is_active = false`)

### Decision 3: Migration Timing

**Options**:
- Run during maintenance window (recommended)
- Blue-green deployment with dual-read mode
- Feature flag to gradually roll out

---

## Impact Analysis

### Affected Systems

| Module | Impact | Mitigation |
|--------|--------|------------|
| **Folders** | `departmentId` FK - no code change needed | Test folder-department associations |
| **KPI Records** | `departmentId` FK - no code change needed | Verify KPI data integrity after migration |
| **Maintenance Notices** | `departmentId` FK - no code change needed | Check notice-department links |
| **User Departments** | `departmentId` FK in junction table | Verify user-department mappings |
| **Frontend Dropdowns** | Display `name` field | Update i18n if needed |
| **API Responses** | Department objects returned | Update API docs if format changes |

**Good news**: Since relations use UUID `id` (not `code`), changing codes won't break FK constraints. **BUT** folder paths use codes, so folder sync may break.

---

## Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| FK constraint violations | HIGH | LOW | Test on staging first, use transactions |
| Folder path mismatches | HIGH | MEDIUM | Update folder sync logic to handle code changes |
| KPI data loss | CRITICAL | LOW | Full backup before migration, rollback script ready |
| User-department unmapped | MEDIUM | LOW | Validate user mappings post-migration |
| Frontend display issues | LOW | MEDIUM | Update i18n translations, test all languages |
| Deactivated dept with active KPI | MEDIUM | MEDIUM | Check references before deactivation |

---

## Next Steps

1. **Review mapping** in `phase-01-analysis.md` - validate Vietnamese name matches
2. **Approve code remapping strategy** (Decision 1)
3. **Identify 13 departments to deactivate** (run analysis query)
4. **Test migration script** on staging database
5. **Execute migration** during maintenance window
6. **Verify data integrity** with automated tests
7. **Deploy updated frontend** with new department names

---

## Timeline (Estimated)

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Analysis & Mapping | 2 hours | None |
| Script Development | 3 hours | Analysis complete |
| Testing on Staging | 2 hours | Scripts ready |
| Stakeholder Approval | 1 day | Test results |
| Production Migration | 1 hour | Approval + maintenance window |
| Post-migration Validation | 2 hours | Migration complete |

**Total**: ~2 days (including approval time)

---

## Approval Required From

- [ ] **IT Manager** - Technical approach
- [ ] **HR/Admin** - Department list accuracy
- [ ] **Boss** - Impact on KPI reporting
- [ ] **DevOps** - Maintenance window scheduling

---

## References

- Official department list: `d:\documentsManager\apps\api\dept.txt`
- Database schema: `apps/api/prisma/schema.prisma`
- Current seed data: `apps/api/prisma/seed.ts`
- Department service: `apps/api/src/modules/department/services/department.service.ts`
