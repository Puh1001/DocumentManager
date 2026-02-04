# Phase 03: Testing & Regression Checks

**Status:** Pending  
**Dependencies:** Phase 01, Phase 02

## Goal

Ensure comprehensive test coverage for the ISO_documents filter and verify no regressions in related features.

## Test Strategy

### Unit Tests

**File:** `apps/api/src/modules/storage/services/document.service.spec.ts`

#### Test 1: ISO_documents Documents Included

```typescript
it("should include documents from ISO_documents folders", async () => {
  const isoFolder = {
    id: "folder-iso",
    name: "ISO Documents",
    path: "DEPT/ISO_documents",
    departmentId: "dept-1",
  };
  const mockDocument = {
    ...mockDocumentWithRelations,
    folder: {
      ...isoFolder,
      department: { id: "dept-1", name: "Test Dept", code: "DEPT" },
    },
  };

  prismaService.document.findMany = jest.fn().mockResolvedValue([mockDocument]);
  prismaService.document.groupBy = jest
    .fn()
    .mockResolvedValue([{ folderId: "folder-iso", fileName: "test.pdf" }]);

  const result = await service.findAll();

  expect(result.data).toHaveLength(1);
  expect(result.data[0].folder.path).toContain("ISO_documents");
});
```

#### Test 2: KPI Documents Excluded

```typescript
it("should exclude documents from KPI folders", async () => {
  const kpiFolder = {
    id: "folder-kpi",
    name: "KPI",
    path: "DEPT/KPI",
    departmentId: "dept-1",
  };
  const mockDocument = {
    ...mockDocumentWithRelations,
    folder: {
      ...kpiFolder,
      department: { id: "dept-1", name: "Test Dept", code: "DEPT" },
    },
  };

  prismaService.document.findMany = jest.fn().mockResolvedValue([mockDocument]);
  prismaService.document.groupBy = jest.fn().mockResolvedValue([]);

  const result = await service.findAll();

  expect(result.data).toHaveLength(0);
});
```

#### Test 3: Maintenance Documents Excluded

```typescript
it("should exclude documents from Maintenance folders", async () => {
  const maintenanceFolder = {
    id: "folder-maintenance",
    name: "Maintenance",
    path: "DEPT/Maintenance",
    departmentId: "dept-1",
  };
  const mockDocument = {
    ...mockDocumentWithRelations,
    folder: {
      ...maintenanceFolder,
      department: { id: "dept-1", name: "Test Dept", code: "DEPT" },
    },
  };

  prismaService.document.findMany = jest.fn().mockResolvedValue([mockDocument]);
  prismaService.document.groupBy = jest.fn().mockResolvedValue([]);

  const result = await service.findAll();

  expect(result.data).toHaveLength(0);
});
```

#### Test 4: Legacy ISO_documents Paths Included

```typescript
it("should include documents from legacy ISO_documents/current paths", async () => {
  const legacyFolder = {
    id: "folder-legacy",
    name: "Current",
    path: "DEPT/ISO_documents/current",
    departmentId: "dept-1",
  };
  const mockDocument = {
    ...mockDocumentWithRelations,
    folder: {
      ...legacyFolder,
      department: { id: "dept-1", name: "Test Dept", code: "DEPT" },
    },
  };

  prismaService.document.findMany = jest.fn().mockResolvedValue([mockDocument]);
  prismaService.document.groupBy = jest
    .fn()
    .mockResolvedValue([{ folderId: "folder-legacy", fileName: "test.pdf" }]);

  const result = await service.findAll();

  expect(result.data).toHaveLength(1);
  expect(result.data[0].folder.path).toContain("ISO_documents");
});
```

#### Test 5: Combined Filters Still Work

```typescript
it("should apply ISO_documents filter with other filters", async () => {
  const isoFolder = {
    id: "folder-iso",
    name: "ISO Documents",
    path: "DEPT/ISO_documents",
    departmentId: "dept-1",
  };
  const mockDocument = {
    ...mockDocumentWithRelations,
    status: "ACTIVE",
    folder: {
      ...isoFolder,
      department: { id: "dept-1", name: "Test Dept", code: "DEPT" },
    },
  };

  prismaService.document.findMany = jest.fn().mockResolvedValue([mockDocument]);
  prismaService.document.groupBy = jest
    .fn()
    .mockResolvedValue([{ folderId: "folder-iso", fileName: "test.pdf" }]);

  const result = await service.findAll({
    status: "ACTIVE",
    departmentId: "dept-1",
    level: "level-1",
  });

  expect(result.data).toHaveLength(1);
  expect(prismaService.document.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: "ACTIVE",
        folder: expect.objectContaining({
          departmentId: "dept-1",
        }),
      }),
    })
  );
});
```

