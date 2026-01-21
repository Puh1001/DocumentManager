# Phase 3: Testing Strategy

**Status:** DRAFT  
**Dependencies:** Phase 2 migration scripts ready  

---

## Testing Overview

### Goals
1. Verify data migration correctness (31 updates, 1 create)
2. Ensure no foreign key constraint violations
3. Validate API responses return new format
4. Test frontend display of new department names
5. Verify i18n translations work correctly
6. Check edge cases (unmatched departments, branch offices)

### Test Environments
- **Local**: Developer machine with test database
- **Staging**: Replica of production with real data
- **Production**: Live environment (post-migration validation only)

---

## Test Plan Structure

```
tests/
├── unit/
│   ├── department-service.spec.ts       # DepartmentService tests
│   └── department-migration.spec.ts     # Migration logic tests
├── integration/
│   ├── department-api.spec.ts           # API endpoint tests
│   ├── kpi-department-relation.spec.ts  # KPI-Department FK tests
│   └── folder-department-relation.spec.ts # Folder-Department FK tests
└── e2e/
    ├── department-list.spec.ts          # Frontend department list
    ├── kpi-dropdown.spec.ts             # KPI department dropdown
    └── i18n-department-names.spec.ts    # Multi-language display
```

---

## 1. Unit Tests

### Test 1.1: Department Service - Find All

**File:** `apps/api/src/modules/department/services/department.service.spec.ts`

```typescript
describe('DepartmentService - After Migration', () => {
  let service: DepartmentService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DepartmentService, PrismaService],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll()', () => {
    it('should return departments with new name format (Code-Vietnamese)', async () => {
      const departments = await service.findAll();

      // Check that at least one department has new format
      const hasNewFormat = departments.some(dept => 
        dept.name.includes('-') && dept.name.match(/^[A-Z-()]+-.+$/)
      );
      expect(hasNewFormat).toBe(true);

      // Check specific examples
      const egDept = departments.find(d => d.code === 'EG');
      expect(egDept).toBeDefined();
      expect(egDept?.name).toBe('EG-Công trình');
      expect(egDept?.nameEn).toBe('Engineering Dept.');
      expect(egDept?.nameVi).toBe('Công trình');
    });

    it('should return only active departments', async () => {
      const departments = await service.findAll();
      expect(departments.every(d => d.isActive)).toBe(true);
    });

    it('should have 32+ departments (31 updated + 1 created + unmatched)', async () => {
      const departments = await service.findAll();
      expect(departments.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('findOne()', () => {
    it('should find department by new code (e.g., V-Tech)', async () => {
      const dept = await prisma.department.findUnique({
        where: { code: 'V-Tech' },
      });
      expect(dept).toBeDefined();
      expect(dept?.name).toBe('V-Tech-Công nghệ');
    });

    it('should NOT find department by old code (e.g., CONG_NGHE)', async () => {
      const dept = await prisma.department.findUnique({
        where: { code: 'CONG_NGHE' },
      });
      expect(dept).toBeNull();
    });
  });
});
```

### Test 1.2: Migration Logic

**File:** `apps/api/src/modules/department/tests/department-migration.spec.ts`

