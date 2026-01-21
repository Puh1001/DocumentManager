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
  { oldCode: 'SD', newCode: 'SD', name: 'SD-Kinh doanh', nameEn: 'Sales Dept.', nameVi: 'Kinh doanh' }, // Alt: SD - Kinh doanh
  { oldCode: 'KE_TOAN', newCode: 'AC', name: 'AC-Kế toán', nameEn: 'Accounting Dept.', nameVi: 'Kế toán' },
  { oldCode: 'THU_MUA', newCode: 'PUR', name: 'PUR-Thu mua', nameEn: 'Purchasing Dept.', nameVi: 'Thu mua' },
  { oldCode: 'IT', newCode: 'IT', name: 'IT-Thông tin', nameEn: 'Information Technology', nameVi: 'Thông tin' },
  { oldCode: 'XNK', newCode: 'SHD', name: 'SHD-Xuất nhập khẩu', nameEn: 'Shipping Dept.', nameVi: 'Xuất nhập khẩu' },
  { oldCode: 'PMC', newCode: 'PMC', name: 'PMC-Kế hoạch sản xuất', nameEn: 'Production Material Control', nameVi: 'Kế hoạch sản xuất' },
  { oldCode: 'QA', newCode: 'QA', name: 'QA-QA', nameEn: 'Quality Assurance', nameVi: 'QA' },
  { oldCode: 'KHO', newCode: 'WH', name: 'WH-Kho', nameEn: 'Warehouse Dept.', nameVi: 'Kho' },
  { oldCode: 'CONG_TRINH', newCode: 'EG', name: 'EG-Công trình', nameEn: 'Engineering Dept.', nameVi: 'Công trình' },
  { oldCode: 'EG', newCode: 'EG', name: 'EG-Công trình', nameEn: 'Engineering Dept.', nameVi: 'Công trình' }, // Already EG
  { oldCode: 'CONG_TRINH_DU_AN', newCode: 'IE', name: 'IE-Công trình dự án', nameEn: 'Industry Engineering Dept.', nameVi: 'Công trình dự án' },
  { oldCode: 'BOC_SOI', newCode: 'CV', name: 'CV-Bọc sợi', nameEn: 'Covering', nameVi: 'Bọc sợi' },
  { oldCode: 'KEO_SOI', newCode: 'WD', name: 'WD-Kéo sợi', nameEn: 'Warping Dept.', nameVi: 'Kéo sợi' },
  { oldCode: 'WD', newCode: 'WD', name: 'WD-Kéo sợi', nameEn: 'Warping Dept.', nameVi: 'Kéo sợi' }, // Alt: WD-Kéo sợi
  { oldCode: 'CONG_NGHE', newCode: 'V-Tech', name: 'V-Tech-Công nghệ', nameEn: 'Technology Dept.', nameVi: 'Công nghệ' },
  { oldCode: 'DET_DAI', newCode: 'WV', name: 'WV-Dệt đai', nameEn: 'Elastic Weaving Dept.', nameVi: 'Dệt đai' },
  { oldCode: 'WV', newCode: 'WV', name: 'WV-Dệt đai', nameEn: 'Elastic Weaving Dept.', nameVi: 'Dệt đai' }, // Already WV
  { oldCode: 'NHUOM_DAI', newCode: 'DF', name: 'DF-Nhuộm đai', nameEn: 'Elastic Dyeing', nameVi: 'Nhuộm đai' },
  { oldCode: 'QC_DAI', newCode: 'QC(E)', name: 'QC(E)-QC đai', nameEn: 'Elastic Quality Control', nameVi: 'QC đai' },
  { oldCode: 'DET_DOC', newCode: 'WA', name: 'WA-Dệt dọc', nameEn: 'Warping & Knitting Dept.', nameVi: 'Dệt dọc' },
  { oldCode: 'WA', newCode: 'WA', name: 'WA-Dệt dọc', nameEn: 'Warping & Knitting Dept.', nameVi: 'Dệt dọc' }, // Already WA
  { oldCode: 'DET_NGANG', newCode: 'WK', name: 'WK-Dệt ngang', nameEn: 'Weft Knitting Dept.', nameVi: 'Dệt ngang' },
  { oldCode: 'WK', newCode: 'WK', name: 'WK-Dệt ngang', nameEn: 'Weft Knitting Dept.', nameVi: 'Dệt ngang' }, // Already WK
  { oldCode: 'PHONG_THI_NGHIEM', newCode: 'LAB', name: 'LAB-Thí nghiệm', nameEn: 'Laboratory', nameVi: 'Thí nghiệm' },
  { oldCode: 'NHUOM_VAI', newCode: 'DH', name: 'DH-Nhuộm vải', nameEn: 'Fabric Dyeing', nameVi: 'Nhuộm vải' },
  { oldCode: 'DINH_HINH', newCode: 'SS', name: 'SS-Định hình', nameEn: 'Scouring and Setting', nameVi: 'Định hình' },
  { oldCode: 'SS', newCode: 'SS', name: 'SS-Định hình', nameEn: 'Scouring and Setting', nameVi: 'Định hình' }, // Alt: Định hình
  { oldCode: 'Định hình', newCode: 'SS', name: 'SS-Định hình', nameEn: 'Scouring and Setting', nameVi: 'Định hình' }, // Alt: Định hình (Vietnamese name as code)
  { oldCode: 'QC_VAI', newCode: 'QC(F)', name: 'QC(F)-QC vải', nameEn: 'Fabric Quality Control', nameVi: 'QC vải' },
  { oldCode: 'IN_HOA', newCode: 'PT', name: 'PT-In hoa', nameEn: 'Printing Dept.', nameVi: 'In hoa' },
  { oldCode: 'LTB', newCode: 'LTB(F)', name: 'LTB(F)-LTB vải', nameEn: 'Fabric Little to bulk', nameVi: 'LTB vải' },
  { oldCode: 'LTB_DAI', newCode: 'LTB(E)', name: 'LTB(E)-LTB đai', nameEn: 'Elastic Little to bulk', nameVi: 'LTB đai' },
  { oldCode: 'PHONG_KIEM_NGHIEM', newCode: 'TL', name: 'TL-Kiểm nghiệm', nameEn: 'Testing Laboratory', nameVi: 'Kiểm nghiệm' },
  { oldCode: 'NC_PT_VAI', newCode: 'RD', name: 'RD-Nghiên cứu và phát triển', nameEn: 'Research and Development', nameVi: 'Nghiên cứu và phát triển' },
  { oldCode: 'GIAI_DOAN_TRUOC_NHUOM_SOI', newCode: 'PW', name: 'PW-GĐ Trước nhuộm sợi', nameEn: 'Preceding & Weaving', nameVi: 'GĐ Trước nhuộm sợi' },
  { oldCode: 'PW', newCode: 'PW', name: 'PW-GĐ Trước nhuộm sợi', nameEn: 'Preceding & Weaving', nameVi: 'GĐ Trước nhuộm sợi' },
  { oldCode: 'GIAI_DOAN_SAU_NHUOM_SOI', newCode: 'YDF', name: 'YDF-Nhuộm sợi', nameEn: 'Yarn Weaving and Finishing', nameVi: 'Nhuộm sợi' },
  { oldCode: 'YDF', newCode: 'YDF', name: 'YDF-Nhuộm sợi', nameEn: 'Yarn Weaving and Finishing', nameVi: 'Nhuộm sợi' },
  { oldCode: 'DH', newCode: 'DH', name: 'DH-Nhuộm vải', nameEn: 'Fabric Dyeing', nameVi: 'Nhuộm vải' },
  { oldCode: 'DF', newCode: 'DF', name: 'DF-Nhuộm đai', nameEn: 'Elastic Dyeing', nameVi: 'Nhuộm đai' },
  { oldCode: 'HR', newCode: 'HR', name: 'HR-HCNS (Hành chính Nhân sự)', nameEn: 'Human Resource Dept.', nameVi: 'HCNS (Hành chính Nhân sự)' },
];