### Integration Tests

**File:** `apps/api/src/modules/storage/controllers/document.controller.spec.ts`

#### Test: Controller Passes Filter Correctly

```typescript
it("should return only ISO_documents when calling findAll", async () => {
  const mockPaginatedResponse = {
    data: [mockDocuments[0]], // Only ISO_documents document
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
  documentService.findAll = jest.fn().mockResolvedValue(mockPaginatedResponse);

  const query: QueryDocumentsDto = {};
  const result = await controller.findAll(query, mockRequest);

  expect(result.data).toHaveLength(1);
  expect(result.data[0].folder.path).toContain("ISO_documents");
});
```

### Regression Tests

#### Test 1: KPI Module Unaffected

**Action:** Verify KPI attachment upload/download still works

**Steps:**

1. Navigate to KPI module
2. Upload attachment to a KPI record
3. Verify attachment appears in KPI module
4. Verify attachment does NOT appear in `/dashboard/documents`

**Expected:** KPI module works normally, attachments excluded from documents list

#### Test 2: Maintenance Module Unaffected

**Action:** Verify Maintenance document upload/download still works (if module exists)

**Steps:**

1. Navigate to Maintenance module (if exists)
2. Upload document
3. Verify document appears in Maintenance module
4. Verify document does NOT appear in `/dashboard/documents`

**Expected:** Maintenance module works normally, documents excluded from documents list

#### Test 3: Upload Flow Unaffected

**Action:** Verify document upload from `/dashboard/documents` still works

**Steps:**

1. Navigate to `/dashboard/documents`
2. Click upload
3. Select file, department, folder (ISO_documents folder)
4. Upload completes
5. Verify document appears in list immediately

**Expected:** Upload flow works, new document appears in filtered list

#### Test 4: Version History Unaffected

**Action:** Verify document version history still works

**Steps:**

1. Open a document from `/dashboard/documents`
2. View version history
3. Download/restore versions

**Expected:** Version history works normally

#### Test 5: Document Metadata Edit Unaffected

**Action:** Verify ISO metadata editing still works

**Steps:**

1. Open a document from `/dashboard/documents`
2. Edit ISO metadata (level, preparer, reviewer, approver)
3. Save changes
4. Verify changes appear in list

**Expected:** Metadata editing works normally

## Testing Checklist

### Backend Tests

- [ ] Unit test: ISO_documents documents included
- [ ] Unit test: KPI documents excluded
- [ ] Unit test: Maintenance documents excluded
- [ ] Unit test: Legacy paths included
- [ ] Unit test: Combined filters work
- [ ] Integration test: Controller passes filter correctly
- [ ] All existing tests still pass

### Frontend Tests

- [ ] Manual test: ISO_documents appear
- [ ] Manual test: KPI excluded
- [ ] Manual test: Maintenance excluded
- [ ] Manual test: Filters work
- [ ] Manual test: Pagination works
- [ ] Manual test: Upload flow works

### Regression Tests

- [ ] KPI module unaffected
- [ ] Maintenance module unaffected
- [ ] Upload flow unaffected
- [ ] Version history unaffected
- [ ] Metadata editing unaffected

## Running Tests

### Backend

```bash
cd apps/api
npm test -- document.service.spec.ts
npm test -- document.controller.spec.ts
```

### Full Test Suite

```bash
npm test
```

## Expected Results

- All new tests pass
- All existing tests pass (no regressions)
- Manual testing confirms correct behavior
- No console errors or warnings

## Notes

- Focus on testing the filter logic thoroughly
- Ensure backward compatibility with legacy paths
- Verify no side effects on other modules
- Document any edge cases found during testing

## Rollback Plan

If tests fail or regressions found:

1. Review test failures
2. Check if filter logic is too strict/loose
3. Adjust Prisma query if needed
4. Re-run tests
5. If critical issues, revert Phase 01 changes
