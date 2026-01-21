# Phase 8: Testing & Validation

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- All previous phases (1-7)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 4-6 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Requirements to validate
- [All Previous Phases](./plan.md) - Implementation to test
- [Code Standards](../../docs/code-standards.md) - Testing patterns

---

## Overview

Comprehensive testing of all new KPI/CAR functionality including database migrations, API endpoints, form validation, conditional logic, and attachment uploads. Ensure backward compatibility and no regressions.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Test both happy path and error scenarios
- Test backward compatibility with existing records
- Test conditional logic thoroughly
- Test validation at all layers (DTO, service, frontend)
- Test i18n for all locales

---

## Requirements

### Functional Requirements

1. **Database Testing:**
   - Migration forward/backward
   - Default values for existing records
   - New fields accessible via Prisma

2. **Backend API Testing:**
   - Create KPI record with new fields
   - Update KPI record with new fields
   - Validation errors return correctly
   - Attachment upload with type
   - Attachment filtering by type

3. **Frontend Testing:**
   - Form displays all new fields
   - Conditional fields show/hide correctly
   - Validation works (client and server)
   - Upload sections work correctly
   - Error messages display correctly

4. **Integration Testing:**
   - End-to-end create flow
   - End-to-end update flow
   - Status change scenarios
   - Attachment upload flows

### Non-Functional Requirements

- Backward compatibility maintained
- No performance degradation
- All translations present
- Accessible (keyboard navigation, screen readers)

---

## Architecture

### Test Scenarios

```
Test Categories:
├── Database Tests
│   ├── Migration forward
│   ├── Migration backward
│   ├── Default values
│   └── Existing records access
│
├── Backend API Tests
│   ├── Create with new fields
│   ├── Update with new fields
│   ├── Validation errors
│   ├── Attachment upload
│   └── Attachment filtering
│
├── Frontend Tests
│   ├── Form rendering
│   ├── Conditional logic
│   ├── Validation
│   ├── Upload components
│   └── Error handling
│
└── Integration Tests
    ├── Create flow
    ├── Update flow
    ├── Status change
    └── Attachment flows
```

---

## Related Code Files

### Files to Create/Update

- Test files for backend services (if unit tests exist)
- Manual test checklist
- Test data for scenarios

### Files to Review

- All modified files from previous phases
- Existing test files (if any)

---

## Implementation Steps

1. **Database Migration Testing**
   - Test migration forward (apply)
   - Test migration backward (rollback)
   - Verify default values set correctly
   - Verify existing records still accessible
   - Test with production-like data volume

2. **Backend API Testing**
   - Test POST /kpi/records with new fields
   - Test PATCH /kpi/records with new fields
   - Test validation errors (missing required fields)
   - Test conditional validation (status-based)
   - Test attachment upload with type
   - Test attachment list filtering

3. **Frontend Form Testing**
   - Test form renders all fields
   - Test Statistical Cycle dropdown
   - Test KPI Status dropdown
   - Test conditional fields visibility
   - Test field clearing on status change
   - Test form validation (client-side)
   - Test form submission

4. **Conditional Logic Testing**
   - Test status change to "Not achieved" (fields appear)
   - Test status change to "Achieved" (fields disappear)
   - Test field values cleared correctly
   - Test validation for conditional fields

5. **Attachment Upload Testing**
   - Test KPI Evidence PDF upload
   - Test CAR PDF upload (conditional)
   - Test attachment type stored correctly
   - Test attachment list filtering
   - Test validation for required PDFs

6. **Integration Testing**
   - Test complete create flow (form → API → database)
   - Test complete update flow
   - Test status change flow
   - Test attachment upload flow
   - Test validation error flow

7. **Backward Compatibility Testing**
   - Test existing records still work
   - Test API without new fields (should work)
   - Test frontend with old data format
   - Test migration doesn't break existing functionality

8. **i18n Testing**
   - Test all translations present (EN, VI, ZH)
   - Test form labels translated
   - Test error messages translated
   - Test dropdown options translated

9. **Accessibility Testing**
   - Test keyboard navigation
   - Test screen reader (if possible)
   - Test ARIA labels
   - Test focus management

10. **Performance Testing**
    - Test form responsiveness (no lag)
    - Test API response times
    - Test database query performance

---

## Todo List

- [ ] Test database migration forward/backward
- [ ] Test default values for existing records
- [ ] Test backend API create/update
- [ ] Test validation errors
- [ ] Test attachment upload with type
- [ ] Test frontend form rendering
- [ ] Test conditional field visibility
- [ ] Test form validation
- [ ] Test attachment upload sections
- [ ] Test integration flows
- [ ] Test backward compatibility
- [ ] Test i18n (all locales)
- [ ] Test accessibility
- [ ] Test performance
- [ ] Document test results
- [ ] Fix any issues found

---

## Success Criteria

- [ ] All database migrations work
- [ ] All API endpoints work correctly
- [ ] All form fields render correctly
- [ ] Conditional logic works correctly
- [ ] Validation works at all layers
- [ ] Attachment uploads work correctly
- [ ] Backward compatibility maintained
- [ ] All translations present
- [ ] No performance issues
- [ ] No accessibility issues
- [ ] All test scenarios pass

---

## Risk Assessment

### Potential Issues

1. **Migration fails on production data**
   - Mitigation: Test on production-like data first
   - Verification: Test migration thoroughly

2. **Validation not working correctly**
   - Mitigation: Test all validation scenarios
   - Verification: Manual and automated testing

3. **Backward compatibility broken**
   - Mitigation: Test with existing records
   - Verification: Regression testing

4. **Performance issues**
   - Mitigation: Profile and optimize
   - Verification: Performance testing

---

## Security Considerations

- Test input validation (prevent injection)
- Test file upload validation (PDF only)
- Test permission checks still work
- Test no new security vulnerabilities

---

## Next Steps

- **Dependency:** All previous phases must be complete
- **Follow-up:** Deployment (if all tests pass)
- **Blockers:** Any failing tests must be fixed

---

## Test Checklist

### Database
- [ ] Migration applies successfully
- [ ] Migration rolls back successfully
- [ ] Default values set correctly
- [ ] Existing records accessible

### Backend
- [ ] Create KPI record with new fields
- [ ] Update KPI record with new fields
- [ ] Validation errors return correctly
- [ ] Attachment upload with type works
- [ ] Attachment filtering works

### Frontend
- [ ] Form renders all fields
- [ ] Conditional fields show/hide
- [ ] Validation works
- [ ] Upload sections work
- [ ] Error messages display

### Integration
- [ ] Create flow works end-to-end
- [ ] Update flow works end-to-end
- [ ] Status change works
- [ ] Attachment upload works

### Compatibility
- [ ] Existing records work
- [ ] API backward compatible
- [ ] Frontend backward compatible

### i18n
- [ ] All translations present
- [ ] All locales work

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

### Performance
- [ ] No lag in form
- [ ] API response times acceptable
