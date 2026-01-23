import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill script for KPI status field
 * Updates status to COMPLETED for all KPI records that have attachments
 * Run: npx ts-node apps/api/scripts/backfill-kpi-status-from-attachments.ts
 */
async function backfillKpiStatus() {
  console.log('🔄 Starting KPI status backfill...');

  // Check if status field exists (migration applied)
  try {
    await prisma.$queryRaw`SELECT status FROM kpi_records LIMIT 1`;
  } catch (error: any) {
    if (error.code === 'P2022' || error.message?.includes('does not exist')) {
      console.error('❌ Migration not applied! Please run: npx prisma migrate deploy');
      console.error('   Expected migration: 20260121101722_add_status_to_kpi_records');
      await prisma.$disconnect();
      process.exit(1);
    }
    throw error;
  }

  // Get all KPI records with PENDING status that have attachments
  const recordsToUpdate = await prisma.kpiRecord.findMany({
    where: {
      status: 'PENDING',
      attachments: {
        some: {} // Has at least one attachment
      }
    },
    include: {
      attachments: {
        select: {
          id: true
        }
      }
    }
  });

  console.log(`📊 Found ${recordsToUpdate.length} KPI records with attachments but status = PENDING`);

  if (recordsToUpdate.length === 0) {
    console.log('✅ No records need backfilling');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const record of recordsToUpdate) {
    try {
      // Verify record has attachments (defense in depth)
      if (record.attachments.length === 0) {
        console.warn(`   ⚠️  Skipping record ${record.id} - no attachments found`);
        continue;
      }

      await prisma.kpiRecord.update({
        where: { id: record.id },
        data: { status: 'COMPLETED' }
      });

      updated++;
      
      if (updated % 10 === 0) {
        console.log(`   Progress: ${updated}/${recordsToUpdate.length} records updated`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update record ${record.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((updated / recordsToUpdate.length) * 100).toFixed(2)}%`);
  
  // Show breakdown by department
  if (updated > 0) {
    const updatedRecords = await prisma.kpiRecord.findMany({
      where: {
        id: { in: recordsToUpdate.slice(0, updated).map(r => r.id) }
      },
      include: {
        department: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });

    const byDepartment = updatedRecords.reduce((acc, record) => {
      const deptName = record.department.name || record.department.code || 'Unknown';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📋 Updated by Department:');
    Object.entries(byDepartment).forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} records`);
    });
  }

  console.log('\n✅ Backfill complete!');
  console.log('   💡 Refresh the KPI status screen to see updated completion status');
}

backfillKpiStatus()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
