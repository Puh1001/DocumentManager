# Phase 06: Testing & Documentation

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: All previous phases
- Tests: `apps/api/src/modules/storage/services/document.service.spec.ts`
- Docs: `docs/codebase-summary.md`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Write tests for ISO metadata features, update documentation, verify all features work correctly.
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights
- Need tests for schema changes, API endpoints, and frontend components
- Documentation needs updates for new fields and features
- Integration tests verify end-to-end functionality

## Requirements

### Functional
- Unit tests for service methods
- Integration tests for API endpoints
- Component tests for frontend
- E2E tests for user workflows
- Update codebase documentation
- Update API documentation

### Non-Functional
- Test coverage > 80%
- All tests pass
- Documentation is accurate and complete

## Architecture

### Test Structure

```
Tests
├── Backend
│   ├── document.service.spec.ts (update)
│   ├── document.controller.spec.ts (update)
│   └── schema.test.ts (migration tests)
├── Frontend
│   ├── document-list.test.tsx
│   ├── iso-metadata-edit-dialog.test.tsx
│   └── document-toolbar.test.tsx
└── E2E
    └── iso-metadata-workflow.spec.ts
```

## Related Code Files

### Files to Modify
- `apps/api/src/modules/storage/services/document.service.spec.ts` - Add ISO metadata tests
- `apps/api/src/modules/storage/controllers/document.controller.spec.ts` - Add endpoint tests
- `docs/codebase-summary.md` - Update documentation
- `docs/system-architecture.md` - Update architecture docs

### Files to Create
- `apps/web/src/components/documents/__tests__/iso-metadata-edit-dialog.test.tsx` - Component tests
- E2E test files (if using Playwright/Cypress)

## Implementation Steps

1. **Backend Unit Tests**
   - Test `updateIsoMetadata` method
   - Test user ID validation
   - Test date handling
   - Test level filtering
   - Test user relations in queries

2. **Backend Integration Tests**
   - Test `PATCH /storage/documents/:id/iso-metadata` endpoint
   - Test validation errors
   - Test authorization
   - Test query with ISO metadata filters

3. **Frontend Component Tests**
   - Test DocumentList display with ISO metadata
   - Test IsoMetadataEditDialog
   - Test UserPicker component
   - Test date formatting
   - Test filter updates

4. **E2E Tests**
   - Test editing ISO metadata workflow
   - Test filtering by level
   - Test displaying ISO metadata in table

5. **Update Documentation**
   - Update schema documentation
   - Update API documentation
   - Update component documentation
   - Update user guide (if exists)

6. **Run All Tests**
   - Run backend tests
   - Run frontend tests
   - Run E2E tests
   - Fix any failing tests

## Todo List

- [ ] Write backend unit tests
- [ ] Write backend integration tests
- [ ] Write frontend component tests
- [ ] Write E2E tests
- [ ] Update codebase-summary.md
- [ ] Update system-architecture.md
- [ ] Update API documentation
- [ ] Run all tests
- [ ] Fix failing tests
- [ ] Verify test coverage

## Success Criteria

- All tests pass
- Test coverage > 80%
- Documentation is updated
- No regressions in existing functionality
- All features work as expected

## Risk Assessment

### Risks
- **Test failures:** Fix before deployment
- **Missing test cases:** Cover all scenarios
- **Documentation gaps:** Review thoroughly

### Mitigations
- Write comprehensive tests
- Review test coverage
- Peer review documentation
- Test in staging environment

## Security Considerations

- Test authorization checks
- Test input validation
- Test SQL injection prevention
- Test XSS prevention

## Next Steps

- Code review
- Deploy to staging
- User acceptance testing
- Deploy to production
