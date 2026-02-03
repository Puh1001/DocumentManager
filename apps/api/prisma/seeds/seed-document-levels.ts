import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEVELS = [
  {
    code: "LEVEL1",
    name: "Level 1",
    nameEn: "Level 1",
    nameVi: "Cấp 1",
    nameZh: "级别1",
    sortOrder: 1,
  },
  {
    code: "LEVEL2",
    name: "Level 2",
    nameEn: "Level 2",
    nameVi: "Cấp 2",
    nameZh: "级别2",
    sortOrder: 2,
  },
  {
    code: "LEVEL3",
    name: "Level 3",
    nameEn: "Level 3",
    nameVi: "Cấp 3",
    nameZh: "级别3",
    sortOrder: 3,
  },
];

async function main() {
  console.log("Seeding document levels...");
  for (const level of LEVELS) {
    await prisma.documentLevel.upsert({
      where: { code: level.code },
      update: {
        name: level.name,
        nameEn: level.nameEn ?? null,
        nameVi: level.nameVi ?? null,
        nameZh: level.nameZh ?? null,
        sortOrder: level.sortOrder,
      },
      create: {
        code: level.code,
        name: level.name,
        nameEn: level.nameEn ?? null,
        nameVi: level.nameVi ?? null,
        nameZh: level.nameZh ?? null,
        isActive: true,
        sortOrder: level.sortOrder,
      },
    });
    console.log(`  ${level.code} ok`);
  }
  console.log("Document levels seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
