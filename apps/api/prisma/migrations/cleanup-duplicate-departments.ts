import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Merge one department into another, migrating all references
 * @param oldCode - Code of department to merge from
 * @param newCode - Code of department to merge into
 * @param stepLabel - Label for logging (e.g., "Step 1")
 */
async function mergeDepartments(
  oldCode: string,
  newCode: string,
  stepLabel: string
): Promise<void> {
  console.log(`\n📦 ${stepLabel}: Merging ${oldCode} into ${newCode}...`);
  
  try {
    const oldDept = await prisma.department.findUnique({
      where: { code: oldCode },
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

    const newDept = await prisma.department.findUnique({
      where: { code: newCode },
    });

    if (!oldDept) {
      console.log(`  ℹ️  ${oldCode} not found (already cleaned up?)`);
      return;
    }

    if (!newDept) {
      console.log(`  ⚠️  ${newCode} not found (unexpected!)`);
      return;
    }

    const totalRefs =
      oldDept._count.folders +
      oldDept._count.kpiRecords +
      oldDept._count.maintenanceNotices +
      oldDept._count.users;

    console.log(`  ${oldCode} has ${totalRefs} references`);

    if (totalRefs > 0) {
      console.log(`  Migrating references from ${oldCode} to ${newCode}...`);
      
      // Update folders
      if (oldDept._count.folders > 0) {
        await prisma.folder.updateMany({
          where: { departmentId: oldDept.id },
          data: { departmentId: newDept.id },
        });
        console.log(`    ✅ Migrated ${oldDept._count.folders} folders`);
      }

      // Update KPI records
      if (oldDept._count.kpiRecords > 0) {
        await prisma.kpiRecord.updateMany({
          where: { departmentId: oldDept.id },
          data: { departmentId: newDept.id },
        });
        console.log(`    ✅ Migrated ${oldDept._count.kpiRecords} KPI records`);
      }

      // Update maintenance notices
      if (oldDept._count.maintenanceNotices > 0) {
        await prisma.maintenanceNotice.updateMany({
          where: { departmentId: oldDept.id },
          data: { departmentId: newDept.id },
        });
        console.log(`    ✅ Migrated ${oldDept._count.maintenanceNotices} maintenance notices`);
      }

      // Update user departments
      if (oldDept._count.users > 0) {
        await prisma.userDepartment.updateMany({
          where: { departmentId: oldDept.id },
          data: { departmentId: newDept.id },
        });
        console.log(`    ✅ Migrated ${oldDept._count.users} user assignments`);
      }
    }

    // Deactivate old department
    await prisma.department.update({
      where: { code: oldCode },
      data: { isActive: false, updatedAt: new Date() },
    });
    console.log(`  ✅ Deactivated ${oldCode} department`);
  } catch (error) {
    console.error(`  ❌ Failed to merge ${oldCode}:`, {
      oldCode,
      newCode,
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
    });
  }
}

async function main() {
  console.log('🔄 Starting department cleanup...');

  // Step 1: Handle HCNS → HR duplicate
  await mergeDepartments('HCNS', 'HR', 'Step 1');

  // Step 2: Handle KINH_DOANH → SD duplicate
  await mergeDepartments('KINH_DOANH', 'SD', 'Step 2');

  // Step 3: Analyze departments not in official list
  console.log('\n🔍 Step 3: Analyzing other unmatched departments...');
  const otherUnmatched = ['PD', 'PR', 'QC'];

  for (const code of otherUnmatched) {
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

      if (totalRefs === 0) {
        console.log(`    ⚠️  ${code} has no references - consider deactivating`);
      }
    } else {
      console.log(`  ${code}: Not found in database`);
    }
  }

  // Step 4: Verification
  console.log('\n✅ Step 4: Final verification...');
  const activeDepartments = await prisma.department.findMany({
    where: { isActive: true },
    select: { code: true, name: true, nameVi: true },
    orderBy: { code: 'asc' },
  });

  console.log(`\nTotal active departments: ${activeDepartments.length}`);
  console.log('\n📋 All active departments after cleanup:');
  activeDepartments.forEach(dept => {
    const standardized = dept.name.includes('-') ? '✅' : '⚠️ ';
    console.log(`  ${standardized} ${dept.code.padEnd(20)} | ${dept.name}`);
  });

  console.log('\n🎉 Cleanup completed!');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', {
      error: e instanceof Error ? e.message : String(e),
      code: (e as any)?.code,
      stack: e instanceof Error ? e.stack : undefined,
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
