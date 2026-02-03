# Phase 07: Testing & Validation

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: All previous phases
- Tests: `apps/api/src/modules/storage/**/*.spec.ts`

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Comprehensive testing of new storage structure. Validate file operations, folder creation, deletion workflow, and migration.
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights
- Need to test all file operations with new structure
- Need to verify folder auto-creation works
- Need to test deletion workflow
- Need to verify migration script
- Need integration tests

## Requirements

### Functional
- Test folder auto-creation when department created
- Test file upload to all sections
- Test version creation
- Test file deletion and movement to Delete_files
- Test file display (ID storage, text display)
- Test migration script

### Non-Functional
- All existing tests pass
- New tests cover new structure
- Integration tests verify end-to-end flow

## Architecture

### Test Coverage

1. **Unit Tests**
   - StoragePathBuilder path building
   - FolderService folder creation
   - VersionService version creation
   - DocumentService upload
   - DeletionService deletion

2. **Integration Tests**
   - Department creation → folder auto-creation
   - File upload → storage in correct section
   - File deletion → movement to Delete_files
   - Migration script execution

3. **E2E Tests**
   - Complete upload flow
   - Complete deletion flow
   - Folder structure verification

## Related Code Files

### Files to Create/Update
- `apps/api/src/modules/storage/services/folder.service.spec.ts` - Update tests
- `apps/api/src/modules/storage/services/version.service.spec.ts` - Update tests
- `apps/api/src/modules/storage/services/document.service.spec.ts` - Update tests
- `apps/api/src/modules/storage/services/document-deletion.service.spec.ts` - Update tests
- `apps/api/src/modules/department/services/department.service.spec.ts` - Add folder creation test

## Implementation Steps

1. **Update Unit Tests**
   - Update StoragePathBuilder tests for new structure
   - Update FolderService tests for ISO_documents
   - Update VersionService tests for new paths
   - Update DocumentService tests for new structure
   - Update DeletionService tests for Delete_files path

2. **Add Integration Tests**
   - Test department creation triggers folder creation
   - Test file upload stores in correct section
   - Test file deletion moves to Delete_files
   - Test version creation uses correct paths

3. **Test Migration Script**
   - Test dry-run mode
   - Test actual migration
   - Test rollback
   - Verify file movement

4. **Manual Testing**
   - Create department → verify folder structure
   - Upload file → verify storage location
   - Delete file → verify moved to Delete_files
   - View file → verify display uses text filename

5. **Performance Testing**
   - Verify no performance degradation
   - Test with large number of files

## Todo List

- [ ] Update StoragePathBuilder unit tests
- [ ] Update FolderService unit tests
- [ ] Update VersionService unit tests
- [ ] Update DocumentService unit tests
- [ ] Update DeletionService unit tests
- [ ] Add department creation integration test
- [ ] Add file upload integration test
- [ ] Add file deletion integration test
- [ ] Test migration script (dry-run)
- [ ] Test migration script (actual)
- [ ] Manual testing checklist
- [ ] Performance testing
- [ ] All tests pass

## Success Criteria

- All unit tests pass
- All integration tests pass
- Migration script tested and verified
- Manual testing completed
- Performance acceptable
- No regressions
- Documentation updated

## Risk Assessment

### Risks
- Tests fail due to path changes
- Migration script issues
- Performance degradation

### Mitigations
- Update tests incrementally
- Test migration script thoroughly
- Monitor performance metrics
- Rollback plan ready

## Security Considerations

- Verify file permissions after migration
- Test access control still works
- Verify no security regressions

## Next Steps

- Deploy to staging
- User acceptance testing
- Production deployment
