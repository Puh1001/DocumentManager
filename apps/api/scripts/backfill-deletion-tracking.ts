import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill script for deletion tracking fields
 * Calculates uploadedBy, uploadedAt, and deletionExpiresAt for existing documents
 * Run: npx ts-node apps/api/scripts/backfill-deletion-tracking.ts
 */
async function backfillDeletionTracking() {
  console.log('🔄 Starting deletion tracking backfill...');

  // Get all active documents without uploadedBy
  const documents = await prisma.document.findMany({
    where: {
      status: 'ACTIVE',
      uploadedBy: null, // Only process documents without uploadedBy
    },
    include: {
      versions: {
        orderBy: { version: 'asc' },
        take: 1, // Get first version
      },
    },
  });

  console.log(`📊 Found ${documents.length} documents to backfill`);

  if (documents.length === 0) {
    console.log('✅ No documents need backfilling');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const document of documents) {
    try {
      const firstVersion = document.versions[0];
      const uploadedBy = firstVersion?.createdBy || null;
      const uploadedAt = firstVersion?.createdAt || document.createdAt;
      
      // Calculate deletion expiry (uploadedAt + 72 hours) - DST-safe
      const deletionExpiresAt = new Date(uploadedAt.getTime() + 72 * 60 * 60 * 1000);

      await prisma.document.update({
        where: { id: document.id },
        data: {
          uploadedBy,
          uploadedAt,
          deletionExpiresAt,
        },
      });

      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   Progress: ${updated}/${documents.length} documents updated`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update document ${document.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((updated / documents.length) * 100).toFixed(2)}%`);
  console.log('\n✅ Backfill complete!');
}

backfillDeletionTracking()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
