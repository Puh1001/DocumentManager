import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify if migration has been applied to database
 * Run: npx ts-node apps/api/scripts/verify-migration-status.ts
 */
async function verifyMigrationStatus() {
  console.log('🔍 Verifying migration status...\n');

  try {
    // Check if new columns exist in documents table
    const columnsCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name IN ('uploaded_by', 'uploaded_at', 'deletion_expires_at')
      ORDER BY column_name;
    `;

    console.log('📋 Documents table columns:');
    const expectedColumns = ['uploaded_by', 'uploaded_at', 'deletion_expires_at'];
    const foundColumns = columnsCheck.map(c => c.column_name);
    
    expectedColumns.forEach(col => {
      const exists = foundColumns.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });

    // Check if deletion_requests table exists
    const tableCheck = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'deletion_requests';
    `;

    console.log('\n📋 Deletion requests table:');
    console.log(`   ${tableCheck.length > 0 ? '✅' : '❌'} deletion_requests table exists`);

    // Check if RequestStatus enum exists
    const enumCheck = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typname = 'RequestStatus';
    `;

    console.log('\n📋 RequestStatus enum:');
    console.log(`   ${enumCheck.length > 0 ? '✅' : '❌'} RequestStatus enum exists`);

    // Summary
    const allColumnsExist = expectedColumns.every(col => foundColumns.includes(col));
    const tableExists = tableCheck.length > 0;
    const enumExists = enumCheck.length > 0;

    console.log('\n📊 Migration Status Summary:');
    if (allColumnsExist && tableExists && enumExists) {
      console.log('   ✅ Migration has been applied successfully!');
      console.log('   ✅ Ready to run backfill script');
    } else {
      console.log('   ❌ Migration has NOT been applied');
      console.log('\n⚠️  Action Required:');
      console.log('   1. Run: npx prisma migrate deploy');
      console.log('   2. Or apply migration SQL manually');
      console.log('   3. Then re-run this verification script');
    }

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    console.log('\n⚠️  This might indicate:');
    console.log('   - Database connection issue');
    console.log('   - Migration not applied');
    console.log('   - Schema mismatch');
  }
}

verifyMigrationStatus()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