```typescript
describe('Department Migration Logic', () => {
  it('should have migrated all 31 departments', async () => {
    const updatedDepts = await prisma.department.findMany({
      where: {
        name: { contains: '-' },
        code: {
          in: [
            'BOD', 'HR', 'SD', 'AC', 'PUR', 'IT', 'SHD', 'PMC', 'QA', 'WH',
            'EG', 'IE', 'CV', 'WD', 'V-Tech', 'WV', 'DF', 'QC(E)', 'WA', 'WK',
            'LAB', 'DH', 'SS', 'QC(F)', 'PT', 'LTB(F)', 'LTB(E)', 'TL', 'RD', 'PW', 'YDF',
          ],
        },
      },
    });
    expect(updatedDepts.length).toBe(31);
  });

  it('should have created DCC department', async () => {
    const dcc = await prisma.department.findUnique({
      where: { code: 'DCC' },
    });
    expect(dcc).toBeDefined();
    expect(dcc?.name).toBe('DCC-Kiểm soát văn kiện');
  });

  it('should have backup table', async () => {
    const backupExists = await prisma.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'departments_backup_20260121'
      );
    `);
    expect(backupExists[0].exists).toBe(true);
  });

  it('backup should have original data', async () => {
    const backupData = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM departments_backup_20260121 WHERE code = 'CONG_NGHE';
    `);
    expect(backupData.length).toBeGreaterThan(0);
    expect(backupData[0].code).toBe('CONG_NGHE');
  });
});
```

---

## 2. Integration Tests

### Test 2.1: Department API Endpoints

**File:** `apps/api/src/modules/department/tests/department-api.spec.ts`

```typescript
describe('Department API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /departments', () => {
    it('should return departments with new format', async () => {
      const res = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(32);

      // Check EG department
      const egDept = res.body.find(d => d.code === 'EG');
      expect(egDept).toMatchObject({
        code: 'EG',
        name: 'EG-Công trình',
        nameEn: 'Engineering Dept.',
        nameVi: 'Công trình',
        isActive: true,
      });
    });

    it('should return departments sorted by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const names = res.body.map(d => d.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('GET /departments/:id', () => {
    it('should find department by new code (V-Tech)', async () => {
      // First get V-Tech department id
      const listRes = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${authToken}`);
      
      const vTechDept = listRes.body.find(d => d.code === 'V-Tech');
      expect(vTechDept).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/departments/${vTechDept.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        code: 'V-Tech',
        name: 'V-Tech-Công nghệ',
        nameVi: 'Công nghệ',
      });
    });
  });
});
```

### Test 2.2: KPI-Department Relation

**File:** `apps/api/src/modules/kpi/tests/kpi-department-relation.spec.ts`

```typescript
describe('KPI-Department Relation (Integration)', () => {
  it('should maintain KPI records with updated departments', async () => {
    // Check if existing KPI records still link to departments
    const kpiRecords = await prisma.kpiRecord.findMany({
      include: { department: true },
      take: 10,
    });

    expect(kpiRecords.length).toBeGreaterThan(0);
    
    for (const record of kpiRecords) {
      expect(record.department).toBeDefined();
      expect(record.department.name).toMatch(/^[A-Z-()]+-.+$/); // New format
    }
  });

  it('should allow querying KPI by new department code', async () => {
    // Query KPI records by department code (e.g., EG)
    const egDept = await prisma.department.findUnique({
      where: { code: 'EG' },
    });
    expect(egDept).toBeDefined();

    const kpiRecords = await prisma.kpiRecord.findMany({
      where: { departmentId: egDept!.id },
      include: { department: true },
    });

    if (kpiRecords.length > 0) {
      expect(kpiRecords[0].department.code).toBe('EG');
      expect(kpiRecords[0].department.name).toBe('EG-Công trình');
    }
  });

  it('should NOT break when creating new KPI record', async () => {
    const egDept = await prisma.department.findUnique({
      where: { code: 'EG' },
    });

    const newKpi = await prisma.kpiRecord.create({
      data: {
        departmentId: egDept!.id,
        year: 2026,
        title: 'Test KPI after migration',
        target: '≥90%',
        displayType: 'PERCENTAGE',
      },
    });

    expect(newKpi).toBeDefined();
    expect(newKpi.departmentId).toBe(egDept!.id);

    // Cleanup
    await prisma.kpiRecord.delete({ where: { id: newKpi.id } });
  });
});
```

### Test 2.3: Folder-Department Relation

**File:** `apps/api/src/modules/storage/tests/folder-department-relation.spec.ts`

```typescript
describe('Folder-Department Relation (Integration)', () => {
  it('should maintain folder-department links', async () => {
    const foldersWithDept = await prisma.folder.findMany({
      where: { departmentId: { not: null } },
      include: { department: true },
      take: 10,
    });

    expect(foldersWithDept.length).toBeGreaterThan(0);

    for (const folder of foldersWithDept) {
      expect(folder.department).toBeDefined();
      expect(folder.department?.name).toMatch(/^[A-Z-()]+-.+$/);
    }
  });

  it('should link folders to correct departments after migration', async () => {
    const egDept = await prisma.department.findUnique({
      where: { code: 'EG' },
    });
    expect(egDept).toBeDefined();

    const egFolders = await prisma.folder.findMany({
      where: { departmentId: egDept!.id },
    });

    // If EG department has folders, verify they're still linked
    if (egFolders.length > 0) {
      expect(egFolders[0].departmentId).toBe(egDept!.id);
    }
  });
});
```

---

## 3. End-to-End (E2E) Tests

### Test 3.1: Frontend Department List

**File:** `apps/web/src/tests/e2e/department-list.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Department List Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/en/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/en/dashboard');
  });

  test('should display departments with new format', async ({ page }) => {
    await page.goto('http://localhost:3000/en/departments');
    await page.waitForSelector('table');

    // Check if "EG-Công trình" is displayed
    const egDept = await page.locator('text=EG-Công trình').first();
    await expect(egDept).toBeVisible();

    // Check if old format "CONG_TRINH" is NOT displayed
    const oldFormat = page.locator('text=CONG_TRINH').first();
    await expect(oldFormat).not.toBeVisible();
  });

  test('should display English names in EN locale', async ({ page }) => {
    await page.goto('http://localhost:3000/en/departments');
    await page.waitForSelector('table');

    // Check if English name column shows correct translation
    const engineeringDept = await page.locator('text=Engineering Dept.').first();
    await expect(engineeringDept).toBeVisible();
  });

  test('should display Vietnamese names in VI locale', async ({ page }) => {
    await page.goto('http://localhost:3000/vi/departments');
    await page.waitForSelector('table');

    // Check if Vietnamese name is displayed
    const congTrinh = await page.locator('text=Công trình').first();
    await expect(congTrinh).toBeVisible();
  });
});
```

### Test 3.2: KPI Department Dropdown

**File:** `apps/web/src/tests/e2e/kpi-dropdown.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('KPI Department Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/en/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/en/dashboard');
  });

  test('should show new department names in KPI filter', async ({ page }) => {
    await page.goto('http://localhost:3000/en/kpi');
    
    // Open department dropdown
    await page.click('[data-testid="department-filter"]');
    
    // Check if new format is displayed
    const egOption = await page.locator('text=EG-Công trình').first();
    await expect(egOption).toBeVisible();

    // Select and verify
    await egOption.click();
    
    // Check if KPI data loads for EG department
    await page.waitForSelector('[data-testid="kpi-table"]');
    const deptLabel = await page.locator('text=EG-Công trình').first();
    await expect(deptLabel).toBeVisible();
  });

  test('should filter KPI by department correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/en/kpi');
    
    // Select EG department
    await page.click('[data-testid="department-filter"]');
    await page.click('text=EG-Công trình');
    
    // Verify filtered results
    await page.waitForSelector('[data-testid="kpi-table"]');
    
    // All displayed KPI should be for EG department
    const kpiRows = await page.locator('[data-testid="kpi-row"]').all();
    for (const row of kpiRows) {
      const deptCell = await row.locator('[data-testid="kpi-department"]').textContent();
      expect(deptCell).toContain('EG');
    }
  });
});
```

---

## 4. Manual Testing Checklist

### Pre-migration
- [ ] Backup database created successfully
- [ ] Migration script runs without errors on staging
- [ ] All SQL statements validated

### Post-migration
- [ ] All 31 departments updated with new format
- [ ] DCC department created (if didn't exist)
- [ ] No foreign key constraint violations
- [ ] KPI records still linked to correct departments
- [ ] Folders still linked to correct departments
- [ ] Maintenance notices still linked to correct departments
- [ ] User-department mappings still intact

### Frontend
- [ ] Department list page displays new names
- [ ] KPI department dropdown shows new names
- [ ] Maintenance notice department filter works
- [ ] English translation displays correctly
- [ ] Vietnamese translation displays correctly
- [ ] Chinese translation displays correctly (if applicable)

### API
- [ ] GET /departments returns new format
- [ ] GET /departments/:id works with new codes
- [ ] POST /departments validates new format
- [ ] PATCH /departments/:id allows updates
- [ ] DELETE /departments/:id soft-deletes correctly

### Edge Cases
- [ ] Unmatched departments (PTVL, PHONG_MAU, etc.) still accessible
- [ ] Branch office departments (CN_*) still work
- [ ] Departments with parentheses in code (QC(E), LTB(F)) work correctly
- [ ] Departments with hyphens in code (V-Tech) don't break routing

---

## 5. Performance Testing

### Load Test: Department List API

```bash
# Use Apache Bench to test performance
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/departments
```

**Expected:** Response time < 100ms for 1000 requests

### Query Performance

```sql
-- Test department lookup by code
EXPLAIN ANALYZE SELECT * FROM departments WHERE code = 'EG';

