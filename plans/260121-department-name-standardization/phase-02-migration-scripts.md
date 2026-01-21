# Phase 2: Migration Scripts

**Status:** DRAFT  
**Dependencies:** Phase 1 Analysis complete, stakeholder approval  

---

## Migration Overview

### Goal
Update department names to format: `"Code-Vietnamese Name"` (e.g., `"EG-Công trình"`)

### Scope
- **UPDATE**: 31 departments (matched with official list)
- **CREATE**: 1 department (DCC if doesn't exist)
- **REVIEW**: 7 departments (not in official list)
- **VERIFY**: All foreign key references remain intact

---

## SQL Migration Scripts

### Script 1: Backup Current State

```sql
-- Create backup table
CREATE TABLE departments_backup_20260121 AS 
SELECT * FROM departments;

-- Verify backup
SELECT COUNT(*) as backup_count FROM departments_backup_20260121;
SELECT COUNT(*) as current_count FROM departments;

-- Should match!
```

### Script 2: Update Departments (31 records)

```sql
-- Start transaction
BEGIN;

-- 1. BOD
UPDATE departments 
SET 
  code = 'BOD',
  name = 'BOD-Ban giám đốc',
  name_en = 'Board of Director',
  name_vi = 'Ban giám đốc',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'BOD';

-- 2. HCNS → HR
UPDATE departments 
SET 
  code = 'HR',
  name = 'HR-HCNS (Hành chính Nhân sự)',
  name_en = 'Human Resource Dept.',
  name_vi = 'HCNS (Hành chính Nhân sự)',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'HCNS';

-- 3. KINH_DOANH → SD
UPDATE departments 
SET 
  code = 'SD',
  name = 'SD-Kinh doanh',
  name_en = 'Sales Dept.',
  name_vi = 'Kinh doanh',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'KINH_DOANH';

-- 4. KE_TOAN → AC
UPDATE departments 
SET 
  code = 'AC',
  name = 'AC-Kế toán',
  name_en = 'Accounting Dept.',
  name_vi = 'Kế toán',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'KE_TOAN';

-- 5. THU_MUA → PUR
UPDATE departments 
SET 
  code = 'PUR',
  name = 'PUR-Thu mua',
  name_en = 'Purchasing Dept.',
  name_vi = 'Thu mua',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'THU_MUA';

-- 6. IT
UPDATE departments 
SET 
  code = 'IT',
  name = 'IT-Thông tin',
  name_en = 'Information Technology',
  name_vi = 'Thông tin',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'IT';

-- 7. XNK → SHD
UPDATE departments 
SET 
  code = 'SHD',
  name = 'SHD-Xuất nhập khẩu',
  name_en = 'Shipping Dept.',
  name_vi = 'Xuất nhập khẩu',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'XNK';

-- 8. PMC
UPDATE departments 
SET 
  code = 'PMC',
  name = 'PMC-Kế hoạch sản xuất',
  name_en = 'Production Material Control',
  name_vi = 'Kế hoạch sản xuất',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'PMC';

-- 9. QA
UPDATE departments 
SET 
  code = 'QA',
  name = 'QA-QA',
  name_en = 'Quality Assurance',
  name_vi = 'QA',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'QA';

-- 10. KHO → WH
UPDATE departments 
SET 
  code = 'WH',
  name = 'WH-Kho',
  name_en = 'Warehouse Dept.',
  name_vi = 'Kho',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'KHO';

-- 11. CONG_TRINH → EG
UPDATE departments 
SET 
  code = 'EG',
  name = 'EG-Công trình',
  name_en = 'Engineering Dept.',
  name_vi = 'Công trình',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'CONG_TRINH';

-- 12. CONG_TRINH_DU_AN → IE
UPDATE departments 
SET 
  code = 'IE',
  name = 'IE-Công trình dự án',
  name_en = 'Industry Engineering Dept.',
  name_vi = 'Công trình dự án',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'CONG_TRINH_DU_AN';

-- 13. BOC_SOI → CV
UPDATE departments 
SET 
  code = 'CV',
  name = 'CV-Bọc sợi',
  name_en = 'Covering',
  name_vi = 'Bọc sợi',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'BOC_SOI';

-- 14. KEO_SOI → WD
UPDATE departments 
SET 
  code = 'WD',
  name = 'WD-Kéo sợi',
  name_en = 'Warping Dept.',
  name_vi = 'Kéo sợi',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'KEO_SOI';

-- 15. CONG_NGHE → V-Tech
UPDATE departments 
SET 
  code = 'V-Tech',
  name = 'V-Tech-Công nghệ',
  name_en = 'Technology Dept.',
  name_vi = 'Công nghệ',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'CONG_NGHE';

-- 16. DET_DAI → WV
UPDATE departments 
SET 
  code = 'WV',
  name = 'WV-Dệt đai',
  name_en = 'Elastic Weaving Dept.',
  name_vi = 'Dệt đai',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'DET_DAI';

-- 17. NHUOM_DAI → DF
UPDATE departments 
SET 
  code = 'DF',
  name = 'DF-Nhuộm đai',
  name_en = 'Elastic Dyeing',
  name_vi = 'Nhuộm đai',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'NHUOM_DAI';

-- 18. QC_DAI → QC(E)
UPDATE departments 
SET 
  code = 'QC(E)',
  name = 'QC(E)-QC đai',
  name_en = 'Elastic Quality Control',
  name_vi = 'QC đai',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'QC_DAI';

-- 19. DET_DOC → WA
UPDATE departments 
SET 
  code = 'WA',
  name = 'WA-Dệt dọc',
  name_en = 'Warping & Knitting Dept.',
  name_vi = 'Dệt dọc',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'DET_DOC';

-- 20. DET_NGANG → WK
UPDATE departments 
SET 
  code = 'WK',
  name = 'WK-Dệt ngang',
  name_en = 'Weft Knitting Dept.',
  name_vi = 'Dệt ngang',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'DET_NGANG';

-- 21. PHONG_THI_NGHIEM → LAB
UPDATE departments 
SET 
  code = 'LAB',
  name = 'LAB-Thí nghiệm',
  name_en = 'Laboratory',
  name_vi = 'Thí nghiệm',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'PHONG_THI_NGHIEM';

-- 22. NHUOM_VAI → DH
UPDATE departments 
SET 
  code = 'DH',
  name = 'DH-Nhuộm vải',
  name_en = 'Fabric Dyeing',
  name_vi = 'Nhuộm vải',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'NHUOM_VAI';

-- 23. DINH_HINH → SS
UPDATE departments 
SET 
  code = 'SS',
  name = 'SS-Định hình',
  name_en = 'Scouring and Setting',
  name_vi = 'Định hình',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'DINH_HINH';

-- 24. QC_VAI → QC(F)
UPDATE departments 
SET 
  code = 'QC(F)',
  name = 'QC(F)-QC vải',
  name_en = 'Fabric Quality Control',
  name_vi = 'QC vải',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'QC_VAI';

-- 25. IN_HOA → PT
UPDATE departments 
SET 
  code = 'PT',
  name = 'PT-In hoa',
  name_en = 'Printing Dept.',
  name_vi = 'In hoa',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'IN_HOA';

-- 26. LTB → LTB(F)
UPDATE departments 
SET 
  code = 'LTB(F)',
  name = 'LTB(F)-LTB vải',
  name_en = 'Fabric Little to bulk',
  name_vi = 'LTB vải',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'LTB';

-- 27. LTB_DAI → LTB(E)
UPDATE departments 
SET 
  code = 'LTB(E)',
  name = 'LTB(E)-LTB đai',
  name_en = 'Elastic Little to bulk',
  name_vi = 'LTB đai',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'LTB_DAI';

-- 28. PHONG_KIEM_NGHIEM → TL
UPDATE departments 
SET 
  code = 'TL',
  name = 'TL-Kiểm nghiệm',
  name_en = 'Testing Laboratory',
  name_vi = 'Kiểm nghiệm',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'PHONG_KIEM_NGHIEM';

-- 29. NC_PT_VAI → RD
UPDATE departments 
SET 
  code = 'RD',
  name = 'RD-Nghiên cứu và phát triển',
  name_en = 'Research and Development',
  name_vi = 'Nghiên cứu và phát triển',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'NC_PT_VAI';

-- 30. GIAI_DOAN_TRUOC_NHUOM_SOI → PW
UPDATE departments 
SET 
  code = 'PW',
  name = 'PW-GĐ Trước nhuộm sợi',
  name_en = 'Preceding & Weaving',
  name_vi = 'GĐ Trước nhuộm sợi',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'GIAI_DOAN_TRUOC_NHUOM_SOI';

-- 31. GIAI_DOAN_SAU_NHUOM_SOI → YDF
UPDATE departments 
SET 
  code = 'YDF',
  name = 'YDF-Nhuộm sợi',
  name_en = 'Yarn Weaving and Finishing',
  name_vi = 'Nhuộm sợi',
  name_zh = NULL,
  updated_at = NOW()
WHERE code = 'GIAI_DOAN_SAU_NHUOM_SOI';

-- Verify update count
SELECT 'Updated departments:' as status, COUNT(*) as count
FROM departments
WHERE name LIKE '%-%' AND updated_at > NOW() - INTERVAL '1 minute';

-- COMMIT only if count = 31
COMMIT;
-- Or ROLLBACK if something went wrong
-- ROLLBACK;
```

### Script 3: Create Missing Department (DCC)

```sql
-- Check if DCC exists
SELECT * FROM departments WHERE code = 'DCC';

-- If not exists, create it
INSERT INTO departments (id, name, name_en, name_vi, name_zh, code, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'DCC-Kiểm soát văn kiện',
  'Document Control Center',
  'Kiểm soát văn kiện',
  NULL,
  'DCC',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT * FROM departments WHERE code = 'DCC';
```

### Script 4: Review Unmatched Departments

```sql
-- Check if these departments have active references
SELECT 
  d.code,
  d.name,
  COUNT(DISTINCT f.id) as folder_count,
  COUNT(DISTINCT k.id) as kpi_count,
  COUNT(DISTINCT m.id) as maintenance_count,
  COUNT(DISTINCT ud.user_id) as user_count
FROM departments d
LEFT JOIN folders f ON f.department_id = d.id
LEFT JOIN kpi_records k ON k.department_id = d.id
LEFT JOIN maintenance_notices m ON m.department_id = d.id
LEFT JOIN user_departments ud ON ud.department_id = d.id
WHERE d.code IN (
  'PTVL',
  'PHONG_MAU',
  'SAN_XUAT',
  'DET_NGANG_S',
  'CN_HUNG_YEN_DET_NGANG',
  'CN_NGHE_AN_2_DET_NGANG',
  'CN_HUNG_YEN_DET_DAI',
  'MG'
)
GROUP BY d.code, d.name
ORDER BY (folder_count + kpi_count + maintenance_count + user_count) DESC;

-- If any department has 0 references, consider deactivating:
-- UPDATE departments 
-- SET is_active = false, updated_at = NOW()
-- WHERE code IN ('MG') -- example: if MG has no references
-- AND NOT EXISTS (
--   SELECT 1 FROM folders WHERE department_id = departments.id
-- ) AND NOT EXISTS (
--   SELECT 1 FROM kpi_records WHERE department_id = departments.id
-- ) AND NOT EXISTS (
--   SELECT 1 FROM maintenance_notices WHERE department_id = departments.id
-- ) AND NOT EXISTS (
--   SELECT 1 FROM user_departments WHERE department_id = departments.id
-- );
```

---

## TypeScript Migration Script

**File:** `apps/api/prisma/migrations/standardize-department-names.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DepartmentUpdate {
  oldCode: string;
  newCode: string;
  name: string;
  nameEn: string;
  nameVi: string;
  nameZh?: string;
}

const departmentMappings: DepartmentUpdate[] = [
  { oldCode: 'BOD', newCode: 'BOD', name: 'BOD-Ban giám đốc', nameEn: 'Board of Director', nameVi: 'Ban giám đốc' },
  { oldCode: 'HCNS', newCode: 'HR', name: 'HR-HCNS (Hành chính Nhân sự)', nameEn: 'Human Resource Dept.', nameVi: 'HCNS (Hành chính Nhân sự)' },
  { oldCode: 'KINH_DOANH', newCode: 'SD', name: 'SD-Kinh doanh', nameEn: 'Sales Dept.', nameVi: 'Kinh doanh' },
  { oldCode: 'KE_TOAN', newCode: 'AC', name: 'AC-Kế toán', nameEn: 'Accounting Dept.', nameVi: 'Kế toán' },
  { oldCode: 'THU_MUA', newCode: 'PUR', name: 'PUR-Thu mua', nameEn: 'Purchasing Dept.', nameVi: 'Thu mua' },
  { oldCode: 'IT', newCode: 'IT', name: 'IT-Thông tin', nameEn: 'Information Technology', nameVi: 'Thông tin' },
  { oldCode: 'XNK', newCode: 'SHD', name: 'SHD-Xuất nhập khẩu', nameEn: 'Shipping Dept.', nameVi: 'Xuất nhập khẩu' },
  { oldCode: 'PMC', newCode: 'PMC', name: 'PMC-Kế hoạch sản xuất', nameEn: 'Production Material Control', nameVi: 'Kế hoạch sản xuất' },
  { oldCode: 'QA', newCode: 'QA', name: 'QA-QA', nameEn: 'Quality Assurance', nameVi: 'QA' },
  { oldCode: 'KHO', newCode: 'WH', name: 'WH-Kho', nameEn: 'Warehouse Dept.', nameVi: 'Kho' },
  { oldCode: 'CONG_TRINH', newCode: 'EG', name: 'EG-Công trình', nameEn: 'Engineering Dept.', nameVi: 'Công trình' },
  { oldCode: 'CONG_TRINH_DU_AN', newCode: 'IE', name: 'IE-Công trình dự án', nameEn: 'Industry Engineering Dept.', nameVi: 'Công trình dự án' },
  { oldCode: 'BOC_SOI', newCode: 'CV', name: 'CV-Bọc sợi', nameEn: 'Covering', nameVi: 'Bọc sợi' },
  { oldCode: 'KEO_SOI', newCode: 'WD', name: 'WD-Kéo sợi', nameEn: 'Warping Dept.', nameVi: 'Kéo sợi' },
  { oldCode: 'CONG_NGHE', newCode: 'V-Tech', name: 'V-Tech-Công nghệ', nameEn: 'Technology Dept.', nameVi: 'Công nghệ' },
  { oldCode: 'DET_DAI', newCode: 'WV', name: 'WV-Dệt đai', nameEn: 'Elastic Weaving Dept.', nameVi: 'Dệt đai' },
  { oldCode: 'NHUOM_DAI', newCode: 'DF', name: 'DF-Nhuộm đai', nameEn: 'Elastic Dyeing', nameVi: 'Nhuộm đai' },
  { oldCode: 'QC_DAI', newCode: 'QC(E)', name: 'QC(E)-QC đai', nameEn: 'Elastic Quality Control', nameVi: 'QC đai' },
  { oldCode: 'DET_DOC', newCode: 'WA', name: 'WA-Dệt dọc', nameEn: 'Warping & Knitting Dept.', nameVi: 'Dệt dọc' },
  { oldCode: 'DET_NGANG', newCode: 'WK', name: 'WK-Dệt ngang', nameEn: 'Weft Knitting Dept.', nameVi: 'Dệt ngang' },
  { oldCode: 'PHONG_THI_NGHIEM', newCode: 'LAB', name: 'LAB-Thí nghiệm', nameEn: 'Laboratory', nameVi: 'Thí nghiệm' },
  { oldCode: 'NHUOM_VAI', newCode: 'DH', name: 'DH-Nhuộm vải', nameEn: 'Fabric Dyeing', nameVi: 'Nhuộm vải' },
  { oldCode: 'DINH_HINH', newCode: 'SS', name: 'SS-Định hình', nameEn: 'Scouring and Setting', nameVi: 'Định hình' },
  { oldCode: 'QC_VAI', newCode: 'QC(F)', name: 'QC(F)-QC vải', nameEn: 'Fabric Quality Control', nameVi: 'QC vải' },
  { oldCode: 'IN_HOA', newCode: 'PT', name: 'PT-In hoa', nameEn: 'Printing Dept.', nameVi: 'In hoa' },
  { oldCode: 'LTB', newCode: 'LTB(F)', name: 'LTB(F)-LTB vải', nameEn: 'Fabric Little to bulk', nameVi: 'LTB vải' },
  { oldCode: 'LTB_DAI', newCode: 'LTB(E)', name: 'LTB(E)-LTB đai', nameEn: 'Elastic Little to bulk', nameVi: 'LTB đai' },
  { oldCode: 'PHONG_KIEM_NGHIEM', newCode: 'TL', name: 'TL-Kiểm nghiệm', nameEn: 'Testing Laboratory', nameVi: 'Kiểm nghiệm' },
  { oldCode: 'NC_PT_VAI', newCode: 'RD', name: 'RD-Nghiên cứu và phát triển', nameEn: 'Research and Development', nameVi: 'Nghiên cứu và phát triển' },
  { oldCode: 'GIAI_DOAN_TRUOC_NHUOM_SOI', newCode: 'PW', name: 'PW-GĐ Trước nhuộm sợi', nameEn: 'Preceding & Weaving', nameVi: 'GĐ Trước nhuộm sợi' },
  { oldCode: 'GIAI_DOAN_SAU_NHUOM_SOI', newCode: 'YDF', name: 'YDF-Nhuộm sợi', nameEn: 'Yarn Weaving and Finishing', nameVi: 'Nhuộm sợi' },
];

async function main() {
  console.log('🔄 Starting department name standardization...');

  // Step 1: Create backup
  console.log('\n📦 Step 1: Creating backup...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS departments_backup_20260121 AS 
    SELECT * FROM departments;
  `);
  
  const backupCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
    SELECT COUNT(*) as count FROM departments_backup_20260121;
  `);
  console.log(`✅ Backup created: ${backupCount[0].count} records`);

  // Step 2: Update departments
  console.log('\n🔧 Step 2: Updating departments...');
  let updatedCount = 0;
  let errorCount = 0;

  for (const mapping of departmentMappings) {
    try {
      const result = await prisma.department.updateMany({
        where: { code: mapping.oldCode },
        data: {
          code: mapping.newCode,
          name: mapping.name,
          nameEn: mapping.nameEn,
          nameVi: mapping.nameVi,
          nameZh: mapping.nameZh || null,
          updatedAt: new Date(),
        },
      });

      if (result.count > 0) {
        updatedCount++;
        console.log(`  ✅ ${mapping.oldCode} → ${mapping.newCode}: ${mapping.name}`);
      } else {
        console.warn(`  ⚠️  ${mapping.oldCode} not found in database`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Failed to update ${mapping.oldCode}:`, error);
    }
  }

  console.log(`\n✅ Updated ${updatedCount} departments`);
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} errors occurred`);
  }

  // Step 3: Create DCC if missing
  console.log('\n🆕 Step 3: Creating missing departments...');
  try {
    const dccExists = await prisma.department.findUnique({
      where: { code: 'DCC' },
    });

    if (!dccExists) {
      await prisma.department.create({
        data: {
          code: 'DCC',
          name: 'DCC-Kiểm soát văn kiện',
          nameEn: 'Document Control Center',
          nameVi: 'Kiểm soát văn kiện',
          nameZh: null,
          isActive: true,
        },
      });
      console.log('  ✅ Created DCC department');
    } else {
      console.log('  ℹ️  DCC already exists');
    }
  } catch (error) {
    console.error('  ❌ Failed to create DCC:', error);
  }

  // Step 4: Analyze unmatched departments
  console.log('\n🔍 Step 4: Analyzing unmatched departments...');
  const unmatchedCodes = [
    'PTVL',
    'PHONG_MAU',
    'SAN_XUAT',
    'DET_NGANG_S',
    'CN_HUNG_YEN_DET_NGANG',
    'CN_NGHE_AN_2_DET_NGANG',
    'CN_HUNG_YEN_DET_DAI',
    'MG',
  ];

  for (const code of unmatchedCodes) {
    const dept = await prisma.department.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            folders: true,
            kpiRecords: true,
            maintenanceNotices: true,
            users: true,
          },
        },
      },
    });

    if (dept) {
      const totalRefs =
        dept._count.folders +
        dept._count.kpiRecords +
        dept._count.maintenanceNotices +
        dept._count.users;

      console.log(
        `  ${code}: ${totalRefs} references (folders: ${dept._count.folders}, kpi: ${dept._count.kpiRecords}, maintenance: ${dept._count.maintenanceNotices}, users: ${dept._count.users})`
      );
    } else {
      console.log(`  ${code}: Not found in database`);
    }
  }

  // Step 5: Verification
  console.log('\n✅ Step 5: Verification...');
  const standardizedCount = await prisma.department.count({
    where: {
      name: {
        contains: '-',
      },
    },
  });
  console.log(`Standardized departments: ${standardizedCount}`);

  console.log('\n🎉 Migration completed!');
  console.log('\n⚠️  IMPORTANT: Review unmatched departments and decide whether to deactivate them.');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## Execution Plan

### 1. Pre-migration Checks

```bash
# 1. Backup database
pg_dump -U postgres -d iso_docs -F c -b -v -f "backup_before_dept_migration_$(date +%Y%m%d_%H%M%S).backup"

