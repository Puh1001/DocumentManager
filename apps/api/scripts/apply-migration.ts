import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

/**
 * Apply migration SQL file directly to database
 * Run: npx ts-node apps/api/scripts/apply-migration.ts
 */
async function applyMigration() {
  console.log('🔄 Applying migration SQL...\n');

  try {
    // Read migration SQL file
    const migrationPath = join(
      __dirname,
      '../prisma/migrations/20260122120000_add_deletion_tracking_and_requests/migration.sql'
    );
    
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    // Note: We need to handle DO blocks specially
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute the entire SQL file as one query (safer for DO blocks)
    await prisma.$executeRawUnsafe(sql);

    console.log('✅ Migration SQL applied successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Verify: npx ts-node scripts/verify-migration-status.ts');
    console.log('   2. Backfill: npx ts-node scripts/backfill-deletion-tracking.ts');
    console.log('   3. Seed DCC: npx ts-node prisma/seeds/create-dcc-role.ts');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n⚠️  If you see errors about existing objects, that\'s OK - migration uses IF NOT EXISTS');
    process.exit(1);
  }
}

applyMigration()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