-- Test KPI join performance
EXPLAIN ANALYZE 
SELECT k.*, d.name 
FROM kpi_records k 
JOIN departments d ON k.department_id = d.id 
WHERE d.code = 'EG';
```

**Expected:** Index scan, < 10ms execution time

---

## 6. Test Execution Plan

### Phase 1: Local Testing (Day 1)
1. Run unit tests: `npm run test:unit`
2. Run integration tests: `npm run test:integration`
3. Fix any failures
4. Run migration on local DB
5. Re-run all tests
6. Manual testing on local frontend

### Phase 2: Staging Testing (Day 2)
1. Deploy to staging environment
2. Run migration on staging DB
3. Run E2E tests: `npm run test:e2e`
4. Manual testing with real data
5. Performance testing
6. Get stakeholder approval

### Phase 3: Production Migration (Day 3)
1. Schedule maintenance window
2. Backup production database
3. Run migration script
4. Run smoke tests (basic API + frontend checks)
5. Monitor for errors
6. Rollback if critical issues found

---

## Success Criteria

### Must Pass
- ✅ All unit tests pass (100%)
- ✅ All integration tests pass (100%)
- ✅ All E2E tests pass (100%)
- ✅ No foreign key violations
- ✅ No data loss (backup vs. current count matches)
- ✅ API responses return new format
- ✅ Frontend displays new names correctly

### Nice to Have
- ✅ Performance tests show < 100ms response time
- ✅ Zero downtime during migration
- ✅ All translations work correctly

---

## Test Data Setup

### Seed Data for Testing

```typescript
// Test departments for unit tests
const testDepartments = [
  {
    code: 'EG',
    name: 'EG-Công trình',
    nameEn: 'Engineering Dept.',
    nameVi: 'Công trình',
    isActive: true,
  },
  {
    code: 'V-Tech',
    name: 'V-Tech-Công nghệ',
    nameEn: 'Technology Dept.',
    nameVi: 'Công nghệ',
    isActive: true,
  },
  {
    code: 'QC(E)',
    name: 'QC(E)-QC đai',
    nameEn: 'Elastic Quality Control',
    nameVi: 'QC đai',
    isActive: true,
  },
];
```

---

## Reporting

### Test Report Format

```markdown
# Department Migration Test Report

**Date:** 2026-01-21  
**Environment:** Staging  
**Tester:** [Name]  

## Summary
- Total Tests: 45
- Passed: 43
- Failed: 2
- Skipped: 0

## Failed Tests
1. **Test Name:** E2E - KPI dropdown filter
   - **Error:** Department "CONG_NGHE" not found
   - **Root Cause:** Frontend still using old code
   - **Fix:** Update frontend department filter to use new codes
   
2. **Test Name:** Integration - Folder-department link
   - **Error:** Folder path mismatch
   - **Root Cause:** Folder paths use old codes
   - **Fix:** Migrate folder paths separately

## Recommendations
- Fix frontend department filter before production
- Create separate migration for folder paths
- Add more test coverage for edge cases
```

---

## Next Steps

After all tests pass:
1. Document any issues found
2. Fix failing tests
3. Get approval from stakeholders
4. Proceed to production migration
5. Monitor post-migration metrics
