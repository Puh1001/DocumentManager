import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up old KPI titles...");

  // Find all records with old weaving-specific titles
  const oldTitles = [
    "一﹑梭织转机效率 Hiệu quả chuyển máy dệt thoi",
    "梭织转机效率 Hiệu quả chuyển máy dệt thoi",
    "一﹑梭织转机效率",
    "梭织转机效率",
  ];

  let updatedCount = 0;

  for (const oldTitle of oldTitles) {
    const records = await prisma.kpiRecord.findMany({
      where: {
        title: {
          contains: oldTitle,
        },
      },
    });

    for (const record of records) {
      await prisma.kpiRecord.update({
        where: { id: record.id },
        data: { title: "" },
      });
      updatedCount++;
      console.log(
        `  ✅ Updated record ${record.id} (${record.departmentId}, ${record.year})`
      );
    }
  }

  // Also update any records that contain "dệt thoi" in title
  const recordsWithDệtThoi = await prisma.kpiRecord.findMany({
    where: {
      title: {
        contains: "dệt thoi",
        mode: "insensitive",
      },
    },
  });

  for (const record of recordsWithDệtThoi) {
    // Skip if already updated above
    if (!oldTitles.some((t) => record.title.includes(t))) {
      await prisma.kpiRecord.update({
        where: { id: record.id },
        data: { title: "" },
      });
      updatedCount++;
      console.log(
        `  ✅ Updated record ${record.id} (${record.departmentId}, ${record.year})`
      );
    }
  }

  console.log(`✅ Cleaned up ${updatedCount} KPI records`);
  console.log("🎉 Cleanup completed!");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
