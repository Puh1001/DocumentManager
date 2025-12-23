import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding KPI departments...");

  const departments = [
    { name: "WV", code: "WV" },
    { name: "WA", code: "WA" },
    { name: "HR", code: "HR" },
    { name: "DH", code: "DH" },
    { name: "IT", code: "IT" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: {
        name: dept.name,
        code: dept.code,
        isActive: true,
      },
    });
  }

  console.log(`✅ Created ${departments.length} KPI departments`);
  console.log("🎉 KPI departments seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
