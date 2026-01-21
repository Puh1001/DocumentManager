import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying final database state...\n');
  
  // Check active departments
  const activeDepts = await prisma.department.findMany({
    where: { isActive: true },
    select: { code: true, name: true, nameVi: true },
    orderBy: { code: 'asc' }
  });
  
  // Check inactive departments
  const inactiveDepts = await prisma.department.findMany({
    where: { isActive: false },
    select: { code: true, name: true },
    orderBy: { code: 'asc' }
  });
  
  // Count standardized vs non-standardized
  const standardized = activeDepts.filter(d => d.name.includes('-'));
  const notStandardized = activeDepts.filter(d => !d.name.includes('-'));
  
  console.log('📊 Department Statistics:');
  console.log(`  Total Active: ${activeDepts.length}`);
  console.log(`  Standardized (with '-'): ${standardized.length}`);
  console.log(`  Not Standardized: ${notStandardized.length}`);
  console.log(`  Inactive (merged/deactivated): ${inactiveDepts.length}\n`);
  
  console.log('✅ Standardized Departments (${standardized.length}):');
  standardized.forEach(d => {
    console.log(`  ${d.code.padEnd(25)} | ${d.name}`);
  });
  
  if (notStandardized.length > 0) {
    console.log('\n⚠️  Not Standardized Departments (${notStandardized.length}):');
    notStandardized.forEach(d => {
      console.log(`  ${d.code.padEnd(25)} | ${d.name}`);
    });
  }
  
  if (inactiveDepts.length > 0) {
    console.log('\n🔒 Inactive Departments (${inactiveDepts.length}):');
    inactiveDepts.forEach(d => {
      console.log(`  ${d.code.padEnd(25)} | ${d.name}`);
    });
  }
  
  // Official list from dept.txt
  const officialCodes = [
    'V-Tech', 'SD', 'HR', 'AC', 'PMC', 'WA', 'EG', 'WH', 'QA', 'QC(E)',
    'IT', 'PUR', 'CV', 'WD', 'DCC', 'WK', 'IE', 'DH', 'DF', 'SS',
    'SHD', 'PT', 'LTB(F)', 'YDF', 'BOD', 'WV', 'PW', 'QC(F)', 'LAB', 'TL', 'RD', 'LTB(E)'
  ];
  
  const missingFromOfficial = activeDepts
    .map(d => d.code)
    .filter(code => !officialCodes.includes(code));
  
  console.log(`\n📝 Departments Not in Official List (${missingFromOfficial.length}):`);
  missingFromOfficial.forEach(code => {
    const dept = activeDepts.find(d => d.code === code);
    console.log(`  ${code.padEnd(25)} | ${dept?.name || 'N/A'}`);
  });
  
  console.log('\n✅ Verification completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
