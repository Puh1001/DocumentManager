import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCorruptedFile() {
  try {
    // Search for files with mojibake patterns
    const allFiles = await prisma.document.findMany({
      where: {
        fileName: { contains: 'áº' },
      },
      select: {
        id: true,
        fileName: true,
        name: true,
        uploadedAt: true,
      },
      take: 20,
    });

    console.log(`Found ${allFiles.length} files:\n`);
    for (const file of allFiles) {
      console.log(`ID: ${file.id}`);
      console.log(`FileName: "${file.fileName}"`);
      console.log(`Name: "${file.name}"`);
      console.log(`Uploaded: ${file.uploadedAt}`);
      console.log('---\n');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCorruptedFile();