// Remove duplicates by keeping only the first occurrence of each newCode
const uniqueMappings = departmentMappings.reduce((acc, curr) => {
  const exists = acc.find(m => m.oldCode === curr.oldCode && m.newCode === curr.newCode);
  if (!exists) {
    acc.push(curr);
  }
  return acc;
}, [] as DepartmentUpdate[]);

async function main() {
  console.log('🔄 Starting department name standardization...');
  console.log(`📋 Total mappings to process: ${uniqueMappings.length}`);

  // Step 1: Create backup
  console.log('\n📦 Step 1: Creating backup...');
  const backupDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const backupTableName = `departments_backup_${backupDate}`;
  
  try {
    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS ${backupTableName};
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE ${backupTableName} AS 
      SELECT * FROM departments;
    `);
    
    const backupCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count FROM ${backupTableName};
    `);
    console.log(`✅ Backup created: ${backupTableName} with ${backupCount[0].count} records`);
  } catch (error) {
    console.error('❌ Failed to create backup:', {
      table: backupTableName,
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
    });
    throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 2: Update departments (with transaction)
  console.log('\n🔧 Step 2: Updating departments...');
  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const mapping of uniqueMappings) {
        try {
          // First check if department exists
          const existing = await tx.department.findUnique({
            where: { code: mapping.oldCode },
          });

          if (!existing) {
            console.log(`  ⚠️  ${mapping.oldCode} not found in database`);
            notFoundCount++;
            continue;
          }

          // If code is changing, check for conflicts
          if (mapping.oldCode !== mapping.newCode) {
            const conflict = await tx.department.findUnique({
              where: { code: mapping.newCode },
            });

            if (conflict && conflict.id !== existing.id) {
              console.warn(`  ⚠️  Code conflict: ${mapping.newCode} already exists (skipping ${mapping.oldCode})`);
              errorCount++;
              continue;
            }
          }

          // Update the department
          await tx.department.update({
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

          updatedCount++;
          console.log(`  ✅ ${mapping.oldCode} → ${mapping.newCode}: ${mapping.name}`);
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Failed to update ${mapping.oldCode}:`, {
            oldCode: mapping.oldCode,
            newCode: mapping.newCode,
            error: error instanceof Error ? error.message : String(error),
            code: (error as any)?.code,
          });
        }
      }
    });

    console.log(`\n✅ Updated ${updatedCount} departments`);
    console.log(`⚠️  Not found: ${notFoundCount} departments`);
    if (errorCount > 0) {
      console.warn(`❌ ${errorCount} errors occurred (but transaction committed successfully)`);
    }
  } catch (error) {
    console.error('\n❌ Transaction failed - all changes rolled back:', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
    });
    throw error;
  }

  // Step 3: Create DCC if missing
  console.log('\n🆕 Step 3: Creating missing departments...');
  let dccExists: any = null;
  try {
    dccExists = await prisma.department.findUnique({
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
      // Update existing DCC to match the standard format
      await prisma.department.update({
        where: { code: 'DCC' },
        data: {
          name: 'DCC-Kiểm soát văn kiện',
          nameEn: 'Document Control Center',
          nameVi: 'Kiểm soát văn kiện',
          nameZh: null,
          updatedAt: new Date(),
        },
      });
      console.log('  ✅ Updated DCC department to standard format');
    }
  } catch (error) {
    console.error('  ❌ Failed to process DCC:', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      operation: dccExists ? 'update' : 'create',
    });
  }

  // Step 4: Analyze unmatched departments (dynamically discovered)
  console.log('\n🔍 Step 4: Analyzing unmatched departments...');
  
  // Dynamically find departments not in official mapping
  const officialCodes = new Set(uniqueMappings.map(m => m.newCode));
  const allActiveDepts = await prisma.department.findMany({
    where: { isActive: true },
    select: { code: true },
  });
  const unmatchedCodes = allActiveDepts
    .map(d => d.code)
    .filter(code => !officialCodes.has(code));

  console.log(`  Found ${unmatchedCodes.length} unmatched departments`);

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
  console.log(`Standardized departments (with '-' in name): ${standardizedCount}`);

  const allDepartments = await prisma.department.findMany({
    where: { isActive: true },
    select: { code: true, name: true, nameVi: true },
    orderBy: { code: 'asc' },
  });

  console.log('\n📋 All active departments after migration:');
  allDepartments.forEach(dept => {
    console.log(`  ${dept.code.padEnd(20)} | ${dept.name}`);
  });

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
