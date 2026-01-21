# Improve Migration Scripts - Implementation Plan

**Date:** 2026-01-21 14:22  
**Status:** In Progress  
**Based on:** Code Review of Department Name Standardization Migration

---

## Objective

Improve migration scripts based on code review feedback:
- Add transaction safety
- Reduce code duplication
- Make configuration dynamic
- Enhance error logging

---

## Review Findings

### Major Issues (2)
1. **Missing Transaction Wrapper** - Updates not wrapped in transaction
2. **Code Duplication** - 170 lines duplicated in cleanup script

### Minor Issues (3)
1. **Magic Numbers** - Hard-coded backup table date
2. **Incomplete Error Context** - Generic error messages
3. **Hard-coded Unmatched Codes** - Static list of codes

---

## Implementation Phases

### Phase 1: Add Transaction Safety
- Wrap department updates in `$transaction`
- Continue on individual errors (don't fail entire transaction)
- Update test to verify transaction behavior

### Phase 2: Extract Common Merge Function
- Create `mergeDepartments()` utility function
- Refactor HCNS→HR and KINH_DOANH→SD to use common function
- Reduce 170 lines duplication to ~50 lines

### Phase 3: Dynamic Configuration
- Make backup table name dynamic (use current date)
- Load unmatched codes dynamically from database
- Remove hard-coded lists

### Phase 4: Enhanced Error Logging
- Add error codes and context to error messages
- Include table names, operation types in logs
- Make debugging easier

### Phase 5: Testing
- Run migration scripts in test mode
- Verify transaction rollback works
- Ensure all tests still pass

---

## Success Criteria

- ✅ All department updates wrapped in transaction
- ✅ Code duplication reduced by >70%
- ✅ No hard-coded dates or codes
- ✅ Error messages include full context
- ✅ All existing tests pass
- ✅ Migration scripts work correctly

---

## Files to Modify

1. `apps/api/prisma/migrations/standardize-department-names.ts`
2. `apps/api/prisma/migrations/cleanup-duplicate-departments.ts`

---

## Estimated Effort

- Phase 1: 30 min
- Phase 2: 1 hour
- Phase 3: 30 min
- Phase 4: 30 min
- Phase 5: 30 min

**Total: ~3 hours**