# 2. Check current department count
psql -U postgres -d iso_docs -c "SELECT COUNT(*) FROM departments;"

# 3. Check foreign key references
psql -U postgres -d iso_docs -f check_dept_references.sql
```

### 2. Run Migration (Staging First!)

```bash
# Run TypeScript migration
cd apps/api
npx ts-node prisma/migrations/standardize-department-names.ts

# Or run SQL directly
psql -U postgres -d iso_docs -f migration_dept_update.sql
```

### 3. Post-migration Validation

```bash
# 1. Check update count
psql -U postgres -d iso_docs -c "SELECT COUNT(*) FROM departments WHERE name LIKE '%-%';"

# 2. Verify foreign key integrity
psql -U postgres -d iso_docs -c "
  SELECT 
    d.code, d.name, 
    COUNT(DISTINCT f.id) as folders,
    COUNT(DISTINCT k.id) as kpis
  FROM departments d
  LEFT JOIN folders f ON f.department_id = d.id
  LEFT JOIN kpi_records k ON k.department_id = d.id
  GROUP BY d.code, d.name
  ORDER BY d.code;
"

# 3. Compare with backup
psql -U postgres -d iso_docs -c "
  SELECT 'backup' as source, COUNT(*) FROM departments_backup_20260121
  UNION ALL
  SELECT 'current' as source, COUNT(*) FROM departments;
"
```

---

## Rollback Script (If Needed)

See **phase-04-rollback-plan.md** for detailed rollback procedures.

---

## Notes

1. **Transaction safety**: All SQL updates wrapped in transaction (BEGIN/COMMIT)
2. **Idempotency**: TypeScript script can be run multiple times safely
3. **Backup**: Always backup before migration
4. **Staging first**: Test on staging environment before production
5. **Foreign keys**: Using UUIDs, so no cascading issues expected
6. **Folder paths**: May need separate migration if paths use old codes

---

## Success Criteria

- ✅ 31 departments updated with new format
- ✅ 1 department created (DCC)
- ✅ 0 foreign key constraint violations
- ✅ All existing KPI records, folders, maintenance notices still linked
- ✅ Backup created successfully
- ✅ Unmatched departments analyzed and flagged for review
